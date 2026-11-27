import { describe, expect, it, vi } from "vitest";
import {
  readRememberedDevicePermissions,
  rememberDevicePermissionState,
  requestMediaPermission,
  restoreRememberedDevicePermission,
} from "./device-permissions";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("device permission requests", () => {
  it("requests only camera access and immediately stops every track", async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }, { stop }] });
    await requestMediaPermission({ getUserMedia }, "camera");
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "environment" }, audio: false });
    expect(stop).toHaveBeenCalledTimes(2);
  });
  it("requests only microphone access and stops it without recording", async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    await requestMediaPermission({ getUserMedia }, "microphone");
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(stop).toHaveBeenCalledOnce();
  });
  it("propagates denied access without claiming permission was granted", async () => {
    const error = new DOMException("Denied", "NotAllowedError");
    const getUserMedia = vi.fn().mockRejectedValue(error);
    await expect(requestMediaPermission({ getUserMedia }, "camera")).rejects.toBe(error);
  });

  it("keeps a granted camera permission after reopening when Safari cannot report its state", () => {
    const storage = memoryStorage();
    rememberDevicePermissionState("camera", "granted", storage);
    const remembered = readRememberedDevicePermissions(storage);
    expect(restoreRememberedDevicePermission("camera", "unknown", remembered)).toBe("granted");
  });

  it("keeps grants for each resource independently", () => {
    const storage = memoryStorage();
    rememberDevicePermissionState("camera", "granted", storage);
    rememberDevicePermissionState("microphone", "granted", storage);
    expect(readRememberedDevicePermissions(storage)).toEqual({ camera: "granted", microphone: "granted" });
  });

  it("removes a remembered grant when the device explicitly denies access", () => {
    const storage = memoryStorage();
    rememberDevicePermissionState("microphone", "granted", storage);
    rememberDevicePermissionState("microphone", "denied", storage);
    const remembered = readRememberedDevicePermissions(storage);
    expect(remembered).toEqual({});
    expect(restoreRememberedDevicePermission("microphone", "denied", remembered)).toBe("denied");
  });

  it("does not override a browser that explicitly requires asking again", () => {
    const storage = memoryStorage();
    rememberDevicePermissionState("location", "granted", storage);
    const remembered = readRememberedDevicePermissions(storage);
    expect(restoreRememberedDevicePermission("location", "prompt", remembered)).toBe("prompt");
  });

  it("ignores malformed or unavailable stored data", () => {
    const storage = memoryStorage();
    storage.setItem("qap-report.device-permissions.v1", "{invalid");
    expect(readRememberedDevicePermissions(storage)).toEqual({});
  });
});