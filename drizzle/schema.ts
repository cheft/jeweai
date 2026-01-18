import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    username: text("username"),
    email: text("email"),
    nickname: text("nickname"),
    password: text("password"),
    salt: text("salt"),
    status: integer("status").default(1),
    createdAt: integer("created_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
  }
);

export const folders = sqliteTable("folders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  parentId: text("parent_id"),
  userId: text("user_id"), // explicit reference or just id? User uses `text` in `users` table. I'll add `.references(() => users.id)` if I can, but raw text is also fine if they prefer loose coupling in code. I'll add relations if possible or just fields.
  path: text("path"), // Materialized path for easier tree traversal? User didn't ask, but "Path" was mentioned for assets. For folders, maybe just parentId is enough for now.
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  folderId: text("folder_id"),
  userId: text("user_id"),

  name: text("name"),
  type: text("type"), // 'image', 'video'
  source: text("source"), // 'ai', 'upload'
  fromAssetId: text("from_asset_id"),

  coverPath: text("cover_path"), // cover
  path: text("path"),

  size: integer("size"),
  mimeType: text("mime_type"),

  width: integer("width"),
  height: integer("height"),
  aspectRatio: text("aspect_ratio"),
  duration: integer("duration"),

  prompt: text("prompt"),
  metadata: text("metadata", { mode: "json" }),
  status: text("status").default('unlocked'), // 'locked', 'unlocked'

  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(), // Using taskId from Go or nanoid
  userId: text("user_id"),
  assetId: text("asset_id"),
  prompt: text("prompt"),
  type: text("type"), // 'image', 'video'
  styleId: text("style_id"),
  referenceAssetId: text("reference_asset_id"), // Asset ID
  resultAssetId: text("result_asset_id"), // Asset ID
  status: text("status").default('queued'), // 'queued', 'generating', 'completed', 'failed'

  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  metadata: text("metadata", { mode: "json" }),
});
