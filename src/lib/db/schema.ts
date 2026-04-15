import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  integer,
  primaryKey,
  jsonb,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);
export const noteVisibilityEnum = pgEnum("note_visibility", ["org", "private", "shared"]);
export type NoteVisibility = (typeof noteVisibilityEnum.enumValues)[number];
export const fileStatusEnum = pgEnum("file_status", ["pending", "ready", "failed"]);
export const aiSummaryStatusEnum = pgEnum("ai_summary_status", [
  "draft",
  "accepted",
  "rejected",
]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("organizations_slug_uidx").on(t.slug)],
);

export const orgMemberships = pgTable(
  "org_memberships",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: orgRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.orgId, t.userId] }),
    index("org_memberships_user_idx").on(t.userId),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    visibility: noteVisibilityEnum("visibility").notNull().default("org"),
    createdBy: uuid("created_by").notNull(),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    searchVector: tsvector("search_vector")
      .notNull()
      .default(sql`to_tsvector('english', '')`),
  },
  (t) => [
    index("notes_org_updated_idx").on(t.orgId, t.updatedAt),
    index("notes_search_vector_gin").using("gin", t.searchVector),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("tags_org_name_uidx").on(t.orgId, t.name)],
);

export const noteTags = pgTable(
  "note_tags",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.tagId] })],
);

export const noteShares = pgTable(
  "note_shares",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.noteId, t.userId] }),
    index("note_shares_user_idx").on(t.userId),
  ],
);

export const noteVersions = pgTable(
  "note_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    editedBy: uuid("edited_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    visibilitySnapshot: noteVisibilityEnum("visibility_snapshot").notNull(),
    tagsSnapshot: jsonb("tags_snapshot")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
  },
  (t) => [index("note_versions_note_created_idx").on(t.noteId, t.createdAt)],
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id").references(() => notes.id, { onDelete: "set null" }),
    storageObjectPath: text("storage_object_path").notNull(),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    status: fileStatusEnum("status").notNull().default("pending"),
    uploadedBy: uuid("uploaded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("files_org_note_idx").on(t.orgId, t.noteId)],
);

export const aiNoteSummaries = pgTable(
  "ai_note_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    status: aiSummaryStatusEnum("status").notNull().default("draft"),
    model: text("model").notNull(),
    outputJson: jsonb("output_json").notNull(),
    inputHash: text("input_hash").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ai_note_summaries_note_created_idx").on(t.noteId, t.createdAt)],
);
