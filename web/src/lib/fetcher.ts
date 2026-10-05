/** JSON fetcher for SWR; throws on non-2xx so SWR can surface errors. */
export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new FetchError(`Request failed (${res.status})`, res.status);
  return (await res.json()) as T;
}
