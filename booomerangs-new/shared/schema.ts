import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Define User schema для простой авторизации
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  token: text("token").unique(),
  isOnline: boolean("is_online").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

// Define Message schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").notNull().default("sent"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  text: true,
});

// Chat Sessions для сохранения истории чатов с AI
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").default(1), // Убираем внешний ключ для простоты
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Messages для сохранения сообщений с AI
export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id).notNull(),
  content: text("content").notNull(),
  sender: text("sender").notNull(), // 'user' or 'ai'
  provider: text("provider"), // AI provider used
  model: text("model"), // AI model used
  category: text("category"), // message category
  confidence: text("confidence"), // AI confidence score
  imageUrl: text("image_url"), // attached image if any
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});

// Define WebSocket event types
export enum WSEventType {
  AUTH = "auth",
  MESSAGE = "message",
  USER_CONNECTED = "user_connected",
  USER_DISCONNECTED = "user_disconnected",
  ERROR = "error",
}

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chatSessions: many(chatSessions),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  aiMessages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [aiMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
export type AiMessage = typeof aiMessages.$inferSelect;

// Define schemas for API validation
export const authSchema = z.object({
  token: z.string().min(1, "Access token is required"),
});

export const messageSchema = z.object({
  text: z.string().min(1, "Message cannot be empty"),
  receiverId: z.number(),
});

// Define WebSocket message interfaces
export interface WSMessage {
  type: WSEventType;
  payload: any;
}

export interface WSAuthPayload {
  token: string;
}

export interface WSMessagePayload {
  text: string;
  receiverId: number;
}

export interface WSErrorPayload {
  message: string;
}

// Define frontend user interface with additional fields
export interface UserWithInitials extends User {
  initials: string;
}

// For frontend message display
export interface MessageWithSender extends Message {
  sender: UserWithInitials;
  time: string;
}
