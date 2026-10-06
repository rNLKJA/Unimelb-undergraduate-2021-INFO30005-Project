import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, cookie ? { headers: { cookie } } : undefined);

describe("proxy (optimistic auth redirects)", () => {
  it("sends signed-out vendors and admins to their login pages", () => {
    expect(proxy(req("/vendor/orders")).headers.get("location")).toBe(
      "http://localhost:3000/vendor/login",
    );
    expect(proxy(req("/admin/records?table=vans")).headers.get("location")).toBe(
      "http://localhost:3000/admin/login",
    );
  });

  it("keeps the return path for customers", () => {
    const location = proxy(req("/customer/orders/ABC123")).headers.get("location")!;
    expect(new URL(location).pathname).toBe("/customer/login");
    expect(new URL(location).searchParams.get("next")).toBe("/customer/orders/ABC123");
  });

  it("lets login pages and signed-in visitors through", () => {
    expect(proxy(req("/vendor/login")).headers.get("location")).toBeNull();
    expect(proxy(req("/vendor", "siav_vendor=token")).headers.get("location")).toBeNull();
    expect(
      proxy(req("/customer/profile", "siav_customer=token")).headers.get("location"),
    ).toBeNull();
  });
});
