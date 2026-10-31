import type { UserProfile } from "@smartpay/contracts";

import { portalApi } from "./api";
import { adminUserDetailPath, type UsersListPayload } from "./usersDirectory";

export function fetchAdminUsers(path: string): Promise<UsersListPayload> {
  return portalApi.request<UsersListPayload>(path, { method: "GET" });
}

export function fetchAdminUser(id: number): Promise<UserProfile> {
  return portalApi.request<UserProfile>(adminUserDetailPath(id), { method: "GET" });
}
