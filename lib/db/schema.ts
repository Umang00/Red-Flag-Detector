import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

// ============================================================================
// ORIGINAL AI CHATBOT SCHEMA (KEEP FOR COMPATIBILITY)
// ============================================================================

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  // Red Flag Detector additions
  emailVerified: timestamp("emailVerified"),
  name: text("name"),
  image: text("image"),
  verificationToken: text("verificationToken"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// ============================================================================
// RED FLAG DETECTOR ADDITIONS
// ============================================================================

// Accounts table (for OAuth providers - GitHub, etc.)
export const account = pgTable("Account", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  accessToken: text("accessToken"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Account = InferSelectModel<typeof account>;

// Conversations table (Red Flag Detector specific - with category and red flag score)
export const conversation = pgTable(
  "Conversation",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: varchar("category", {
      enum: ["dating", "conversations", "jobs", "housing", "marketplace", "general"],
    }),
    redFlagScore: real("redFlagScore"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    deletedAt: timestamp("deletedAt"), // Soft delete
  },
  (table) => ({
    userIdIdx: index("idx_conversations_user_id").on(table.userId),
    createdAtIdx: index("idx_conversations_created_at").on(table.createdAt),
  })
);

export type Conversation = InferSelectModel<typeof conversation>;

// Red Flag Detector Messages (separate from AI chatbot messages)
export const redFlagMessage = pgTable(
  "RedFlagMessage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    conversationId: uuid("conversationId")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    role: varchar("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: text("content").notNull(),
    redFlagData: jsonb("redFlagData"), // Structured analysis results
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    deletedAt: timestamp("deletedAt"), // Soft delete
  },
  (table) => ({
    conversationIdIdx: index("idx_red_flag_messages_conversation_id").on(table.conversationId),
  })
);

export type RedFlagMessage = InferSelectModel<typeof redFlagMessage>;

// Uploaded Files table (for Cloudinary tracking)
export const uploadedFile = pgTable(
  "UploadedFile",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    conversationId: uuid("conversationId")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    cloudinaryUrl: text("cloudinaryUrl").notNull(),
    cloudinaryPublicId: text("cloudinaryPublicId").notNull(),
    fileType: text("fileType").notNull(),
    fileSize: integer("fileSize"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    autoDeleteAt: timestamp("autoDeleteAt")
      .notNull()
      .$defaultFn(() => {
        const retentionDays = parseInt(process.env.FILE_RETENTION_DAYS || "7", 10);
        return new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
      }),
    deletedAt: timestamp("deletedAt"), // Soft delete
  },
  (table) => ({
    autoDeleteAtIdx: index("idx_uploaded_files_auto_delete").on(table.autoDeleteAt),
  })
);

export type UploadedFile = InferSelectModel<typeof uploadedFile>;

// Usage Logs table (for rate limiting)
export const usageLog = pgTable(
  "UsageLog",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    analysisCount: integer("analysisCount").notNull().default(1),
    date: timestamp("date", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index("idx_usage_logs_user_date").on(table.userId, table.date),
  })
);

export type UsageLog = InferSelectModel<typeof usageLog>;
