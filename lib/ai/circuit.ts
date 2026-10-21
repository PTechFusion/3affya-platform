// The circuit on AI calls (architecture rigor review: circuit after 5 consecutive failures). Closed, it lets calls through and
// counts failed calls in a row; at aiClient.circuitFailuresToOpen it opens and refuses every call for aiClient.circuitCooldownMs;
// then it lets one trial call through (half open): a success closes it, a failure opens it again for another cool-down.
// A failed call is one that reached the vendor and ended failed (timeout, outage, rejected request, output still invalid after
// its retry). A refusal is not counted (it is about one document, not the vendor's health), nor is a call refused before it
// reached the vendor (bad input, token cap, circuit open).
// The state is per server instance: it stops a burst of failures inside one process (a pipeline step running pages four at a
// time). A fleet-wide breaker would live in the database; task 3.8 decides whether the pipeline needs one.

export type CircuitState = "closed" | "open" | "halfOpen";

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private trialInFlight = false;
  private readonly failuresToOpen: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(options: { failuresToOpen: number; cooldownMs: number; now?: () => number }) {
    this.failuresToOpen = options.failuresToOpen;
    this.cooldownMs = options.cooldownMs;
    this.now = options.now ?? Date.now;
  }

  state(): CircuitState {
    if (this.openedAt === null) return "closed";
    return this.now() - this.openedAt >= this.cooldownMs ? "halfOpen" : "open";
  }

  /** Whether a call may go to the vendor now. In the half-open state only one trial call is let through at a time. */
  tryAcquire(): boolean {
    const state = this.state();
    if (state === "closed") return true;
    if (state === "open" || this.trialInFlight) return false;
    this.trialInFlight = true;
    return true;
  }

  /** Milliseconds until an open circuit lets a trial through; 0 when closed or half open. */
  retryAfterMs(): number {
    return this.openedAt === null ? 0 : Math.max(0, this.cooldownMs - (this.now() - this.openedAt));
  }

  success(): void {
    this.failures = 0;
    this.openedAt = null;
    this.trialInFlight = false;
  }

  failure(): void {
    if (this.trialInFlight || this.openedAt !== null) {
      this.openedAt = this.now();
      this.trialInFlight = false;
      return;
    }
    this.failures += 1;
    if (this.failures >= this.failuresToOpen) this.openedAt = this.now();
  }

  /** A call that was let through but ended neither way (a refusal): frees the half-open trial without deciding. */
  release(): void {
    this.trialInFlight = false;
  }
}
