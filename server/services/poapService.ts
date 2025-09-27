import { ethers } from "ethers";
import { storage } from "../storage";

// POAP Contract Configuration - reuse same provider config as walletService
const POAP_CONFIG = {
  contractAddress: "0x5FE9dE53510F982A53875a8B2Bc9721B5c92DF5B",
  rpcUrl: process.env.PYUSD_RPC_URL || process.env.RPC_URL || 'https://1rpc.io/sepolia' // Use same reliable Sepolia RPC as walletService
};

// Clean ABI for the POAP contract
const POAP_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "address", 
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "createMemory",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender", 
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenIdSender",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256", 
        "name": "tokenIdReceiver",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "memoryText",
        "type": "string"
      }
    ],
    "name": "MemoryCreated",
    "type": "event"
  },
  // Standard ERC721 functions
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

class PoapService {
  private provider: ethers.JsonRpcProvider;
  private poapContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(POAP_CONFIG.rpcUrl);
    this.poapContract = new ethers.Contract(
      POAP_CONFIG.contractAddress,
      POAP_ABI,
      this.provider
    );
  }

  async createMemoryForUsers(fromUserId: string, toUserId: string): Promise<string> {
    try {
      console.log(`Creating POAP memory from user ${fromUserId} to user ${toUserId}`);
      
      // Get both users' data
      const fromUser = await storage.getUser(fromUserId);
      const toUser = await storage.getUser(toUserId);

      if (!fromUser || !fromUser.walletAddress) {
        throw new Error('Sender user or wallet not found');
      }

      if (!toUser || !toUser.walletAddress) {
        throw new Error('Receiver user or wallet not found');
      }

      console.log(`Creating memory from ${fromUser.walletAddress} to ${toUser.walletAddress}`);

      // Get encrypted private key for the sender (following walletService pattern)
      const privateKey = await this.getDecryptedPrivateKey(fromUserId);
      
      // Create wallet from decrypted private key
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // CRITICAL SAFETY CHECK: Verify wallet address matches stored address
      if (wallet.address.toLowerCase() !== fromUser.walletAddress.toLowerCase()) {
        throw new Error('Wallet address mismatch - possible data corruption');
      }

      console.log(`Sending createMemory transaction from wallet: ${wallet.address}`);
      
      // Connect contract to wallet for signing
      const contractWithSigner = this.poapContract.connect(wallet);
      
      // Estimate gas for the transaction
      let gasEstimate: bigint;
      let gasPrice: bigint;
      try {
        gasEstimate = await (contractWithSigner as any).createMemory.estimateGas(
          fromUser.walletAddress,
          toUser.walletAddress
        );
        gasPrice = (await this.provider.getFeeData()).gasPrice || ethers.parseUnits('20', 'gwei');
      } catch (gasError) {
        console.warn('Gas estimation failed, using fallback values:', gasError);
        gasEstimate = BigInt(100000); // Fallback gas limit
        gasPrice = ethers.parseUnits('20', 'gwei'); // Fallback gas price
      }

      const estimatedCost = gasEstimate * gasPrice;
      
      // Check ETH balance for gas
      const ethBalance = await this.provider.getBalance(wallet.address);
      if (ethBalance < estimatedCost) {
        throw new Error(`Insufficient ETH for gas fees. Need ${ethers.formatEther(estimatedCost)} ETH, have ${ethers.formatEther(ethBalance)} ETH`);
      }
      
      // Call createMemory function
      const tx = await (contractWithSigner as any).createMemory(
        fromUser.walletAddress,
        toUser.walletAddress
      );
      
      console.log(`Transaction sent with hash: ${tx.hash}`);
      console.log(`Waiting for confirmation...`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        console.log(`POAP memory created successfully in block ${receipt.blockNumber}`);
        return tx.hash;
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error) {
      console.error("Error creating POAP memory:", error);
      throw error;
    }
  }

  // Helper method to decrypt private key (same pattern as walletService)
  private async getDecryptedPrivateKey(userId: string): Promise<string> {
    try {
      const { decryptPrivateKey } = await import("../utils/encryption");
      const user = await storage.getUser(userId);
      
      if (!user || !user.walletPrivateKey) {
        throw new Error('User wallet private key not found');
      }

      return decryptPrivateKey(user.walletPrivateKey);
    } catch (error) {
      console.error("Error decrypting private key:", error);
      throw error;
    }
  }

  // Check POAP balance for a user
  async getPoapBalance(userAddress: string): Promise<string> {
    try {
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid address');
      }

      const balance = await this.poapContract.balanceOf(userAddress);
      return balance.toString();
    } catch (error) {
      console.error("Error getting POAP balance:", error);
      return '0';
    }
  }
}

export const poapService = new PoapService();