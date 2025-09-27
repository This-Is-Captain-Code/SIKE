import { ethers } from 'ethers';

// ENS configuration for mainnet
const ENS_CONFIG = {
  rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://1rpc.io/eth', // More reliable public Ethereum mainnet RPC
};

export class ENSService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(ENS_CONFIG.rpcUrl);
  }

  /**
   * Check if an ENS name is available for registration
   * @param name - The ENS name without .eth suffix (e.g., "alice" not "alice.eth")
   * @returns Object with availability status and details
   */
  async checkNameAvailability(name: string): Promise<{
    name: string;
    available: boolean;
    address?: string;
    expires?: Date;
    error?: string;
    normalizedName?: string;
  }> {
    try {
      // Normalize the name (remove .eth if present, lowercase, trim)
      const normalizedName = name.toLowerCase().replace('.eth', '').trim();
      
      // Validate name format
      if (!this.isValidENSName(normalizedName)) {
        return {
          name: normalizedName,
          available: false,
          error: 'Invalid ENS name format. Names must be 3+ characters and contain only letters, numbers, and hyphens.'
        };
      }

      const fullName = `${normalizedName}.eth`;

      // Try to resolve the name to check if it exists
      let currentAddress: string | undefined;
      let isRegistered = false;
      
      try {
        const resolved = await this.provider.resolveName(fullName);
        if (resolved) {
          currentAddress = resolved;
          isRegistered = true;
        }
      } catch (error) {
        // If resolution fails, it might be available or there might be a network issue
        console.log(`Could not resolve ${fullName}:`, error);
      }

      // If we can resolve the name, it's definitely registered
      if (isRegistered && currentAddress) {
        return {
          name: normalizedName,
          normalizedName,
          available: false,
          address: currentAddress
        };
      }

      // If we can't resolve it, we'll assume it's available for now
      // This is a simplified approach since checking exact availability 
      // requires more complex contract interactions
      return {
        name: normalizedName,
        normalizedName,
        available: !isRegistered
      };

    } catch (error: any) {
      console.error('Error checking ENS name availability:', error);
      return {
        name: name,
        available: false,
        error: `Failed to check availability: ${error?.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Resolve an ENS name to an Ethereum address
   * @param name - The ENS name (with or without .eth suffix)
   * @returns The resolved address or null if not found
   */
  async resolveName(name: string): Promise<string | null> {
    try {
      const normalizedName = name.toLowerCase().trim();
      const fullName = normalizedName.endsWith('.eth') ? normalizedName : `${normalizedName}.eth`;
      
      const address = await this.provider.resolveName(fullName);
      return address;
    } catch (error) {
      console.error('Error resolving ENS name:', error);
      return null;
    }
  }

  /**
   * Reverse resolve an Ethereum address to an ENS name
   * @param address - The Ethereum address
   * @returns The ENS name or null if not found
   */
  async reverseResolve(address: string): Promise<string | null> {
    try {
      if (!ethers.isAddress(address)) {
        return null;
      }
      
      const name = await this.provider.lookupAddress(address);
      return name;
    } catch (error) {
      console.error('Error reverse resolving address:', error);
      return null;
    }
  }

  /**
   * Get comprehensive information about an ENS name
   * @param name - The ENS name without .eth suffix
   * @returns Detailed information about the ENS name
   */
  async getNameInfo(name: string): Promise<{
    name: string;
    available: boolean;
    address?: string;
    expires?: Date;
    registered?: boolean;
    avatar?: string;
    error?: string;
  }> {
    try {
      const availability = await this.checkNameAvailability(name);
      
      if (availability.error) {
        return availability;
      }

      if (availability.available) {
        return availability;
      }

      // Get additional info for registered names
      const fullName = `${availability.normalizedName}.eth`;
      let avatar: string | undefined;
      
      try {
        const avatarResult = await this.provider.getAvatar(fullName);
        avatar = avatarResult || undefined;
      } catch (error) {
        console.log(`Could not get avatar for ${fullName}:`, error);
      }

      return {
        ...availability,
        registered: true,
        avatar: avatar || undefined
      };

    } catch (error: any) {
      console.error('Error getting ENS name info:', error);
      return {
        name: name,
        available: false,
        error: `Failed to get name info: ${error?.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Validate ENS name format
   * @param name - The name to validate (without .eth)
   * @returns True if valid, false otherwise
   */
  private isValidENSName(name: string): boolean {
    // ENS names must be at least 3 characters
    if (name.length < 3) {
      return false;
    }
    
    // Check for valid characters (letters, numbers, hyphens)
    // Cannot start or end with hyphen
    const validNameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    
    return validNameRegex.test(name);
  }

  /**
   * Get registration cost estimate (requires additional contract calls)
   * This is a placeholder - real implementation would need the ENS Controller contract
   */
  async getRegistrationCost(name: string, duration: number = 1): Promise<{
    cost?: string;
    currency: string;
    duration: number;
    error?: string;
  }> {
    // This would require the ENS Controller contract which has more complex ABI
    // For now, return estimated costs based on name length
    const normalizedName = name.toLowerCase().replace('.eth', '').trim();
    
    if (normalizedName.length < 3) {
      return {
        currency: 'ETH',
        duration,
        error: 'Names must be at least 3 characters'
      };
    }

    // Rough estimates based on ENS pricing tiers
    let annualCostETH: string;
    if (normalizedName.length === 3) {
      annualCostETH = '0.64'; // ~$640 per year for 3-character names
    } else if (normalizedName.length === 4) {
      annualCostETH = '0.16'; // ~$160 per year for 4-character names
    } else {
      annualCostETH = '0.005'; // ~$5 per year for 5+ character names
    }

    const totalCost = (parseFloat(annualCostETH) * duration).toString();

    return {
      cost: totalCost,
      currency: 'ETH',
      duration
    };
  }
}

export const ensService = new ENSService();