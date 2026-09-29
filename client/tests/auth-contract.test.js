import { describe, expect, it } from "vitest";
import { isPendingDeviceResponse, normalizeNotifications, normalizePermissions, toAuthSession, toPendingDevice } from "@/modules/auth/adapters/auth.adapter";
import { can, canAll, canAny, permissionKeys } from "@/modules/auth/permissions/permission";
import { adminNavigation } from "@/modules/auth/permissions/adminNavigation";

describe("auth contract adapters", () => {
  it("normalizes the v1 bootstrap response without persisting a session object", () => {
    const session = toAuthSession({
      employee: { id: "e1", name: "Ali" }, role: { id: "r1", name: "ADMIN" },
      permissions: [{ pageKey: "orders", visible: true, actions: ["read", "create", "read"] }],
      notifications: { unreadCount: 2, items: [{ id: "n1" }] },
      currentAttendance: { id: "a1" }, currentShift: { id: "s1" }, featureFlags: { x: true },
      realtime: { token: "rt", lastSequence: 7 },
    }, "access");
    expect(session.token).toBe("access");
    expect(session.permissions[0]).toEqual({ pageKey: "orders", visible: true, actions: ["read", "create"] });
    expect(session.notifications.unreadCount).toBe(2);
    expect(session.currentAttendance.id).toBe("a1");
    expect(session.currentShift.id).toBe("s1");
  });

  it("accepts legacy field spelling only at the adapter boundary", () => {
    expect(normalizePermissions([{ page_key: "inventory", visible: true }])).toEqual([{ pageKey: "inventory", visible: true, actions: [] }]);
  });

  it("normalizes notification arrays", () => {
    expect(normalizeNotifications([{ is_read: false }, { is_read: true }]).unreadCount).toBe(1);
  });

  it("recognizes the 202 pending-device payload", () => {
    const data = { status: "DEVICE_APPROVAL_REQUIRED", deviceRequestId: "d1", pollAfterSeconds: 8 };
    expect(isPendingDeviceResponse(data)).toBe(true);
    expect(toPendingDevice(data)).toEqual({ requestId: "d1", pollAfterSeconds: 8 });
  });
});

describe("permission evaluation", () => {
  const permissions = [
    { pageKey: "orders", visible: true, actions: ["read", "create"] },
    { pageKey: "employees.password", visible: true, actions: ["view"] },
    { pageKey: "drawer", visible: false, actions: ["read"] },
  ];

  it("creates exact page and action permission keys", () => {
    expect([...permissionKeys(permissions)]).toEqual(expect.arrayContaining(["orders", "orders.read", "orders.create", "employees.password.view"]));
  });
  it("does not grant hidden pages", () => expect(can(permissions, "drawer")).toBe(false));
  it("does not grant actions by role name or sibling actions", () => expect(can(permissions, "orders.cancel")).toBe(false));
  it("supports any and all checks", () => {
    expect(canAny(permissions, ["orders.cancel", "orders.create"])).toBe(true);
    expect(canAll(permissions, ["orders.read", "orders.create"])).toBe(true);
    expect(canAll(permissions, ["orders.read", "orders.cancel"])).toBe(false);
  });
});

describe("admin navigation registry", () => {
  it("uses backend page keys for every visible route", () => {
    expect(adminNavigation.find((item) => item.id === "purchase-returns")?.pageKey).toBe("purchase-returns");
    expect(adminNavigation.find((item) => item.id === "reports")?.pageKey).toBe("reports");
    expect(adminNavigation.filter((item) => item.pageKey === "orders")).toHaveLength(2);
  });
  it("contains unique navigation ids and absolute admin paths", () => {
    expect(new Set(adminNavigation.map((item) => item.id)).size).toBe(adminNavigation.length);
    expect(adminNavigation.every((item) => item.path.startsWith("/admin/"))).toBe(true);
  });
});
