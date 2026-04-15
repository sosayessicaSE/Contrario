CREATE TYPE "public"."ai_summary_status" AS ENUM('draft', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."note_visibility" AS ENUM('org', 'private', 'shared');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "ai_note_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"status" "ai_summary_status" DEFAULT 'draft' NOT NULL,
	"model" text NOT NULL,
	"output_json" jsonb NOT NULL,
	"input_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"note_id" uuid,
	"storage_object_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"status" "file_status" DEFAULT 'pending' NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_shares" (
	"note_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "note_shares_note_id_user_id_pk" PRIMARY KEY("note_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "note_tags" (
	"note_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "note_tags_note_id_tag_id_pk" PRIMARY KEY("note_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "note_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"edited_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"visibility_snapshot" "note_visibility" NOT NULL,
	"tags_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"visibility" "note_visibility" DEFAULT 'org' NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search_vector" "tsvector" DEFAULT to_tsvector('english', '') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_memberships" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_memberships_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_note_summaries" ADD CONSTRAINT "ai_note_summaries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_note_summaries" ADD CONSTRAINT "ai_note_summaries_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_note_summaries_note_created_idx" ON "ai_note_summaries" USING btree ("note_id","created_at");--> statement-breakpoint
CREATE INDEX "files_org_note_idx" ON "files" USING btree ("org_id","note_id");--> statement-breakpoint
CREATE INDEX "note_shares_user_idx" ON "note_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "note_versions_note_created_idx" ON "note_versions" USING btree ("note_id","created_at");--> statement-breakpoint
CREATE INDEX "notes_org_updated_idx" ON "notes" USING btree ("org_id","updated_at");--> statement-breakpoint
CREATE INDEX "notes_search_vector_gin" ON "notes" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "org_memberships_user_idx" ON "org_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uidx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_org_name_uidx" ON "tags" USING btree ("org_id","name");--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.refresh_note_search_vector(p_note_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  tag_text text;
  ntitle text;
  nbody text;
BEGIN
  SELECT coalesce(title, ''), coalesce(body, '')
  INTO ntitle, nbody
  FROM notes
  WHERE id = p_note_id;

  SELECT coalesce(string_agg(t.name, ' '), '')
  INTO tag_text
  FROM note_tags nt
  JOIN tags t ON t.id = nt.tag_id
  WHERE nt.note_id = p_note_id;

  UPDATE notes
  SET search_vector = to_tsvector(
    'english',
    coalesce(ntitle, '') || ' ' || coalesce(nbody, '') || ' ' || coalesce(tag_text, '')
  )
  WHERE id = p_note_id;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.notes_search_vector_from_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_note_search_vector(NEW.id);
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER notes_search_vector_aiu
AFTER INSERT OR UPDATE OF title, body ON notes
FOR EACH ROW
EXECUTE PROCEDURE public.notes_search_vector_from_row();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.note_tags_refresh_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  nid uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    nid := OLD.note_id;
  ELSE
    nid := NEW.note_id;
  END IF;
  PERFORM public.refresh_note_search_vector(nid);
  IF (TG_OP = 'UPDATE' AND OLD.note_id IS DISTINCT FROM NEW.note_id) THEN
    PERFORM public.refresh_note_search_vector(OLD.note_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint
CREATE TRIGGER note_tags_search_vector_aiud
AFTER INSERT OR DELETE OR UPDATE ON note_tags
FOR EACH ROW
EXECUTE PROCEDURE public.note_tags_refresh_search_vector();