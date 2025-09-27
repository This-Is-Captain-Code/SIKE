import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { walletService } from "./services/walletService";
import { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get wallet information
      const wallet = await storage.getWallet(userId);
      const balance = wallet ? await walletService.getBalance(user.walletAddress || '') : '0';

      // Return only safe user data, never expose sensitive fields
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        username: user.username,
        walletAddress: user.walletAddress,
        balance: balance || '0',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
        // NEVER expose walletPrivateKey or other sensitive fields
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create wallet for new user
  app.post('/api/wallet/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.walletAddress) {
        return res.status(400).json({ message: "Wallet already exists" });
      }

      // Create new wallet securely (private key encrypted and stored)
      const walletData = await walletService.createWalletForUser(userId);

      // Create wallet record
      await storage.createWallet({
        userId,
        balance: '0'
      });

      // Check real blockchain balance (will be 0 initially)
      const realBalance = await walletService.getBalance(walletData.address);
      
      // Log funding instructions for user
      await walletService.fundWallet(walletData.address);

      res.json({ 
        address: walletData.address,
        balance: realBalance,
        needsFunding: true,
        fundingInstructions: {
          ethFaucet: "https://faucet.sepolia.dev/",
          pyusdFaucet: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd"
        }
      });
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ message: "Failed to create wallet" });
    }
  });

  // Get user by username for tipping
  app.get('/api/users/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return public profile info only
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl
      });
    } catch (error) {
      console.error("Error fetching user by username:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Validation schema for tip requests
  const tipRequestSchema = z.object({
    recipientUsername: z.string().min(1, 'Recipient username is required').max(50, 'Username too long'),
    amount: z.string().refine(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 100; // Max $100 per tip
    }, 'Amount must be a valid positive number between 0 and 100'),
    message: z.string().max(500, 'Message too long').optional()
  });

  // Send tip
  app.post('/api/tips/send', isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      
      // Validate request body with Zod
      const validationResult = tipRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: validationResult.error.errors
        });
      }
      
      const { recipientUsername, amount = '0.01', message } = validationResult.data;

      const sender = await storage.getUser(senderId);
      const recipient = await storage.getUserByUsername(recipientUsername);

      if (!sender || !recipient) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!sender.walletAddress) {
        return res.status(400).json({ message: "Sender wallet not found" });
      }

      if (!recipient.walletAddress) {
        return res.status(400).json({ message: "Recipient wallet not found" });
      }

      // Create transaction record
      const transaction = await storage.createTransaction({
        fromUserId: senderId,
        toUserId: recipient.id,
        amount,
        status: 'pending',
        message
      });

      try {
        // Send the tip on blockchain using secure method
        const txHash = await walletService.sendTipFromUser(
          senderId,
          recipient.walletAddress,
          amount
        );

        // Update transaction with success
        await storage.updateTransactionStatus(transaction.id, 'confirmed', txHash);

        // Update balances
        const senderWallet = await storage.getWallet(senderId);
        const recipientWallet = await storage.getWallet(recipient.id);

        if (senderWallet) {
          const newSenderBalance = (parseFloat(senderWallet.balance) - parseFloat(amount)).toString();
          await storage.updateWalletBalance(senderId, newSenderBalance);
        }

        if (recipientWallet) {
          const newRecipientBalance = (parseFloat(recipientWallet.balance) + parseFloat(amount)).toString();
          await storage.updateWalletBalance(recipient.id, newRecipientBalance);
        }

        res.json({
          success: true,
          transactionId: transaction.id,
          transactionHash: txHash
        });

      } catch (blockchainError) {
        // Update transaction with failure
        await storage.updateTransactionStatus(transaction.id, 'failed');
        throw blockchainError;
      }

    } catch (error) {
      console.error("Error sending tip:", error);
      res.status(500).json({ message: "Failed to send tip" });
    }
  });

  // Get user transactions
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getTransactionsByUser(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get user stats
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Update user profile
  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        username
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
