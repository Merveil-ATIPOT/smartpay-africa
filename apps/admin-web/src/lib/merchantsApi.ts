import { portalApi } from "./api";
import { adminMerchantDetailPath, type AdminMerchantDetail } from "./merchantDetail";
import type { MerchantsListPayload } from "./merchantsDirectory";

export function fetchAdminMerchants(path: string): Promise<MerchantsListPayload> {
  return portalApi.request<MerchantsListPayload>(path, { method: "GET" });
}

export function fetchAdminMerchant(id: number): Promise<AdminMerchantDetail> {
  return portalApi.request<AdminMerchantDetail>(adminMerchantDetailPath(id), { method: "GET" });
}
