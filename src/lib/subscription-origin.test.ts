import { describe, expect, it } from "vitest";
import { subscriptionOrigin } from "./subscription-origin";

const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 1000).toISOString();

describe("subscription origin in admin users", () => {
  it("marks Pix-approved access as paid", () => {
    expect(subscriptionOrigin({ sub: { plan: "mensal", status: "active", end: future, payment_method: "pix" }, redeemedCoupon: false })).toBe("pago");
  });
  it("marks admin-granted access without payment or coupon as admin courtesy", () => {
    expect(subscriptionOrigin({ sub: { plan: "vitalicio", status: "active", end: future, payment_method: null }, redeemedCoupon: false })).toBe("admin");
    expect(subscriptionOrigin({ sub: { plan: "premium", status: "active", end: future, payment_method: "admin" }, redeemedCoupon: false })).toBe("admin");
  });
  it("marks coupon access as coupon", () => {
    expect(subscriptionOrigin({ sub: { plan: "premium", status: "active", end: future, payment_method: null }, redeemedCoupon: true })).toBe("cupom");
  });
  it("marks expired paid access and revoked accounts as without plan", () => {
    expect(subscriptionOrigin({ sub: { plan: "mensal", status: "active", end: past, payment_method: "pix" }, redeemedCoupon: false })).toBe("sem_plano");
    expect(subscriptionOrigin({ sub: { plan: "free", status: "canceled", end: future, payment_method: null }, redeemedCoupon: false })).toBe("sem_plano");
  });
  it("marks active free trial as trial", () => {
    expect(subscriptionOrigin({ sub: { plan: "free", status: "trial", end: future, payment_method: null }, redeemedCoupon: false })).toBe("teste");
  });
});