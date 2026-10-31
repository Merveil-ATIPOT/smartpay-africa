import { ADMIN_CORRIDORS_PATH, type CorridorsPayload } from "./corridorsDirectory";
import { portalApi } from "./api";

export function fetchAdminCorridors(path: string = ADMIN_CORRIDORS_PATH): Promise<CorridorsPayload> {
  return portalApi.request<CorridorsPayload>(path, { method: "GET" });
}
