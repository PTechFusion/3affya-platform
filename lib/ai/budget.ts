// The per-job token cap (task 1.9, risk "cost runaway on AI"), enforced in the client with a running counter keyed by job id.
// The counter starts from what the job already used (`seed`: the ai_jobs totals, which the ai_calls trigger keeps, so a job that
// resumes in a new Inngest invocation keeps its count). Before a call the client reserves the call's max_tokens; when the call
// ends it releases the reservation and adds the tokens the vendor reported, input and output. A call is refused once what is
// left is below `minCallTokens`, and a call's max_tokens is clamped to what is left, so a job can pass its cap only by the input
// tokens of the calls already in flight.

export class TokenLedger {
  private readonly used = new Map<string, number>();
  private readonly reserved = new Map<string, number>();
  private readonly seeded = new Map<string, Promise<void>>();
  private readonly cap: number;
  private readonly seed: (jobId: string) => Promise<number>;

  constructor(options: { cap: number; seed?: (jobId: string) => Promise<number> }) {
    this.cap = options.cap;
    this.seed = options.seed ?? (async () => 0);
  }

  /** Reads the job's earlier use once per job; a failed read is tried again on the next call. */
  private async ensureSeeded(jobId: string): Promise<void> {
    let pending = this.seeded.get(jobId);
    if (!pending) {
      pending = this.seed(jobId).then((before) => {
        this.used.set(jobId, Math.max(before, 0) + (this.used.get(jobId) ?? 0));
      });
      this.seeded.set(jobId, pending);
      pending.catch(() => this.seeded.delete(jobId));
    }
    await pending;
  }

  /** Tokens the job may still spend, after what it used and what calls in flight have reserved. */
  async remaining(jobId: string): Promise<number> {
    await this.ensureSeeded(jobId);
    return this.cap - (this.used.get(jobId) ?? 0) - (this.reserved.get(jobId) ?? 0);
  }

  usedBy(jobId: string): number {
    return this.used.get(jobId) ?? 0;
  }

  reserve(jobId: string, tokens: number): void {
    this.reserved.set(jobId, (this.reserved.get(jobId) ?? 0) + tokens);
  }

  /** Ends a reservation and counts the tokens the call really used. */
  settle(jobId: string, reservedTokens: number, usedTokens: number): void {
    this.reserved.set(jobId, Math.max(0, (this.reserved.get(jobId) ?? 0) - reservedTokens));
    this.used.set(jobId, (this.used.get(jobId) ?? 0) + usedTokens);
  }

  /** Drops a finished job's counter (the totals stay in ai_jobs). */
  forget(jobId: string): void {
    this.used.delete(jobId);
    this.reserved.delete(jobId);
    this.seeded.delete(jobId);
  }
}
