export type DevicePermission = "location" | "camera" | "microphone" | "notifications";
export type DevicePermissionState = PermissionState | "unknown" | "unsupported";

export async function readDevicePermission(kind: DevicePermission): Promise<DevicePermissionState> {
  if (kind === "notifications") {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission === "default" ? "prompt" : Notification.permission;
  }
  if (kind === "location" && !navigator.geolocation) return "unsupported";
  if (kind !== "location" && !navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const name = kind === "location" ? "geolocation" : kind;
    const result = await navigator.permissions.query({ name: name as PermissionName });
    return result.state;
  } catch {
    // Safari can request a permission without being able to query its state.
    return "unknown";
  }
}

export async function requestMediaPermission(
  mediaDevices: Pick<MediaDevices, "getUserMedia">,
  kind: "camera" | "microphone",
): Promise<void> {
  const stream = await mediaDevices.getUserMedia(
    kind === "camera" ? { video: { facingMode: "environment" }, audio: false } : { audio: true, video: false },
  );
  // Checking permission must never leave the camera or microphone running.
  stream.getTracks().forEach((track) => track.stop());
}