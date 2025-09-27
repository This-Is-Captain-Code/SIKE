import { ethers } from 'ethers';
import { storage } from '../storage';
import { encryptPrivateKey, decryptPrivateKey } from '../utils/encryption';

// PYUSD testnet configuration
const PYUSD_TESTNET_CONFIG = {
  rpcUrl: process.env.PYUSD_RPC_URL || 'https://rpc.sepolia.org', // Use public Sepolia RPC
  contractAddress: process.env.PYUSD_CONTRACT_ADDRESS || '0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9', // Correct PYUSD Sepolia testnet address
  faucetUrl: process.env.PYUSD_FAUCET_URL || 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd',
};

export class WalletService {
  private provider: ethers.JsonRpcProvider;
  private pyusdContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(PYUSD_TESTNET_CONFIG.rpcUrl);
    
    // ERC20 ABI for PYUSD token
    const erc20Abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function decimals() view returns (uint8)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "event Approval(address indexed owner, address indexed spender, uint256 value)"
    ];
    
    this.pyusdContract = new ethers.Contract(
      PYUSD_TESTNET_CONFIG.contractAddress,
      erc20Abi,
      this.provider
    );
  }

  async createWallet(): Promise<{ address: string }> {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address
      // Private key is handled securely and never returned to the client
    };
  }

  async createWalletForUser(userId: string): Promise<{ address: string }> {
    const wallet = ethers.Wallet.createRandom();
    
    // Encrypt the private key before storing
    const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey);
    
    // Update user with wallet address and encrypted private key
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await storage.upsertUser({
      ...user,
      walletAddress: wallet.address,
      walletPrivateKey: encryptedPrivateKey
    });
    
    return {
      address: wallet.address
    };
  }

  private async getDecryptedPrivateKey(userId: string): Promise<string> {
    const user = await storage.getUser(userId);
    if (!user?.walletPrivateKey) {
      throw new Error('No wallet found for user');
    }
    
    try {
      return decryptPrivateKey(user.walletPrivateKey);
    } catch (error) {
      throw new Error('Failed to decrypt wallet private key');
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      console.log(`Getting real PYUSD balance for address: ${address}`);
      
      // Get balance from blockchain
      const balance = await (this.pyusdContract as any).balanceOf(address);
      const decimals = await (this.pyusdContract as any).decimals();
      
      // Convert from wei to readable format
      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      console.log(`Blockchain balance: ${formattedBalance} PYUSD`);
      return formattedBalance;
      
    } catch (error: any) {
      console.error('Error getting balance from blockchain:', error);
      
      // Fallback to database balance for development
      try {
        const user = await storage.getUserByWalletAddress(address);
        if (user) {
          const wallet = await storage.getWallet(user.id);
          console.log(`Using database fallback balance: ${wallet?.balance || '0'}`);
          return wallet?.balance || '0';
        }
      } catch (dbError) {
        console.error('Database fallback also failed:', dbError);
      }
      
      return '0';
    }
  }

  async sendTipFromUser(fromUserId: string, toAddress: string, amount: string): Promise<string> {
    try {
      console.log(`Sending real tip: ${amount} PYUSD from user ${fromUserId} to ${toAddress}`);
      
      // Validate addresses and amount
      if (!ethers.isAddress(toAddress)) {
        throw new Error('Invalid recipient address');
      }
      
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error('Invalid amount');
      }
      
      // Get encrypted private key for the user
      const privateKey = await this.getDecryptedPrivateKey(fromUserId);
      
      // Create wallet from decrypted private key
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // CRITICAL SAFETY CHECK: Verify wallet address matches stored address
      const user = await storage.getUser(fromUserId);
      if (!user?.walletAddress || wallet.address.toLowerCase() !== user.walletAddress.toLowerCase()) {
        throw new Error('Wallet address mismatch - possible data corruption');
      }
      
      console.log(`Sending from wallet: ${wallet.address}`);
      
      // Connect contract to wallet for signing
      const contractWithSigner = this.pyusdContract.connect(wallet);
      
      // Convert amount to proper decimals (PYUSD uses 6 decimals)
      const decimals = await (this.pyusdContract as any).decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);
      
      // Check PYUSD balance
      const pyusdBalance = await (this.pyusdContract as any).balanceOf(wallet.address);
      if (pyusdBalance < amountInWei) {
        throw new Error('Insufficient PYUSD balance');
      }
      
      // Check ETH balance for gas
      const ethBalance = await this.provider.getBalance(wallet.address);
      const estimatedGas = ethers.parseEther('0.001'); // Rough estimate
      if (ethBalance < estimatedGas) {
        throw new Error('Insufficient ETH for gas fees');
      }
      
      console.log(`Transferring ${amountInWei.toString()} (${amount} PYUSD) from ${wallet.address} to ${toAddress}`);
      
      // Send the transaction
      const tx = await (contractWithSigner as any).transfer(toAddress, amountInWei);
      
      console.log(`Transaction sent with hash: ${tx.hash}`);
      console.log(`Waiting for confirmation...`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        return tx.hash;
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error: any) {
      console.error('Error sending tip:', error);
      
      // Re-throw our custom errors as-is
      if (error.message?.startsWith('Invalid') || 
          error.message?.startsWith('Insufficient') ||
          error.message?.startsWith('No wallet found')) {
        throw error;
      }
      
      // Check if it's a specific blockchain error
      if (error?.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient PYUSD balance');
      } else if (error?.code === 'NETWORK_ERROR') {
        throw new Error('Network connection failed');
      }
      
      throw new Error(`Failed to send tip: ${error?.message || 'Unknown error'}`);
    }
  }

  async fundWallet(address: string): Promise<boolean> {
    try {
      console.log(`Attempting to fund wallet ${address} with testnet tokens`);
      
      // For real blockchain integration, users need to:
      // 1. Get testnet ETH for gas fees from Sepolia faucet
      // 2. Get testnet PYUSD from Google Cloud faucet
      
      console.log(`To fund wallet ${address}:`);
      console.log(`1. Get Sepolia ETH: https://faucet.sepolia.dev/`);
      console.log(`2. Get testnet PYUSD: https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd`);
      
      // Check if wallet already has some balance
      try {
        const currentBalance = await this.getBalance(address);
        const ethBalance = await this.provider.getBalance(address);
        
        console.log(`Current PYUSD balance: ${currentBalance}`);
        console.log(`Current ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
        
        // For automatic funding, we would need to integrate with faucet APIs
        // This is currently not possible with public faucets that require manual interaction
        
        // Return true to allow wallet creation to proceed
        // Users will need to manually fund their wallets
        return true;
        
      } catch (error) {
        console.log('Unable to check current balance, proceeding with wallet creation');
        return true;
      }
      
    } catch (error: any) {
      console.error('Error in funding process:', error);
      // Don't fail wallet creation due to funding issues
      return true;
    }
  }

  async getUserByWalletAddress(address: string) {
    const user = await storage.getUser(address);
    return user;
  }
}

export const walletService = new WalletService();
