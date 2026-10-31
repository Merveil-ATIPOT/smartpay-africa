import { portalApi } from "./api";
import { ADMIN_INFRASTRUCTURE_PATH, type InfrastructureSnapshot } from "./infrastructure";

export function fetchInfrastructure(): Promise<InfrastructureSnapshot> {
  return portalApi.request<InfrastructureSnapshot>(ADMIN_INFRASTRUCTURE_PATH, { method: "GET" });
}
