export type Classification = "public" | "private" | "confidential" | "restricted";

export type DocumentRow = {
  id: string;
  title: string;
  classification: Classification;
  owner_id: string;
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

export type ShareLinkCreateResponse = {
  link_id: string;
  token: string;
  expires_at: string;
};

export type ActivateShareLinkResponse = {
  out_document_id: string;
};
