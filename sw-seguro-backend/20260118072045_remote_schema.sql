drop extension if exists "pg_net";

create type "public"."app_role" as enum ('user', 'security_admin', 'admin');

create type "public"."doc_action" as enum ('view', 'download', 'upload', 'edit', 'share', 'manage');

create type "public"."doc_classification" as enum ('public', 'private', 'confidential', 'restricted');

create sequence "public"."audit_log_id_seq";


  create table "public"."audit_log" (
    "id" bigint not null default nextval('public.audit_log_id_seq'::regclass),
    "occurred_at" timestamp with time zone not null default now(),
    "actor_id" uuid,
    "action" text not null,
    "object_type" text not null,
    "object_id" uuid,
    "metadata" jsonb not null default '{}'::jsonb
      );


alter table "public"."audit_log" enable row level security;


  create table "public"."document_grants" (
    "document_id" uuid not null,
    "grantee_id" uuid not null,
    "can_view" boolean not null default true,
    "can_download" boolean not null default true,
    "can_edit" boolean not null default false,
    "can_share" boolean not null default false,
    "granted_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "revoked_at" timestamp with time zone,
    "granted_via_link_id" uuid,
    "expires_at" timestamp with time zone
      );


alter table "public"."document_grants" enable row level security;


  create table "public"."document_versions" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "created_by" uuid not null,
    "storage_path" text not null,
    "mime_type" text not null,
    "size_bytes" bigint,
    "created_at" timestamp with time zone not null default now(),
    "version_num" integer not null,
    "sha256" text
      );


alter table "public"."document_versions" enable row level security;


  create table "public"."documents" (
    "id" uuid not null default gen_random_uuid(),
    "owner_id" uuid not null,
    "title" text not null,
    "description" text,
    "classification" public.doc_classification not null default 'private'::public.doc_classification,
    "domain" text not null default 'default'::text,
    "is_deleted" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."documents" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "full_name" text,
    "domain" text not null default 'default'::text,
    "role" public.app_role not null default 'user'::public.app_role,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."public_document_links" (
    "document_id" uuid not null,
    "token" text not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."public_document_links" enable row level security;


  create table "public"."restricted_document_passwords" (
    "document_id" uuid not null,
    "password_hash" text not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."restricted_document_passwords" enable row level security;


  create table "public"."share_link_allowlist" (
    "link_id" uuid not null,
    "allowed_user_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "recipient_email" text not null
      );


alter table "public"."share_link_allowlist" enable row level security;


  create table "public"."share_link_recipients" (
    "id" uuid not null default gen_random_uuid(),
    "link_id" uuid not null,
    "recipient_email" text not null,
    "recipient_user_id" uuid,
    "can_view" boolean not null default true,
    "can_download" boolean not null default false,
    "can_edit" boolean not null default false,
    "can_share" boolean not null default false,
    "max_uses" integer not null default 1,
    "uses_count" integer not null default 0,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."share_link_recipients" enable row level security;


  create table "public"."share_links" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "created_by" uuid not null,
    "token_hash" text not null,
    "expires_at" timestamp with time zone not null,
    "max_uses" integer not null default 1000,
    "uses_count" integer not null default 0,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."share_links" enable row level security;

alter sequence "public"."audit_log_id_seq" owned by "public"."audit_log"."id";

CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id);

CREATE UNIQUE INDEX document_grants_pkey ON public.document_grants USING btree (document_id, grantee_id);

CREATE UNIQUE INDEX document_versions_doc_version_uniq ON public.document_versions USING btree (document_id, version_num);

CREATE UNIQUE INDEX document_versions_pkey ON public.document_versions USING btree (id);

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

CREATE INDEX idx_audit_actor_time ON public.audit_log USING btree (actor_id, occurred_at DESC);

CREATE INDEX idx_documents_owner_deleted ON public.documents USING btree (owner_id, is_deleted);

CREATE INDEX idx_grants_grantee ON public.document_grants USING btree (grantee_id);

CREATE INDEX idx_links_doc ON public.share_links USING btree (document_id);

CREATE INDEX idx_recipients_link ON public.share_link_recipients USING btree (link_id);

CREATE INDEX idx_share_allowlist_user ON public.share_link_allowlist USING btree (allowed_user_id);

CREATE INDEX idx_share_link_allowlist_allowed_user ON public.share_link_allowlist USING btree (allowed_user_id);

CREATE INDEX idx_share_links_doc ON public.share_links USING btree (document_id);

CREATE INDEX idx_share_recipients_user ON public.share_link_recipients USING btree (recipient_user_id);

CREATE INDEX idx_versions_doc_version ON public.document_versions USING btree (document_id, version_num DESC);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX public_document_links_pkey ON public.public_document_links USING btree (document_id);

CREATE UNIQUE INDEX public_document_links_token_key ON public.public_document_links USING btree (token);

CREATE UNIQUE INDEX restricted_document_passwords_pkey ON public.restricted_document_passwords USING btree (document_id);

CREATE UNIQUE INDEX share_link_allowlist_pkey ON public.share_link_allowlist USING btree (link_id, recipient_email);

CREATE UNIQUE INDEX share_link_recipients_link_email_key ON public.share_link_recipients USING btree (link_id, recipient_email);

CREATE UNIQUE INDEX share_link_recipients_link_email_uniq ON public.share_link_recipients USING btree (link_id, recipient_email);

CREATE UNIQUE INDEX share_link_recipients_link_id_recipient_email_key ON public.share_link_recipients USING btree (link_id, recipient_email);

CREATE UNIQUE INDEX share_link_recipients_pkey ON public.share_link_recipients USING btree (id);

CREATE UNIQUE INDEX share_link_recipients_unique_link_email ON public.share_link_recipients USING btree (link_id, recipient_email);

CREATE UNIQUE INDEX share_links_pkey ON public.share_links USING btree (id);

CREATE UNIQUE INDEX share_links_token_hash_key ON public.share_links USING btree (token_hash);

CREATE UNIQUE INDEX uq_document_grants_doc_grantee ON public.document_grants USING btree (document_id, grantee_id);

CREATE UNIQUE INDEX uq_share_link_recipients_link_email ON public.share_link_recipients USING btree (link_id, recipient_email);

CREATE UNIQUE INDEX ux_share_link_recipients_link_email ON public.share_link_recipients USING btree (link_id, recipient_email);

alter table "public"."audit_log" add constraint "audit_log_pkey" PRIMARY KEY using index "audit_log_pkey";

alter table "public"."document_grants" add constraint "document_grants_pkey" PRIMARY KEY using index "document_grants_pkey";

alter table "public"."document_versions" add constraint "document_versions_pkey" PRIMARY KEY using index "document_versions_pkey";

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."public_document_links" add constraint "public_document_links_pkey" PRIMARY KEY using index "public_document_links_pkey";

alter table "public"."restricted_document_passwords" add constraint "restricted_document_passwords_pkey" PRIMARY KEY using index "restricted_document_passwords_pkey";

alter table "public"."share_link_allowlist" add constraint "share_link_allowlist_pkey" PRIMARY KEY using index "share_link_allowlist_pkey";

alter table "public"."share_link_recipients" add constraint "share_link_recipients_pkey" PRIMARY KEY using index "share_link_recipients_pkey";

alter table "public"."share_links" add constraint "share_links_pkey" PRIMARY KEY using index "share_links_pkey";

alter table "public"."document_grants" add constraint "document_grants_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_grants" validate constraint "document_grants_document_id_fkey";

alter table "public"."document_grants" add constraint "document_grants_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) not valid;

alter table "public"."document_grants" validate constraint "document_grants_granted_by_fkey";

alter table "public"."document_grants" add constraint "document_grants_granted_via_link_id_fkey" FOREIGN KEY (granted_via_link_id) REFERENCES public.share_links(id) ON DELETE SET NULL not valid;

alter table "public"."document_grants" validate constraint "document_grants_granted_via_link_id_fkey";

alter table "public"."document_grants" add constraint "document_grants_grantee_id_fkey" FOREIGN KEY (grantee_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."document_grants" validate constraint "document_grants_grantee_id_fkey";

alter table "public"."document_versions" add constraint "document_versions_byte_size_check" CHECK ((size_bytes > 0)) not valid;

alter table "public"."document_versions" validate constraint "document_versions_byte_size_check";

alter table "public"."document_versions" add constraint "document_versions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."document_versions" validate constraint "document_versions_created_by_fkey";

alter table "public"."document_versions" add constraint "document_versions_doc_version_uniq" UNIQUE using index "document_versions_doc_version_uniq";

alter table "public"."document_versions" add constraint "document_versions_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_versions" validate constraint "document_versions_document_id_fkey";

alter table "public"."document_versions" add constraint "document_versions_mime_pdf_only" CHECK ((mime_type = 'application/pdf'::text)) not valid;

alter table "public"."document_versions" validate constraint "document_versions_mime_pdf_only";

alter table "public"."document_versions" add constraint "document_versions_version_num_check" CHECK ((version_num > 0)) not valid;

alter table "public"."document_versions" validate constraint "document_versions_version_num_check";

alter table "public"."documents" add constraint "documents_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."documents" validate constraint "documents_owner_id_fkey";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."public_document_links" add constraint "public_document_links_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."public_document_links" validate constraint "public_document_links_document_id_fkey";

alter table "public"."public_document_links" add constraint "public_document_links_token_key" UNIQUE using index "public_document_links_token_key";

alter table "public"."restricted_document_passwords" add constraint "restricted_document_passwords_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."restricted_document_passwords" validate constraint "restricted_document_passwords_document_id_fkey";

alter table "public"."share_link_allowlist" add constraint "share_link_allowlist_allowed_user_id_fkey" FOREIGN KEY (allowed_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."share_link_allowlist" validate constraint "share_link_allowlist_allowed_user_id_fkey";

alter table "public"."share_link_allowlist" add constraint "share_link_allowlist_link_id_fkey" FOREIGN KEY (link_id) REFERENCES public.share_links(id) ON DELETE CASCADE not valid;

alter table "public"."share_link_allowlist" validate constraint "share_link_allowlist_link_id_fkey";

alter table "public"."share_link_recipients" add constraint "share_link_recipients_link_email_key" UNIQUE using index "share_link_recipients_link_email_key";

alter table "public"."share_link_recipients" add constraint "share_link_recipients_link_email_uniq" UNIQUE using index "share_link_recipients_link_email_uniq";

alter table "public"."share_link_recipients" add constraint "share_link_recipients_link_id_fkey" FOREIGN KEY (link_id) REFERENCES public.share_links(id) ON DELETE CASCADE not valid;

alter table "public"."share_link_recipients" validate constraint "share_link_recipients_link_id_fkey";

alter table "public"."share_link_recipients" add constraint "share_link_recipients_link_id_recipient_email_key" UNIQUE using index "share_link_recipients_link_id_recipient_email_key";

alter table "public"."share_link_recipients" add constraint "share_link_recipients_max_uses_check" CHECK ((max_uses > 0)) not valid;

alter table "public"."share_link_recipients" validate constraint "share_link_recipients_max_uses_check";

alter table "public"."share_link_recipients" add constraint "share_link_recipients_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."share_link_recipients" validate constraint "share_link_recipients_recipient_user_id_fkey";

alter table "public"."share_link_recipients" add constraint "share_link_recipients_unique_link_email" UNIQUE using index "share_link_recipients_unique_link_email";

alter table "public"."share_links" add constraint "share_links_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."share_links" validate constraint "share_links_created_by_fkey";

alter table "public"."share_links" add constraint "share_links_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."share_links" validate constraint "share_links_document_id_fkey";

alter table "public"."share_links" add constraint "share_links_max_uses_check" CHECK ((max_uses > 0)) not valid;

alter table "public"."share_links" validate constraint "share_links_max_uses_check";

alter table "public"."share_links" add constraint "share_links_token_hash_key" UNIQUE using index "share_links_token_hash_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.activate_share_link(p_token text)
 RETURNS TABLE(out_document_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_token_hash text;
  v_link record;
  v_email text;
  v_rec record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RAISE EXCEPTION 'token required';
  END IF;

  v_token_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');

  SELECT id, document_id, created_by, expires_at, max_uses, uses_count, revoked_at
    INTO v_link
  FROM public.share_links
  WHERE token_hash = v_token_hash
  LIMIT 1;

  IF v_link IS NULL THEN
    RAISE EXCEPTION 'invalid link';
  END IF;

  IF v_link.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'link revoked';
  END IF;

  IF v_link.expires_at < now() THEN
    RAISE EXCEPTION 'link expired';
  END IF;

  IF v_link.uses_count >= v_link.max_uses THEN
    RAISE EXCEPTION 'link max uses reached';
  END IF;

  -- email del user logueado
  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'cannot read user email';
  END IF;

  -- recipient por email
  SELECT *
    INTO v_rec
  FROM public.share_link_recipients
  WHERE link_id = v_link.id
    AND revoked_at IS NULL
    AND lower(recipient_email) = v_email
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_rec IS NULL THEN
    RAISE EXCEPTION 'recipient not allowed';
  END IF;

  IF v_rec.uses_count >= v_rec.max_uses THEN
    RAISE EXCEPTION 'recipient max uses reached';
  END IF;

  -- marcar recipient_user_id si está null + incrementar uso recipient
  UPDATE public.share_link_recipients
  SET recipient_user_id = COALESCE(recipient_user_id, auth.uid()),
      uses_count = uses_count + 1
  WHERE id = v_rec.id;

  -- incrementar uso link
  UPDATE public.share_links
  SET uses_count = uses_count + 1
  WHERE id = v_link.id;

  -- crear/actualizar grant (PK doc+grantee)
  INSERT INTO public.document_grants(
    document_id,
    grantee_id,
    can_view,
    can_download,
    can_edit,
    can_share,
    granted_by,
    created_at,
    revoked_at,
    granted_via_link_id,
    expires_at
  )
  VALUES (
    v_link.document_id,
    auth.uid(),
    v_rec.can_view,
    v_rec.can_download,
    v_rec.can_edit,
    v_rec.can_share,
    v_link.created_by,
    now(),
    NULL,
    v_link.id,
    v_link.expires_at
  )
  ON CONFLICT (document_id, grantee_id)
  DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_download = EXCLUDED.can_download,
    can_edit = EXCLUDED.can_edit,
    can_share = EXCLUDED.can_share,
    granted_by = EXCLUDED.granted_by,
    granted_via_link_id = EXCLUDED.granted_via_link_id,
    revoked_at = NULL,
    expires_at = EXCLUDED.expires_at;

  out_document_id := v_link.document_id;
  RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.activate_share_link_debug(p_token text)
 RETURNS TABLE(out_document_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
declare
  v_uid uuid;
  v_email text;
  v_hash text;
  v_link public.share_links;
  v_rec public.share_link_recipients;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'not authenticated'; end if;

  select lower(email) into v_email from public.profiles where id = v_uid;
  if v_email is null then raise exception 'missing profile email'; end if;

  v_hash := encode(
    extensions.digest(convert_to(p_token,'utf8'), 'sha256'::text),
    'hex'
  );

  select * into v_link from public.share_links where token_hash = v_hash;
  if not found then raise exception 'invalid link (hash not found)'; end if;

  if v_link.revoked_at is not null then raise exception 'revoked'; end if;
  if now() >= v_link.expires_at then raise exception 'expired'; end if;
  if v_link.uses_count >= v_link.max_uses then raise exception 'max uses reached (global)'; end if;

  select * into v_rec
  from public.share_link_recipients
  where link_id = v_link.id
    and lower(recipient_email) = v_email
    and revoked_at is null;

  if not found then
    raise exception 'not allowed: email % not in allowlist for link %', v_email, v_link.id;
  end if;

  if v_rec.uses_count >= v_rec.max_uses then raise exception 'max uses reached (recipient)'; end if;

  update public.share_link_recipients
  set uses_count = uses_count + 1,
      recipient_user_id = v_uid
  where id = v_rec.id;

  update public.share_links
  set uses_count = uses_count + 1
  where id = v_link.id;

  insert into public.document_grants (
    document_id, grantee_id,
    can_view, can_download, can_edit, can_share,
    granted_by, revoked_at, granted_via_link_id
  )
  values (
    v_link.document_id, v_uid,
    v_rec.can_view, v_rec.can_download, v_rec.can_edit, v_rec.can_share,
    v_link.created_by, null, v_link.id
  )
  on conflict (document_id, grantee_id) do update set
    can_view = excluded.can_view,
    can_download = excluded.can_download,
    can_edit = excluded.can_edit,
    can_share = excluded.can_share,
    revoked_at = null,
    granted_via_link_id = excluded.granted_via_link_id;

  return query select v_link.document_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_event(p_action text, p_object_type text, p_object_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.audit_log(actor_id, action, object_type, object_id, metadata)
  values (auth.uid(), p_action, p_object_type, p_object_id, coalesce(p_metadata,'{}'::jsonb));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.block_share_for_restricted_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
declare
  v_class text;
begin
  select classification into v_class
  from public.documents
  where id = new.document_id;

  if v_class = 'restricted' then
    raise exception 'restricted documents cannot be shared';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_document(uid uuid, doc_id uuid, act public.doc_action)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  d public.documents;
  p public.profiles;
  g public.document_grants;
begin
  -- RS-07/RS-08: debe estar autenticado
  if uid is null then
    return false;
  end if;

  select * into d
  from public.documents
  where id = doc_id and is_deleted = false;

  if not found then
    return false;
  end if;

  select * into p
  from public.profiles
  where id = uid;

  if not found then
    return false;
  end if;

  -- Owner puede todo
  if d.owner_id = uid then
    return true;
  end if;

  -- Gate por dominio
  if p.domain <> d.domain then
    return false;
  end if;

  -- Public dentro del dominio: solo view
  if d.classification = 'public' and act = 'view' then
    return true;
  end if;

  -- Grants explícitos
  select * into g
  from public.document_grants
  where document_id = doc_id
    and grantee_id = uid
    and revoked_at is null;

  if found then
    -- Si el grant viene de link, valida link activo + destinatario activo
    if g.granted_via_link_id is not null then
      if not exists (
        select 1
        from public.share_links l
        join public.share_link_recipients r on r.link_id = l.id
        where l.id = g.granted_via_link_id
          and l.revoked_at is null
          and now() < l.expires_at
          and r.revoked_at is null
          and r.recipient_user_id = uid
      ) then
        return false;
      end if;
    end if;

    -- Aplica permisos
    if act = 'view' then
      return g.can_view;
    elseif act = 'download' then
      return g.can_download;
    elseif act = 'edit' then
      return g.can_edit;
    elseif act = 'share' then
      return g.can_share;
    elseif act = 'upload' then
      return g.can_edit;
    else
      return false;
    end if;
  end if;

  return false;

exception when others then
  -- RS-15: fail secure
  return false;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_share_link(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_hash text;
  v_link public.share_links;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- ✅ digest correcto
  v_hash := encode(digest(convert_to(p_token,'utf8'), 'sha256'), 'hex');

  select * into v_link
  from public.share_links
  where token_hash = v_hash;

  if not found then raise exception 'invalid link'; end if;
  if v_link.revoked_at is not null then raise exception 'revoked'; end if;
  if now() >= v_link.expires_at then raise exception 'expired'; end if;

  perform public.audit_event(
    'share_link_used',
    'share_link',
    v_link.id,
    jsonb_build_object('document_id', v_link.document_id)
  );

  return v_link.document_id;

exception when others then
  raise exception 'link cannot be used';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_document(p_title text, p_description text DEFAULT NULL::text, p_classification public.doc_classification DEFAULT 'private'::public.doc_classification)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_domain text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select domain into v_domain
  from public.profiles
  where id = v_uid;

  if v_domain is null then
    v_domain := 'default';
  end if;

  insert into public.documents(owner_id, title, description, classification, domain)
  values (v_uid, p_title, p_description, p_classification, v_domain)
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_document_version(p_document_id uuid, p_filename text, p_mime_type text DEFAULT NULL::text)
 RETURNS TABLE(version_id uuid, version_num integer, storage_path text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
declare
  v_uid uuid;
  v_next int;
  v_safe_filename text;
  v_ext text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.can_access_document(v_uid, p_document_id, 'upload') then
    raise exception 'not allowed';
  end if;

  -- Solo PDF por MIME
  if p_mime_type is null or lower(p_mime_type) <> 'application/pdf' then
    raise exception 'only PDF files are allowed';
  end if;

  -- Solo .pdf por extensión
  v_ext := lower(regexp_replace(coalesce(p_filename,''), '^.*\.(.+)$', '\1'));
  if v_ext <> 'pdf' then
    raise exception 'only .pdf files are allowed';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_document_id::text));

  select coalesce(max(dv.version_num), 0) + 1
    into v_next
  from public.document_versions dv
  where dv.document_id = p_document_id;

  v_safe_filename := regexp_replace(coalesce(p_filename,'file.pdf'), '[\\/]+', '_', 'g');

  version_num := v_next;
  storage_path := p_document_id::text || '/v' || v_next::text || '/' || v_safe_filename;

  insert into public.document_versions(document_id, version_num, storage_path, mime_type, created_by)
  values (p_document_id, v_next, storage_path, 'application/pdf', v_uid)
  returning id into version_id;

  insert into public.audit_log(actor_id, action, object_type, object_id, metadata)
  values (
    v_uid,
    'document_version_created',
    'document',
    p_document_id,
    jsonb_build_object('version_num', v_next, 'path', storage_path, 'mime_type', 'application/pdf')
  );

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_public_link_v1(p_document_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_uid uuid;
  v_token text;
  v_token_hash text;
  v_link_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- solo owner del documento
  if not public.is_document_owner(p_document_id) then
    raise exception 'not allowed';
  end if;

  -- token random (48 chars hex)
  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.share_links(document_id, created_by, token_hash, expires_at, max_uses, uses_count, revoked_at)
  values (p_document_id, v_uid, v_token_hash, null, null, 0, null)
  returning id into v_link_id;

  -- auditoría (si tu audit_log existe)
  insert into public.audit_log(actor_id, action, object_type, object_id, metadata)
  values (v_uid, 'public_link_created', 'share_link', v_link_id, jsonb_build_object('document_id', p_document_id));

  -- retorna el token (NO el hash)
  return v_token;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_share_link(p_document_id uuid, p_expires_in_minutes integer, p_max_uses integer)
 RETURNS TABLE(link_id uuid, token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
  v_link_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_document_id IS NULL THEN
    RAISE EXCEPTION 'document_id is required';
  END IF;

  IF p_expires_in_minutes IS NULL OR p_expires_in_minutes < 1 THEN
    RAISE EXCEPTION 'expires_in_minutes must be >= 1';
  END IF;

  IF p_max_uses IS NULL OR p_max_uses < 1 THEN
    RAISE EXCEPTION 'max_uses must be >= 1';
  END IF;

  -- token aleatorio (32 bytes => hex largo)
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- hash en hex (para guardarlo como text)
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  v_expires_at := now() + make_interval(mins => p_expires_in_minutes);

  INSERT INTO public.share_links (
    document_id,
    created_by,
    token_hash,
    expires_at,
    max_uses,
    uses_count,
    revoked_at,
    created_at
  )
  VALUES (
    p_document_id,
    auth.uid(),
    v_token_hash,
    v_expires_at,
    p_max_uses,
    0,
    NULL,
    now()
  )
  RETURNING id INTO v_link_id;

  link_id := v_link_id;
  token := v_token;
  expires_at := v_expires_at;
  RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_public_link_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
declare
  v_token text;
begin
  if (new.classification = 'public') then
    select token into v_token
    from public.public_document_links
    where document_id = new.id;

    if v_token is null then
      v_token := encode(gen_random_bytes(24), 'hex');

      insert into public.public_document_links(document_id, token, created_by)
      values (new.id, v_token, new.owner_id)
      on conflict (document_id) do nothing;
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.finalize_document_version(p_version_id uuid, p_size_bytes bigint, p_sha256 text DEFAULT NULL::text, p_mime_type text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid;
  v_doc_id uuid;
  v_path text;
  v_mime text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'not authenticated'; end if;

  select document_id, storage_path, mime_type
    into v_doc_id, v_path, v_mime
  from public.document_versions
  where id = p_version_id;

  if v_doc_id is null then raise exception 'invalid version'; end if;
  if not public.can_access_document(v_uid, v_doc_id, 'upload') then raise exception 'not allowed'; end if;

  -- Revalida PDF por lo guardado
  if lower(v_mime) <> 'application/pdf' then
    raise exception 'only PDF versions can be finalized';
  end if;

  -- (Opcional) revalida por el parámetro si lo mandas
  if p_mime_type is not null and lower(p_mime_type) <> 'application/pdf' then
    raise exception 'only PDF files are allowed';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'documents'
      and name = v_path
  ) then
    raise exception 'file not uploaded to storage yet';
  end if;

  -- Usa tu columna real: en tu esquema es size_bytes
  update public.document_versions
  set size_bytes = p_size_bytes,
      sha256 = p_sha256,
      mime_type = 'application/pdf'
  where id = p_version_id;

  insert into public.audit_log(actor_id, action, object_type, object_id, metadata)
  values (
    v_uid,
    'document_version_finalized',
    'document',
    v_doc_id,
    jsonb_build_object('version_id', p_version_id, 'path', v_path, 'size_bytes', p_size_bytes)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.has_document_access(p_document_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.document_grants g
    where g.document_id = p_document_id
      and g.grantee_id = auth.uid()
      and g.revoked_at is null
      and g.can_view = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_document_owner(p_document_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists (
    select 1
    from public.documents d
    where d.id = p_document_id
      and d.owner_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_security_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists(
    select 1 from public.profiles p
    where p.id = uid and p.role = 'security_admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.list_document_grants(p_document_id uuid)
 RETURNS TABLE(grantee_id uuid, grantee_email text, can_view boolean, can_download boolean, can_edit boolean, can_share boolean, revoked_at timestamp with time zone, granted_via_link_id uuid, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    g.grantee_id,
    p.email as grantee_email,
    g.can_view, g.can_download, g.can_edit, g.can_share,
    g.revoked_at,
    g.granted_via_link_id,
    g.created_at
  from public.document_grants g
  join public.profiles p on p.id = g.grantee_id
  where g.document_id = p_document_id
    and public.can_access_document(auth.uid(), p_document_id, 'share'::public.doc_action);
$function$
;

CREATE OR REPLACE FUNCTION public.list_share_link_recipients(p_link_id uuid)
 RETURNS TABLE(recipient_email text, recipient_user_id uuid, can_view boolean, can_download boolean, can_edit boolean, can_share boolean, max_uses integer, uses_count integer, revoked_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    r.recipient_email,
    r.recipient_user_id,
    r.can_view, r.can_download, r.can_edit, r.can_share,
    r.max_uses, r.uses_count,
    r.revoked_at,
    r.created_at
  from public.share_link_recipients r
  join public.share_links l on l.id = r.link_id
  where r.link_id = p_link_id
    and (
      l.created_by = auth.uid()
      or public.can_access_document(auth.uid(), l.document_id, 'share'::public.doc_action)
    );
$function$
;

CREATE OR REPLACE FUNCTION public.list_share_links(p_document_id uuid)
 RETURNS TABLE(link_id uuid, expires_at timestamp with time zone, max_uses integer, uses_count integer, revoked_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    l.id as link_id,
    l.expires_at,
    l.max_uses,
    l.uses_count,
    l.revoked_at,
    l.created_at
  from public.share_links l
  where l.document_id = p_document_id
    and public.can_access_document(auth.uid(), p_document_id, 'share'::public.doc_action);
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_all_document_access(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'not authenticated'; end if;

  if not public.can_access_document(v_uid, p_document_id, 'share') then
    raise exception 'not allowed';
  end if;

  update public.document_grants
  set revoked_at = now()
  where document_id = p_document_id
    and revoked_at is null;

  update public.share_links
  set revoked_at = now()
  where document_id = p_document_id
    and revoked_at is null;

  update public.share_link_recipients
  set revoked_at = now()
  where link_id in (select id from public.share_links where document_id = p_document_id);

  perform public.audit_event('document_access_revoked_all','document',p_document_id,'{}'::jsonb);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_document_grant(p_document_id uuid, p_grantee_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'not authenticated'; end if;

  if not public.can_access_document(v_uid, p_document_id, 'share') then
    raise exception 'not allowed';
  end if;

  update public.document_grants
  set revoked_at = now()
  where document_id = p_document_id
    and grantee_id = p_grantee_id
    and revoked_at is null;

  perform public.audit_event('document_grant_revoked','document',p_document_id,
    jsonb_build_object('grantee_id', p_grantee_id));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_share_link(p_link_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid;
  v_link record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_link
  from public.share_links
  where id = p_link_id;

  if not found then
    raise exception 'invalid link';
  end if;

  -- Solo owner o quien tenga permiso 'share' sobre el documento
  if not public.can_access_document(v_uid, v_link.document_id, 'share') then
    raise exception 'not allowed';
  end if;

  update public.share_links
  set revoked_at = now()
  where id = p_link_id
    and revoked_at is null;

  -- Revoca grants creados vía ese link (opcional pero recomendado)
  update public.document_grants
  set revoked_at = now()
  where granted_via_link_id = p_link_id
    and revoked_at is null;

  -- Revoca recipients del link (opcional)
  update public.share_link_recipients
  set revoked_at = now()
  where link_id = p_link_id
    and revoked_at is null;

  -- Auditoría
  insert into public.audit_log(actor_id, action, object_type, object_id, metadata)
  values (v_uid, 'share_link_revoked', 'share_link', p_link_id, '{}'::jsonb);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_share_link_recipient_v2(p_recipient_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
declare
  v_uid uuid;
  v_rec record;
  v_link record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_rec
  from public.share_link_recipients
  where id = p_recipient_id;

  if not found then
    raise exception 'invalid recipient';
  end if;

  select *
  into v_link
  from public.share_links
  where id = v_rec.link_id;

  if not found then
    raise exception 'invalid link';
  end if;

  if not public.can_access_document(v_uid, v_link.document_id, 'share'::doc_action) then
    raise exception 'not allowed';
  end if;

  update public.share_link_recipients
  set revoked_at = now()
  where id = p_recipient_id
    and revoked_at is null;

  insert into public.audit_log(occurred_at, actor_id, action, object_type, object_id, metadata)
  values (now(), v_uid, 'share_link_recipient_revoked_v2', 'share_link_recipient', p_recipient_id, '{}'::jsonb);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_share_link_v2(p_link_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
declare
  v_uid uuid;
  v_link record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_link
  from public.share_links
  where id = p_link_id;

  if not found then
    raise exception 'invalid link';
  end if;

  -- Solo owner o quien tenga permiso share sobre el documento
  if not public.can_access_document(v_uid, v_link.document_id, 'share'::doc_action) then
    raise exception 'not allowed';
  end if;

  update public.share_links
  set revoked_at = now()
  where id = p_link_id
    and revoked_at is null;

  update public.document_grants
  set revoked_at = now()
  where granted_via_link_id = p_link_id
    and revoked_at is null;

  update public.share_link_recipients
  set revoked_at = now()
  where link_id = p_link_id
    and revoked_at is null;

  insert into public.audit_log(occurred_at, actor_id, action, object_type, object_id, metadata)
  values (now(), v_uid, 'share_link_revoked_v2', 'share_link', p_link_id, '{}'::jsonb);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_user_access_everywhere(p_target_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- solo admin (ajusta si tienes role)
  if not exists (select 1 from public.profiles where id = v_uid and role = 'admin') then
    raise exception 'admin only';
  end if;

  update public.document_grants
  set revoked_at = now()
  where grantee_id = p_target_user
    and revoked_at is null;

  update public.share_link_recipients
  set revoked_at = now()
  where recipient_user_id = p_target_user
    and revoked_at is null;

  perform public.audit_event('user_access_revoked_everywhere','profile',p_target_user,'{}'::jsonb);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_owner_id_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_restricted_password_v2(p_document_id uuid, p_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
declare
  v_uid uuid;
  v_doc record;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'not authenticated'; end if;

  select id, owner_id, classification into v_doc
  from public.documents
  where id = p_document_id;

  if not found then raise exception 'document not found'; end if;
  if v_doc.owner_id <> v_uid then raise exception 'not owner'; end if;
  if v_doc.classification <> 'restricted' then raise exception 'not restricted'; end if;

  insert into public.restricted_document_passwords(document_id, password_hash, created_by)
  values (p_document_id, crypt(p_password, gen_salt('bf')), v_uid)
  on conflict (document_id)
  do update set password_hash = excluded.password_hash, created_by = excluded.created_by, created_at = now();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_document(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id
      and d.owner_id = v_uid
      and d.is_deleted = false
  ) then
    raise exception 'not allowed';
  end if;

  update public.documents
  set is_deleted = true
  where id = p_document_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.storage_object_doc_id(object_name text)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
with c as (
  select
    case
      when split_part(object_name,'/',1) = 'documents'
        then split_part(object_name,'/',2)
      else split_part(object_name,'/',1)
    end as candidate
)
select case
  when candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then candidate::uuid
  else null
end
from c;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_action text;
  v_object_type text := tg_table_name;
  v_object_id uuid := null;

  v_new jsonb := null;
  v_old jsonb := null;

  v_id_text text := null;
begin
  -- Arma JSON de filas (con redacción)
  if tg_op in ('INSERT','UPDATE') then
    v_new := to_jsonb(new);
  end if;
  if tg_op in ('UPDATE','DELETE') then
    v_old := to_jsonb(old);
  end if;

  -- Redactar token_hash en logs
  if tg_table_name = 'share_links' then
    if v_new is not null then v_new := v_new - 'token_hash'; end if;
    if v_old is not null then v_old := v_old - 'token_hash'; end if;
  end if;

  -- Acción base
  v_action := lower(tg_table_name) || '.' || lower(tg_op);

  -- Acciones “semánticas” útiles
  if tg_table_name = 'documents' and tg_op = 'UPDATE' then
    if coalesce((v_old->>'is_deleted')::boolean,false) = false
       and coalesce((v_new->>'is_deleted')::boolean,false) = true then
      v_action := 'documents.soft_delete';
    end if;
  end if;

  if tg_table_name = 'share_links' and tg_op = 'UPDATE' then
    if (v_old->>'revoked_at') is null and (v_new->>'revoked_at') is not null then
      v_action := 'share_links.revoke';
    end if;
  end if;

  if tg_table_name = 'share_link_recipients' and tg_op = 'UPDATE' then
    if (v_old->>'revoked_at') is null and (v_new->>'revoked_at') is not null then
      v_action := 'share_link_recipients.revoke';
    end if;
  end if;

  -- object_id:
  -- 1) si existe "id" en el row JSON -> úsalo
  if tg_op in ('INSERT','UPDATE') then
    v_id_text := v_new->>'id';
  else
    v_id_text := v_old->>'id';
  end if;

  if v_id_text is not null then
    v_object_id := v_id_text::uuid;
  end if;

  -- 2) si no hay id (tablas con PK compuesta), usamos un id “representativo”
  if v_object_id is null and tg_table_name = 'document_grants' then
    v_object_id := coalesce((v_new->>'document_id')::uuid, (v_old->>'document_id')::uuid);
  end if;

  if v_object_id is null and tg_table_name = 'share_link_allowlist' then
    v_object_id := coalesce((v_new->>'link_id')::uuid, (v_old->>'link_id')::uuid);
  end if;

  insert into public.audit_log(actor_id, action, object_type, object_id, metadata)
  values (
    v_actor,
    v_action,
    v_object_type,
    v_object_id,
    jsonb_build_object(
      'table', tg_table_name,
      'op', tg_op,
      'old', v_old,
      'new', v_new
    )
  );

  return null;

exception when others then
  -- no bloquear operación principal por fallas de auditoría
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_document_metadata(p_document_id uuid, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_classification public.doc_classification DEFAULT NULL::public.doc_classification)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id
      and d.owner_id = v_uid
      and d.is_deleted = false
  ) then
    raise exception 'not allowed';
  end if;

  update public.documents d
  set
    title = coalesce(p_title, d.title),
    description = coalesce(p_description, d.description),
    classification = coalesce(p_classification, d.classification)
  where d.id = p_document_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_document_grant(p_document_id uuid, p_grantee_id uuid, p_can_view boolean DEFAULT true, p_can_download boolean DEFAULT false, p_can_edit boolean DEFAULT false, p_can_share boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_doc public.documents;
  v_grantee public.profiles;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_doc
  from public.documents
  where id = p_document_id and is_deleted = false;

  if not found then
    raise exception 'document not found';
  end if;

  -- quien otorga debe poder "share"
  if not public.can_access_document(v_uid, p_document_id, 'share'::public.doc_action) then
    raise exception 'not allowed';
  end if;

  select * into v_grantee
  from public.profiles
  where id = p_grantee_id;

  if not found then
    raise exception 'grantee not found';
  end if;

  -- gate de dominio (mismo dominio)
  if v_grantee.domain <> v_doc.domain then
    raise exception 'domain mismatch';
  end if;

  insert into public.document_grants(
    document_id, grantee_id, can_view, can_download, can_edit, can_share, granted_by, revoked_at
  )
  values (
    p_document_id, p_grantee_id, p_can_view, p_can_download, p_can_edit, p_can_share, v_uid, null
  )
  on conflict (document_id, grantee_id) do update set
    can_view = excluded.can_view,
    can_download = excluded.can_download,
    can_edit = excluded.can_edit,
    can_share = excluded.can_share,
    revoked_at = null,
    granted_via_link_id = null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_share_link_recipient(p_link_id uuid, p_recipient_email text, p_can_view boolean, p_can_download boolean, p_can_edit boolean, p_can_share boolean, p_max_uses integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_email := lower(trim(p_recipient_email));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'recipient_email is required';
  END IF;

  IF p_max_uses IS NULL OR p_max_uses < 1 THEN
    RAISE EXCEPTION 'max_uses must be >= 1';
  END IF;

  INSERT INTO public.share_link_recipients(
    link_id,
    recipient_email,
    recipient_user_id,
    can_view,
    can_download,
    can_edit,
    can_share,
    max_uses,
    uses_count,
    revoked_at,
    created_at
  )
  VALUES (
    p_link_id,
    v_email,
    NULL,
    COALESCE(p_can_view, false),
    COALESCE(p_can_download, false),
    COALESCE(p_can_edit, false),
    COALESCE(p_can_share, false),
    p_max_uses,
    0,
    NULL,
    now()
  )
  ON CONFLICT (link_id, recipient_email)
  DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_download = EXCLUDED.can_download,
    can_edit = EXCLUDED.can_edit,
    can_share = EXCLUDED.can_share,
    max_uses = EXCLUDED.max_uses,
    revoked_at = NULL
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_restricted_password_v2(p_document_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
declare
  v_uid uuid;
  v_doc record;
  v_hash text;
begin
  v_uid := auth.uid();
  if v_uid is null then return false; end if;

  select id, owner_id, classification into v_doc
  from public.documents
  where id = p_document_id;

  if not found then return false; end if;
  if v_doc.owner_id <> v_uid then return false; end if;
  if v_doc.classification <> 'restricted' then return false; end if;

  select password_hash into v_hash
  from public.restricted_document_passwords
  where document_id = p_document_id;

  if v_hash is null then return false; end if;

  return (crypt(p_password, v_hash) = v_hash);
end;
$function$
;

grant delete on table "public"."audit_log" to "anon";

grant references on table "public"."audit_log" to "anon";

grant select on table "public"."audit_log" to "anon";

grant trigger on table "public"."audit_log" to "anon";

grant truncate on table "public"."audit_log" to "anon";

grant update on table "public"."audit_log" to "anon";

grant delete on table "public"."audit_log" to "authenticated";

grant references on table "public"."audit_log" to "authenticated";

grant select on table "public"."audit_log" to "authenticated";

grant trigger on table "public"."audit_log" to "authenticated";

grant truncate on table "public"."audit_log" to "authenticated";

grant update on table "public"."audit_log" to "authenticated";

grant delete on table "public"."audit_log" to "service_role";

grant insert on table "public"."audit_log" to "service_role";

grant references on table "public"."audit_log" to "service_role";

grant select on table "public"."audit_log" to "service_role";

grant trigger on table "public"."audit_log" to "service_role";

grant truncate on table "public"."audit_log" to "service_role";

grant update on table "public"."audit_log" to "service_role";

grant delete on table "public"."document_grants" to "anon";

grant insert on table "public"."document_grants" to "anon";

grant references on table "public"."document_grants" to "anon";

grant select on table "public"."document_grants" to "anon";

grant trigger on table "public"."document_grants" to "anon";

grant truncate on table "public"."document_grants" to "anon";

grant update on table "public"."document_grants" to "anon";

grant delete on table "public"."document_grants" to "authenticated";

grant insert on table "public"."document_grants" to "authenticated";

grant references on table "public"."document_grants" to "authenticated";

grant select on table "public"."document_grants" to "authenticated";

grant trigger on table "public"."document_grants" to "authenticated";

grant truncate on table "public"."document_grants" to "authenticated";

grant update on table "public"."document_grants" to "authenticated";

grant delete on table "public"."document_grants" to "service_role";

grant insert on table "public"."document_grants" to "service_role";

grant references on table "public"."document_grants" to "service_role";

grant select on table "public"."document_grants" to "service_role";

grant trigger on table "public"."document_grants" to "service_role";

grant truncate on table "public"."document_grants" to "service_role";

grant update on table "public"."document_grants" to "service_role";

grant delete on table "public"."document_versions" to "anon";

grant insert on table "public"."document_versions" to "anon";

grant references on table "public"."document_versions" to "anon";

grant select on table "public"."document_versions" to "anon";

grant trigger on table "public"."document_versions" to "anon";

grant truncate on table "public"."document_versions" to "anon";

grant update on table "public"."document_versions" to "anon";

grant delete on table "public"."document_versions" to "authenticated";

grant insert on table "public"."document_versions" to "authenticated";

grant references on table "public"."document_versions" to "authenticated";

grant select on table "public"."document_versions" to "authenticated";

grant trigger on table "public"."document_versions" to "authenticated";

grant truncate on table "public"."document_versions" to "authenticated";

grant update on table "public"."document_versions" to "authenticated";

grant delete on table "public"."document_versions" to "service_role";

grant insert on table "public"."document_versions" to "service_role";

grant references on table "public"."document_versions" to "service_role";

grant select on table "public"."document_versions" to "service_role";

grant trigger on table "public"."document_versions" to "service_role";

grant truncate on table "public"."document_versions" to "service_role";

grant update on table "public"."document_versions" to "service_role";

grant delete on table "public"."documents" to "anon";

grant insert on table "public"."documents" to "anon";

grant references on table "public"."documents" to "anon";

grant select on table "public"."documents" to "anon";

grant trigger on table "public"."documents" to "anon";

grant truncate on table "public"."documents" to "anon";

grant update on table "public"."documents" to "anon";

grant delete on table "public"."documents" to "authenticated";

grant insert on table "public"."documents" to "authenticated";

grant references on table "public"."documents" to "authenticated";

grant select on table "public"."documents" to "authenticated";

grant trigger on table "public"."documents" to "authenticated";

grant truncate on table "public"."documents" to "authenticated";

grant update on table "public"."documents" to "authenticated";

grant delete on table "public"."documents" to "service_role";

grant insert on table "public"."documents" to "service_role";

grant references on table "public"."documents" to "service_role";

grant select on table "public"."documents" to "service_role";

grant trigger on table "public"."documents" to "service_role";

grant truncate on table "public"."documents" to "service_role";

grant update on table "public"."documents" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."public_document_links" to "anon";

grant insert on table "public"."public_document_links" to "anon";

grant references on table "public"."public_document_links" to "anon";

grant select on table "public"."public_document_links" to "anon";

grant trigger on table "public"."public_document_links" to "anon";

grant truncate on table "public"."public_document_links" to "anon";

grant update on table "public"."public_document_links" to "anon";

grant delete on table "public"."public_document_links" to "authenticated";

grant insert on table "public"."public_document_links" to "authenticated";

grant references on table "public"."public_document_links" to "authenticated";

grant select on table "public"."public_document_links" to "authenticated";

grant trigger on table "public"."public_document_links" to "authenticated";

grant truncate on table "public"."public_document_links" to "authenticated";

grant update on table "public"."public_document_links" to "authenticated";

grant delete on table "public"."public_document_links" to "service_role";

grant insert on table "public"."public_document_links" to "service_role";

grant references on table "public"."public_document_links" to "service_role";

grant select on table "public"."public_document_links" to "service_role";

grant trigger on table "public"."public_document_links" to "service_role";

grant truncate on table "public"."public_document_links" to "service_role";

grant update on table "public"."public_document_links" to "service_role";

grant delete on table "public"."restricted_document_passwords" to "anon";

grant insert on table "public"."restricted_document_passwords" to "anon";

grant references on table "public"."restricted_document_passwords" to "anon";

grant select on table "public"."restricted_document_passwords" to "anon";

grant trigger on table "public"."restricted_document_passwords" to "anon";

grant truncate on table "public"."restricted_document_passwords" to "anon";

grant update on table "public"."restricted_document_passwords" to "anon";

grant delete on table "public"."restricted_document_passwords" to "authenticated";

grant insert on table "public"."restricted_document_passwords" to "authenticated";

grant references on table "public"."restricted_document_passwords" to "authenticated";

grant select on table "public"."restricted_document_passwords" to "authenticated";

grant trigger on table "public"."restricted_document_passwords" to "authenticated";

grant truncate on table "public"."restricted_document_passwords" to "authenticated";

grant update on table "public"."restricted_document_passwords" to "authenticated";

grant delete on table "public"."restricted_document_passwords" to "service_role";

grant insert on table "public"."restricted_document_passwords" to "service_role";

grant references on table "public"."restricted_document_passwords" to "service_role";

grant select on table "public"."restricted_document_passwords" to "service_role";

grant trigger on table "public"."restricted_document_passwords" to "service_role";

grant truncate on table "public"."restricted_document_passwords" to "service_role";

grant update on table "public"."restricted_document_passwords" to "service_role";

grant delete on table "public"."share_link_allowlist" to "anon";

grant insert on table "public"."share_link_allowlist" to "anon";

grant references on table "public"."share_link_allowlist" to "anon";

grant select on table "public"."share_link_allowlist" to "anon";

grant trigger on table "public"."share_link_allowlist" to "anon";

grant truncate on table "public"."share_link_allowlist" to "anon";

grant update on table "public"."share_link_allowlist" to "anon";

grant delete on table "public"."share_link_allowlist" to "authenticated";

grant insert on table "public"."share_link_allowlist" to "authenticated";

grant references on table "public"."share_link_allowlist" to "authenticated";

grant select on table "public"."share_link_allowlist" to "authenticated";

grant trigger on table "public"."share_link_allowlist" to "authenticated";

grant truncate on table "public"."share_link_allowlist" to "authenticated";

grant update on table "public"."share_link_allowlist" to "authenticated";

grant delete on table "public"."share_link_allowlist" to "service_role";

grant insert on table "public"."share_link_allowlist" to "service_role";

grant references on table "public"."share_link_allowlist" to "service_role";

grant select on table "public"."share_link_allowlist" to "service_role";

grant trigger on table "public"."share_link_allowlist" to "service_role";

grant truncate on table "public"."share_link_allowlist" to "service_role";

grant update on table "public"."share_link_allowlist" to "service_role";

grant delete on table "public"."share_link_recipients" to "anon";

grant insert on table "public"."share_link_recipients" to "anon";

grant references on table "public"."share_link_recipients" to "anon";

grant select on table "public"."share_link_recipients" to "anon";

grant trigger on table "public"."share_link_recipients" to "anon";

grant truncate on table "public"."share_link_recipients" to "anon";

grant update on table "public"."share_link_recipients" to "anon";

grant delete on table "public"."share_link_recipients" to "authenticated";

grant insert on table "public"."share_link_recipients" to "authenticated";

grant references on table "public"."share_link_recipients" to "authenticated";

grant select on table "public"."share_link_recipients" to "authenticated";

grant trigger on table "public"."share_link_recipients" to "authenticated";

grant truncate on table "public"."share_link_recipients" to "authenticated";

grant update on table "public"."share_link_recipients" to "authenticated";

grant delete on table "public"."share_link_recipients" to "service_role";

grant insert on table "public"."share_link_recipients" to "service_role";

grant references on table "public"."share_link_recipients" to "service_role";

grant select on table "public"."share_link_recipients" to "service_role";

grant trigger on table "public"."share_link_recipients" to "service_role";

grant truncate on table "public"."share_link_recipients" to "service_role";

grant update on table "public"."share_link_recipients" to "service_role";

grant delete on table "public"."share_links" to "anon";

grant insert on table "public"."share_links" to "anon";

grant references on table "public"."share_links" to "anon";

grant select on table "public"."share_links" to "anon";

grant trigger on table "public"."share_links" to "anon";

grant truncate on table "public"."share_links" to "anon";

grant update on table "public"."share_links" to "anon";

grant delete on table "public"."share_links" to "authenticated";

grant insert on table "public"."share_links" to "authenticated";

grant references on table "public"."share_links" to "authenticated";

grant select on table "public"."share_links" to "authenticated";

grant trigger on table "public"."share_links" to "authenticated";

grant truncate on table "public"."share_links" to "authenticated";

grant update on table "public"."share_links" to "authenticated";

grant delete on table "public"."share_links" to "service_role";

grant insert on table "public"."share_links" to "service_role";

grant references on table "public"."share_links" to "service_role";

grant select on table "public"."share_links" to "service_role";

grant trigger on table "public"."share_links" to "service_role";

grant truncate on table "public"."share_links" to "service_role";

grant update on table "public"."share_links" to "service_role";


  create policy "audit_select"
  on "public"."audit_log"
  as permissive
  for select
  to authenticated
using (((actor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::public.app_role))))));



  create policy "grants_owner_manage"
  on "public"."document_grants"
  as permissive
  for all
  to authenticated
using (public.is_document_owner(document_id))
with check (public.is_document_owner(document_id));



  create policy "grants_select_grantee"
  on "public"."document_grants"
  as permissive
  for select
  to authenticated
using (((grantee_id = auth.uid()) AND (revoked_at IS NULL) AND ((expires_at IS NULL) OR (expires_at > now()))));



  create policy "document_versions_insert"
  on "public"."document_versions"
  as permissive
  for insert
  to authenticated
with check (((created_by = auth.uid()) AND public.can_access_document(auth.uid(), document_id, 'upload'::public.doc_action)));



  create policy "document_versions_select"
  on "public"."document_versions"
  as permissive
  for select
  to authenticated
using (public.can_access_document(auth.uid(), document_id, 'view'::public.doc_action));



  create policy "document_versions_update"
  on "public"."document_versions"
  as permissive
  for update
  to authenticated
using (((created_by = auth.uid()) AND public.can_access_document(auth.uid(), document_id, 'upload'::public.doc_action)))
with check (((created_by = auth.uid()) AND public.can_access_document(auth.uid(), document_id, 'upload'::public.doc_action)));



  create policy "documents_delete_own"
  on "public"."documents"
  as permissive
  for delete
  to authenticated
using ((owner_id = auth.uid()));



  create policy "documents_insert"
  on "public"."documents"
  as permissive
  for insert
  to authenticated
with check ((owner_id = auth.uid()));



  create policy "documents_insert_own"
  on "public"."documents"
  as permissive
  for insert
  to authenticated
with check ((owner_id = auth.uid()));



  create policy "documents_select_safe"
  on "public"."documents"
  as permissive
  for select
  to authenticated
using (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.document_grants g
  WHERE ((g.document_id = documents.id) AND (g.grantee_id = auth.uid()) AND (g.revoked_at IS NULL) AND (g.can_view = true))))));



  create policy "documents_update"
  on "public"."documents"
  as permissive
  for update
  to authenticated
using ((owner_id = auth.uid()))
with check ((owner_id = auth.uid()));



  create policy "documents_update_own"
  on "public"."documents"
  as permissive
  for update
  to authenticated
using ((owner_id = auth.uid()))
with check ((owner_id = auth.uid()));



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)));



  create policy "profiles_update"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using (((id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::public.app_role))))))
with check (((id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::public.app_role))))));



  create policy "users_can_read_all_profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "pdl_owner_select_v2"
  on "public"."public_document_links"
  as permissive
  for select
  to authenticated
using ((created_by = auth.uid()));



  create policy "rdp_owner_select_v2"
  on "public"."restricted_document_passwords"
  as permissive
  for select
  to authenticated
using ((created_by = auth.uid()));



  create policy "rdp_owner_upsert_v2"
  on "public"."restricted_document_passwords"
  as permissive
  for insert
  to authenticated
with check ((created_by = auth.uid()));



  create policy "share_link_allowlist_select"
  on "public"."share_link_allowlist"
  as permissive
  for select
  to authenticated
using ((allowed_user_id = auth.uid()));



  create policy "slr_owner_revoke_update_v2"
  on "public"."share_link_recipients"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.share_links sl
  WHERE ((sl.id = share_link_recipients.link_id) AND (sl.created_by = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.share_links sl
  WHERE ((sl.id = share_link_recipients.link_id) AND (sl.created_by = auth.uid())))));



  create policy "slr_owner_select"
  on "public"."share_link_recipients"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.share_links sl
  WHERE ((sl.id = share_link_recipients.link_id) AND (sl.created_by = auth.uid())))));



  create policy "slr_select"
  on "public"."share_link_recipients"
  as permissive
  for select
  to authenticated
using ((recipient_user_id = auth.uid()));



  create policy "share_links_insert"
  on "public"."share_links"
  as permissive
  for insert
  to authenticated
with check (((created_by = auth.uid()) AND public.can_access_document(auth.uid(), document_id, 'share'::public.doc_action)));



  create policy "share_links_select"
  on "public"."share_links"
  as permissive
  for select
  to authenticated
using ((created_by = auth.uid()));



  create policy "share_links_update_revoke"
  on "public"."share_links"
  as permissive
  for update
  to authenticated
using (public.can_access_document(auth.uid(), document_id, 'share'::public.doc_action))
with check (public.can_access_document(auth.uid(), document_id, 'share'::public.doc_action));


CREATE TRIGGER audit_document_grants AFTER INSERT OR DELETE OR UPDATE ON public.document_grants FOR EACH ROW EXECUTE FUNCTION public.tg_audit_log();

CREATE TRIGGER audit_document_versions AFTER INSERT OR DELETE OR UPDATE ON public.document_versions FOR EACH ROW EXECUTE FUNCTION public.tg_audit_log();

CREATE TRIGGER audit_documents AFTER INSERT OR DELETE OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.tg_audit_log();

CREATE TRIGGER trg_documents_public_link_v2 AFTER INSERT OR UPDATE OF classification ON public.documents FOR EACH ROW EXECUTE FUNCTION public.ensure_public_link_v2();

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_set_owner_id_on_insert BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_share_link_allowlist AFTER INSERT OR DELETE OR UPDATE ON public.share_link_allowlist FOR EACH ROW EXECUTE FUNCTION public.tg_audit_log();

CREATE TRIGGER audit_share_link_recipients AFTER INSERT OR DELETE OR UPDATE ON public.share_link_recipients FOR EACH ROW EXECUTE FUNCTION public.tg_audit_log();

CREATE TRIGGER audit_share_links AFTER INSERT OR DELETE OR UPDATE ON public.share_links FOR EACH ROW EXECUTE FUNCTION public.tg_audit_log();

CREATE TRIGGER trg_block_share_restricted_v2 BEFORE INSERT ON public.share_links FOR EACH ROW EXECUTE FUNCTION public.block_share_for_restricted_v2();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "documents_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'documents'::text) AND public.can_access_document(auth.uid(), public.storage_object_doc_id(name), 'upload'::public.doc_action)));



  create policy "documents_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'documents'::text) AND ("right"(lower(name), 4) = '.pdf'::text) AND public.can_access_document(auth.uid(), public.storage_object_doc_id(name), 'upload'::public.doc_action)));



  create policy "documents_read"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'documents'::text) AND public.can_access_document(auth.uid(), public.storage_object_doc_id(name), 'download'::public.doc_action)));



  create policy "grantee can view shared files"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM (public.document_versions dv
     JOIN public.document_grants dg ON ((dg.document_id = dv.document_id)))
  WHERE ((dg.grantee_id = auth.uid()) AND (dg.revoked_at IS NULL) AND (dg.can_view = true) AND (dv.storage_path = objects.name))))));



