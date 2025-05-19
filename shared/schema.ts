import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  token: text("token").notNull().unique(),
  isOnline: boolean("is_online").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  token: true,
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

// Define WebSocket event types
export enum WSEventType {
  AUTH = "auth",
  MESSAGE = "message",
  USER_CONNECTED = "user_connected",
  USER_DISCONNECTED = "user_disconnected",
  ERROR = "error",
}

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

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
