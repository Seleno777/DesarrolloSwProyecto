// ==================== ENUMS ====================
export const CLASSIFICATIONS = ["public", "private", "confidential", "restricted"] as const;
export type Classification = typeof CLASSIFICATIONS[number];

export const PERMISSIONS = ["can_view", "can_download", "can_edit", "can_share"] as const;
export type Permission = typeof PERMISSIONS[number];

export const AUDIT_ACTIONS = [
  "document_created",
  "document_updated",
  "document_deleted",
  "access_granted",
  "access_revoked",
  "share_link_created",
  "share_link_activated",
  "share_link_consumed",
  "share_link_revoked",
  "file_uploaded",
  "file_downloaded",
] as const;
export type AuditAction = typeof AUDIT_ACTIONS[number];

export const OBJECT_TYPES = ["document", "share_link", "grant", "file"] as const;
export type ObjectType = typeof OBJECT_TYPES[number];

// ==================== DATABASE TYPES ====================
export type DocumentRow = {
  id: string;
  title: string;
  description: string | null;
  classification: Classification;
  owner_id: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentGrantRow = {
  document_id: string;
  grantee_id: string;
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  can_share: boolean;
  created_at: string;
  revoked_at: string | null;
};

export type DocumentVersionRow = {
  id: string;
  document_id: string;
  version_num: number;
  filename: string;
  mime_type: string;
  size_bytes: number | null;
  sha256: string | null;
  created_at: string;
};

export type ShareLinkRow = {
  id: string;
  document_id: string;
  token: string;
  created_by: string;
  token_hash: string;
  expires_at: string | null;
  max_uses: number | null;
  times_used: number;
  is_revoked: boolean;
  created_at: string;
};

export type ShareLinkRecipientRow = {
  id: string;
  link_id: string;
  recipient_email: string;
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  can_share: boolean;
  max_uses: number | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_id: string;
  action: AuditAction;
  object_type: ObjectType;
  object_id: string;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  is_security_admin: boolean;
  created_at: string;
  updated_at: string;
};

// ==================== API RESPONSE TYPES ====================
export type ShareLinkCreateResponse = {
  link_id: string;
  token: string;
  expires_at: string;
};

export type ActivateShareLinkResponse = {
  out_document_id: string;
};

export type ConsumeShareLinkResponse = {
  out_document_id: string;
  out_max_uses: number | null;
};

export type CanAccessDocumentResponse = boolean;

export type IsSecurityAdminResponse = boolean;

export type ListDocumentGrantsResponse = DocumentGrantRow[];

export type ListShareLinksResponse = ShareLinkRow[];

export type ListShareLinkRecipientsResponse = ShareLinkRecipientRow[];

export type ListAuditLogsResponse = AuditLogRow[];

// ==================== APPLICATION TYPES ====================
export interface Document extends DocumentRow {
  grants?: DocumentGrantRow[];
  versions?: DocumentVersionRow[];
}

export interface ShareLink extends ShareLinkRow {
  recipients?: ShareLinkRecipientRow[];
}

export interface AccessGrant extends DocumentGrantRow {
  grantee?: ProfileRow;
}

// ==================== ERROR TYPES ====================
export type ErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
};

// ==================== PERMISSION TYPES ====================
export type UserPermissions = {
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  can_share: boolean;
};

export type DocumentAccessLevel = "none" | "view" | "download" | "edit" | "share" | "owner";

export function getAccessLevel(permissions: UserPermissions): DocumentAccessLevel {
  if (permissions.can_share) return "share";
  if (permissions.can_edit) return "edit";
  if (permissions.can_download) return "download";
  if (permissions.can_view) return "view";
  return "none";
}
