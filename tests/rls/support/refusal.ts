// What "refused" means in the RLS suite, in one place (tests/rls/README.md repeats it):
//   SELECT  the other tenant's row is not returned: an empty result, or permission denied (42501).
//   INSERT  the database answers 42501 (row-level security violation, or no privilege). Any other error, a check or
//           unique violation say, means the row got past RLS and only failed later, so it counts as a hole.
//   UPDATE  42501, or zero rows affected; either way the service client re-reads the row and it is unchanged.
//   DELETE  42501, or zero rows affected; either way the service client re-reads the row and it is still there.
//   Storage the API answers 400, 403 or 404 (it reports objects RLS hides as not found), after the service client has
//           shown the object exists; a refused upload leaves no object behind; a refused list is that answer or an empty
//           list, after the service client has listed the object under the same prefix.
import { expect } from "vitest";
import type { Client } from "./clients";

export type Row = Record<string, unknown>;
export type Match = Record<string, string | number | boolean>;

export const PERMISSION_DENIED = "42501";

interface DbError {
  code?: string;
  message: string;
}

function show(error: DbError | null): string {
  return error ? `${error.code ?? "?"} ${error.message}` : "no error";
}

export function must<T>(result: { data: T; error: DbError | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`fixture step failed (${what}): ${show(result.error)}`);
  if (result.data === null || result.data === undefined) throw new Error(`fixture step returned nothing (${what})`);
  return result.data as NonNullable<T>;
}

export async function readAsService(service: Client, table: string, match: Match): Promise<Row | null> {
  const { data, error } = await service.from(table).select("*").match(match);
  if (error) throw new Error(`service read of ${table} failed: ${show(error)}`);
  const rows = (data ?? []) as Row[];
  if (rows.length > 1) throw new Error(`${table} ${JSON.stringify(match)} matches ${rows.length} rows; a target is one row`);
  return rows[0] ?? null;
}

export async function expectRowExists(service: Client, table: string, match: Match): Promise<Row> {
  const row = await readAsService(service, table, match);
  expect(row, `fixture row ${table} ${JSON.stringify(match)} should exist (service client)`).not.toBeNull();
  return row as Row;
}

export async function expectReadRefused(client: Client, table: string, filters: Match[], label: string): Promise<void> {
  for (const filter of filters) {
    const { data, error } = await client.from(table).select("*").match(filter);
    if (error) {
      expect(error.code, `${label}: reading ${table} ${JSON.stringify(filter)} failed with ${show(error)}`).toBe(PERMISSION_DENIED);
    } else {
      expect(data, `${label}: ${table} rows visible for ${JSON.stringify(filter)}`).toEqual([]);
    }
  }
}

export async function expectReadAllowed(client: Client, table: string, match: Match, label: string): Promise<Row> {
  const { data, error } = await client.from(table).select("*").match(match);
  expect(error, `${label}: reading own ${table} row failed: ${show(error)}`).toBeNull();
  const rows = (data ?? []) as Row[];
  expect(rows, `${label}: own ${table} row ${JSON.stringify(match)} not visible`).toHaveLength(1);
  return rows[0] as Row;
}

export async function expectInsertRefused(client: Client, table: string, payload: Row, label: string): Promise<void> {
  // return=minimal: the refusal must come from the insert itself, not from reading the new row back.
  const { error } = await client.from(table).insert(payload);
  expect(error, `${label}: insert into ${table} was accepted`).not.toBeNull();
  expect(error?.code, `${label}: insert into ${table} failed with ${show(error)}, not an RLS refusal`).toBe(PERMISSION_DENIED);
}

export async function expectInsertAllowed(client: Client, table: string, payload: Row, label: string): Promise<void> {
  const { error } = await client.from(table).insert(payload);
  expect(error, `${label}: insert into ${table} refused: ${show(error)}`).toBeNull();
}

export type WriteOutcome = "permissionDenied" | "zeroRows";

export async function expectUpdateRefused(
  client: Client,
  service: Client,
  table: string,
  match: Match,
  values: Row,
  label: string,
): Promise<WriteOutcome> {
  const before = await expectRowExists(service, table, match);
  const { error, count } = await client.from(table).update(values, { count: "exact" }).match(match);
  if (error) {
    expect(error.code, `${label}: update of ${table} failed with ${show(error)}, not an RLS refusal`).toBe(PERMISSION_DENIED);
  } else {
    expect(count, `${label}: update of ${table} ${JSON.stringify(match)} affected rows`).toBe(0);
  }
  const after = await readAsService(service, table, match);
  expect(after, `${label}: ${table} row changed after a refused update`).toEqual(before);
  return error ? "permissionDenied" : "zeroRows";
}

export async function expectDeleteRefused(
  client: Client,
  service: Client,
  table: string,
  match: Match,
  label: string,
): Promise<WriteOutcome> {
  const before = await expectRowExists(service, table, match);
  const { error, count } = await client.from(table).delete({ count: "exact" }).match(match);
  if (error) {
    expect(error.code, `${label}: delete from ${table} failed with ${show(error)}, not an RLS refusal`).toBe(PERMISSION_DENIED);
  } else {
    expect(count, `${label}: delete from ${table} ${JSON.stringify(match)} affected rows`).toBe(0);
  }
  const after = await readAsService(service, table, match);
  expect(after, `${label}: ${table} row gone or changed after a refused delete`).toEqual(before);
  return error ? "permissionDenied" : "zeroRows";
}

/* ---------------- storage ---------------- */

export const STORAGE_REFUSED = [400, 403, 404];

export function storageStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

export async function objectExists(service: Client, bucket: string, path: string): Promise<boolean> {
  const { data, error } = await service.storage.from(bucket).download(path);
  if (error) {
    const status = storageStatus(error);
    if (status === 400 || status === 404) return false;
    throw new Error(`service download of ${bucket}/${path} failed: ${error.message}`);
  }
  return data !== null;
}

export async function expectDownloadRefused(
  client: Client,
  service: Client,
  bucket: string,
  path: string,
  label: string,
): Promise<void> {
  expect(await objectExists(service, bucket, path), `fixture object ${bucket}/${path} should exist`).toBe(true);
  const { data, error } = await client.storage.from(bucket).download(path);
  expect(data, `${label}: ${bucket}/${path} was downloaded`).toBeNull();
  expect(STORAGE_REFUSED, `${label}: download failed with ${error?.message}`).toContain(storageStatus(error));
}

export async function expectDownloadAllowed(client: Client, bucket: string, path: string, label: string): Promise<void> {
  const { data, error } = await client.storage.from(bucket).download(path);
  expect(error, `${label}: download of ${bucket}/${path} refused: ${error?.message}`).toBeNull();
  expect(data, `${label}: download of ${bucket}/${path} returned nothing`).not.toBeNull();
}

export async function expectUploadRefused(
  client: Client,
  service: Client,
  bucket: string,
  path: string,
  body: Uint8Array,
  contentType: string,
  label: string,
): Promise<void> {
  const { error } = await client.storage.from(bucket).upload(path, body, { contentType, upsert: false });
  expect(error, `${label}: upload to ${bucket}/${path} was accepted`).not.toBeNull();
  expect(STORAGE_REFUSED, `${label}: upload failed with ${error?.message}`).toContain(storageStatus(error));
  expect(await objectExists(service, bucket, path), `${label}: a refused upload left ${bucket}/${path} behind`).toBe(false);
}

export async function expectListRefused(
  client: Client,
  service: Client,
  bucket: string,
  prefix: string,
  name: string,
  label: string,
): Promise<void> {
  const listed = await service.storage.from(bucket).list(prefix);
  expect(listed.error, `service list of ${bucket}/${prefix} failed: ${listed.error?.message}`).toBeNull();
  expect((listed.data ?? []).map((entry) => entry.name), `fixture object ${name} should be listed in ${bucket}/${prefix}`).toContain(name);
  const { data, error } = await client.storage.from(bucket).list(prefix);
  if (error) {
    expect(STORAGE_REFUSED, `${label}: list of ${bucket}/${prefix} failed with ${error.message}`).toContain(storageStatus(error));
  } else {
    expect(data, `${label}: ${bucket}/${prefix} was listed`).toEqual([]);
  }
}

export async function expectSignRefused(
  client: Client,
  service: Client,
  bucket: string,
  path: string,
  seconds: number,
  label: string,
): Promise<void> {
  expect(await objectExists(service, bucket, path), `fixture object ${bucket}/${path} should exist`).toBe(true);
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, seconds);
  expect(data, `${label}: a signed URL for ${bucket}/${path} was minted`).toBeNull();
  expect(STORAGE_REFUSED, `${label}: signing failed with ${error?.message}`).toContain(storageStatus(error));
}
