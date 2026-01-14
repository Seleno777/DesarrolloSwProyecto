import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { DocumentsService, DocumentGrantService, AuditService } from "../services/DocumentsService";
import { ShareLinksService } from "../services/ShareLinksService";
import { getUserErrorMessage, isAuthError } from "../lib/errors";
import type { DocumentRow, DocumentGrantRow, ShareLinkRow } from "../types/models";

/**
 * Hook para manejar carga de documentos
 */
export function useDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const docs = await DocumentsService.listMyVisible();
      setDocuments(docs);
    } catch (err) {
      const message = getUserErrorMessage(err);
      setError(message);
      if (isAuthError(err)) {
        // Handle auth error (redirect to login)
        console.error("Authentication error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return {
    documents,
    loading,
    error,
    refetch: loadDocuments,
  };
}

/**
 * Hook para crear documentos
 */
export function useCreateDocument() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (title: string, description: string, classification: "public" | "private" | "confidential" | "restricted") => {
      setLoading(true);
      setError(null);

      try {
        const doc = await DocumentsService.createDocument({
          title,
          description: description || null,
          classification,
        });
        return doc;
      } catch (err) {
        const message = getUserErrorMessage(err);
        setError(message);
        console.warn("Error creating document:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { create, loading, error };
}

/**
 * Hook para acceso a documentos
 */
export function useDocumentAccess(documentId: string) {
  const { user } = useAuth();
  const [canView, setCanView] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !documentId) {
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        const [view, edit, share, download] = await Promise.all([
          DocumentGrantService.canAccessDocument(documentId, user.id, "view"),
          DocumentGrantService.canAccessDocument(documentId, user.id, "edit"),
          DocumentGrantService.canAccessDocument(documentId, user.id, "share"),
          DocumentGrantService.canAccessDocument(documentId, user.id, "download"),
        ]);

        setCanView(view);
        setCanEdit(edit);
        setCanShare(share);
        setCanDownload(download);
      } catch (err) {
        console.error("Error checking document access:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, documentId]);

  return {
    canView,
    canEdit,
    canShare,
    canDownload,
    loading,
    hasAccess: canView,
  };
}

/**
 * Hook para share links
 */
export function useShareLinks(documentId: string) {
  const [shareLinks, setShareLinks] = useState<ShareLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShareLinks = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const links = await ShareLinksService.listShareLinks(documentId);
      setShareLinks(links);
    } catch (err) {
      const message = getUserErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const createShareLink = useCallback(
    async (expiresInMinutes: number | null, maxUses: number | null) => {
      setError(null);

      try {
        const response = await ShareLinksService.createShareLink({
          document_id: documentId,
          expires_in_minutes: expiresInMinutes,
          max_uses: maxUses,
        });

        await loadShareLinks();
        return response;
      } catch (err) {
        const message = getUserErrorMessage(err);
        setError(message);
        console.warn("Error creating share link:", err);
        throw err;
      }
    },
    [documentId, loadShareLinks]
  );

  const revokeShareLink = useCallback(
    async (linkId: string) => {
      setError(null);

      try {
        await ShareLinksService.revokeShareLink({ link_id: linkId });
        await loadShareLinks();
      } catch (err) {
        const message = getUserErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [loadShareLinks]
  );

  useEffect(() => {
    loadShareLinks();
  }, [loadShareLinks]);

  return {
    shareLinks,
    loading,
    error,
    createShareLink,
    revokeShareLink,
    refetch: loadShareLinks,
  };
}

/**
 * Hook para permisos de acceso
 */
export function useDocumentGrants(documentId: string) {
  const [grants, setGrants] = useState<DocumentGrantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGrants = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const documentGrants = await DocumentGrantService.listGrants(documentId);
      setGrants(documentGrants);
    } catch (err) {
      const message = getUserErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const grantAccess = useCallback(
    async (
      granteeId: string,
      permissions: {
        can_view: boolean;
        can_download: boolean;
        can_edit: boolean;
        can_share: boolean;
      }
    ) => {
      setError(null);

      try {
        await DocumentGrantService.grantAccess(documentId, granteeId, permissions);
        await loadGrants();
      } catch (err) {
        const message = getUserErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [documentId, loadGrants]
  );

  const revokeAccess = useCallback(
    async (granteeId: string) => {
      setError(null);

      try {
        await DocumentGrantService.revokeAccess(documentId, granteeId);
        await loadGrants();
      } catch (err) {
        const message = getUserErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [documentId, loadGrants]
  );

  useEffect(() => {
    loadGrants();
  }, [loadGrants]);

  return {
    grants,
    loading,
    error,
    grantAccess,
    revokeAccess,
    refetch: loadGrants,
  };
}

/**
 * Hook para auditoría
 */
export function useAuditLogs() {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const auditLogs = await AuditService.getAuditLogs();
      setLogs(auditLogs);
    } catch (err) {
      const message = getUserErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return {
    logs,
    loading,
    error,
    refetch: loadLogs,
  };
}
