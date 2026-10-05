/** SWR error carrying the HTTP-like status, so callers can tell 401/404 apart. */
export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** What the live Server Functions return instead of throwing across the network. */
export type LiveResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** Unwrap a live Server Function result for SWR; failures throw so SWR surfaces them. */
export async function liveData<T>(result: Promise<LiveResult<T>>): Promise<T> {
  const settled = await result;
  if (!settled.ok) throw new FetchError(settled.error, settled.status);
  return settled.data;
}
