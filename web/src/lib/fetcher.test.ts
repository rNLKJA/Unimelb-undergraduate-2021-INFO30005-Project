import { describe, expect, it } from "vitest";
import { FetchError, liveData } from "./fetcher";

describe("liveData", () => {
  it("unwraps a successful live result", async () => {
    await expect(liveData(Promise.resolve({ ok: true as const, data: { n: 1 } }))).resolves.toEqual(
      {
        n: 1,
      },
    );
  });

  it("throws a FetchError carrying the status so SWR keeps the last good data", async () => {
    const failed = liveData(
      Promise.resolve({ ok: false as const, status: 404, error: "Order not found" }),
    );
    await expect(failed).rejects.toBeInstanceOf(FetchError);
    await expect(failed).rejects.toMatchObject({ status: 404, message: "Order not found" });
  });
});
