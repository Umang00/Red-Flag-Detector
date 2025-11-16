import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Users table (extends NextAuth defaults)
export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull().unique(),
  emailVerified: timestamp("emailVerified"),
  name: text("name"),
  image: text("image"),
  password: varchar("password", { length: 64 }), // For email/password authentication (hashed with bcryptjs)
  verificationToken: text("verificationToken"), // For email verification
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

// Accounts table (for OAuth providers)
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

// Conversations table (renamed from Chat, with category and red flag score)
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

// Messages table (with red flag data)
export const message = pgTable(
  "Message",
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
    conversationIdIdx: index("idx_messages_conversation_id").on(table.conversationId),
  })
);

export type Message = InferSelectModel<typeof message>;

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
