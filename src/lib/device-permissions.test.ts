import { describe, expect, it, vi } from "vitest";
import { requestMediaPermission } from "./device-permissions";

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
});