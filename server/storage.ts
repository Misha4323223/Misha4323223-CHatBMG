import { 
  users, type User, type InsertUser, 
  messages, type Message, type InsertMessage,
  suppliers, type Supplier, type InsertSupplier 
} from "@shared/schema";

// Extended storage interface with methods for chat application
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  setUserOnlineStatus(id: number, isOnline: boolean): Promise<User | undefined>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessageById(id: number): Promise<Message | undefined>;
  getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private userIdCounter: number;
  private messageIdCounter: number;
  private conversations: Map<number, any[]>; // Для хранения истории чата по сессиям

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.conversations = new Map();
    this.userIdCounter = 1;
    this.messageIdCounter = 1;
    
    // Initialize with some demo users
    this.createUser({
      username: "Alex Kim",
      token: "valid_token_alex",
    });
    
    this.createUser({
      username: "Maria Johnson",
      token: "valid_token_maria",
    });
    
    this.createUser({
      username: "David Peterson",
      token: "valid_token_david",
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getUserByToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.token === token,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id, isOnline: false };
    this.users.set(id, user);
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (user) {
      const updatedUser = { ...user, isOnline };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }
  
  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const timestamp = new Date();
    const message: Message = { 
      ...insertMessage, 
      id, 
      timestamp, 
      status: "sent" 
    };
    this.messages.set(id, message);
    return message;
  }
  
  async getMessageById(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (message) => 
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
    ).sort((a, b) => {
      // Sort by timestamp
      if (a.timestamp < b.timestamp) return -1;
      if (a.timestamp > b.timestamp) return 1;
      return 0;
    });
  }

  // Методы для работы с контекстом разговора
  async saveMessageToContext(sessionId: number, message: any): Promise<void> {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }
    
    const conversation = this.conversations.get(sessionId)!;
    conversation.push({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    // Оставляем только последние 20 сообщений
    if (conversation.length > 20) {
      conversation.splice(0, conversation.length - 20);
    }
  }

  async getRecentMessages(sessionId: number, limit: number = 5): Promise<any[]> {
    const conversation = this.conversations.get(sessionId);
    if (!conversation || conversation.length === 0) {
      return [];
    }
    
    // Возвращаем последние сообщения
    return conversation.slice(-limit);
  }

  async clearContext(sessionId: number): Promise<void> {
    this.conversations.delete(sessionId);
  }
}

export const storage = new MemStorage();
