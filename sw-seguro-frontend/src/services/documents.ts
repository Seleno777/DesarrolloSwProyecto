import { supabase } from "../lib/supabase";

export type DocumentRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  classification: string;
  domain: string;
  created_at: string;
  updated_at: string;
};

export async function listDocuments() {
  const { data, error } = await supabase
    .from("documents")
    .select("id, owner_id, title, description, classification, domain, created_at, updated_at")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentRow[];
}
