import { ADMIN_AUDIT_PATH, type AuditListPayload } from "./auditDirectory";
import { portalApi } from "./api";

export function fetchAdminAudit(path: string = ADMIN_AUDIT_PATH): Promise<AuditListPayload> {
  return portalApi.request<AuditListPayload>(path, { method: "GET" });
}
