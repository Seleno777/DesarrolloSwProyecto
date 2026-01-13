import { supabase } from "../lib/supabase";
import type { DocumentRow } from "../types/models";

export class DocumentsService {
  /** Document list (lo que RLS permita ver en documents) */
  static async listMyVisible(): Promise<DocumentRow[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("id,title,classification,owner_id,created_at,updated_at")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as DocumentRow[];
  }

  /** Shared with me (si usas document_grants) */
  static async listSharedWithMe() {
    const { data, error } = await supabase
      .from("document_grants")
      .select(`
        document_id,
        can_view, can_download, can_edit, can_share,
        created_at, revoked_at,
        documents:document_id ( id, title, classification, owner_id, created_at, updated_at )
      `)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}
