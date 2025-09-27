import {
  users,
  transactions,
  wallets,
  type User,
  type UpsertUser,
  type Transaction,
  type InsertTransaction,
  type Wallet,
  type InsertWallet,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Wallet operations
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(userId: string, balance: string): Promise<Wallet>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: string, limit?: number): Promise<Transaction[]>;
  updateTransactionStatus(id: string, status: string, transactionHash?: string): Promise<Transaction>;
  
  // Stats operations
  getUserStats(userId: string): Promise<{
    tipsSent: number;
    tipsReceived: number;
    thisMonth: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Wallet operations
  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet;
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [newWallet] = await db.insert(wallets).values(wallet).returning();
    return newWallet;
  }

  async updateWalletBalance(userId: string, balance: string): Promise<Wallet> {
    const [wallet] = await db
      .update(wallets)
      .set({ balance, updatedAt: new Date() })
      .where(eq(wallets.userId, userId))
      .returning();
    return wallet;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getTransactionsByUser(userId: string, limit = 10): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(or(eq(transactions.fromUserId, userId), eq(transactions.toUserId, userId)))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async updateTransactionStatus(id: string, status: string, transactionHash?: string): Promise<Transaction> {
    const updateData: any = { status };
    if (transactionHash) {
      updateData.transactionHash = transactionHash;
    }
    
    const [transaction] = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  async getUserStats(userId: string): Promise<{
    tipsSent: number;
    tipsReceived: number;
    thisMonth: string;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [sentResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.fromUserId, userId),
        eq(transactions.status, "confirmed")
      ));

    const [receivedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.toUserId, userId),
        eq(transactions.status, "confirmed")
      ));

    const [monthlyResult] = await db
      .select({ total: sql<string>`sum(amount)` })
      .from(transactions)
      .where(and(
        or(eq(transactions.fromUserId, userId), eq(transactions.toUserId, userId)),
        eq(transactions.status, "confirmed"),
        sql`created_at >= ${startOfMonth}`
      ));

    return {
      tipsSent: sentResult?.count || 0,
      tipsReceived: receivedResult?.count || 0,
      thisMonth: monthlyResult?.total || "0",
    };
  }
}

export const storage = new DatabaseStorage();
