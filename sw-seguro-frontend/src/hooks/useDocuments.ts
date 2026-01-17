import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";

export type DocumentRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  classification: "public" | "private" | "confidential" | "restricted";
  created_at: string;
  updated_at: string;
};

export function useDocuments() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setError("");
      setLoading(true);

      // ✅ SOLO mis documentos (owner)
      const { data, error: err } = await supabase
        .from("documents")
        .select("id, owner_id, title, description, classification, created_at, updated_at")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      if (err) throw err;

      setDocuments((data || []) as DocumentRow[]);
    } catch (e: any) {
      setError(e?.message || "Error al cargar tus documentos");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { documents, loading, error, refetch };
}

export function useCreateDocument() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const create = useCallback(
    async (
      title: string,
      description: string,
      classification: "public" | "private" | "confidential" | "restricted"
    ) => {
      if (!user?.id) throw new Error("No autenticado");

      setLoading(true);
      setError("");

      try {
        const { data, error: err } = await supabase
          .from("documents")
          .insert([
            {
              owner_id: user.id,
              title: title.trim(),
              description: description?.trim() || null,
              classification,
            },
          ])
          .select("id")
          .single();

        if (err) throw err;
        return data;
      } catch (e: any) {
        setError(e?.message || "Error al crear el documento");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  return { create, loading, error };
}
