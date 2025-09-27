import { ethers } from 'ethers';

// ENS configuration with multiple reliable RPC endpoints
const ENS_CONFIG = {
  rpcUrls: [
    process.env.ETHEREUM_RPC_URL || 'https://cloudflare-eth.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth'
  ],
};

export class ENSService {
  private providers: ethers.JsonRpcProvider[];
  private currentProviderIndex: number = 0;

  constructor() {
    // Initialize multiple providers for fallback
    this.providers = ENS_CONFIG.rpcUrls.map(url => new ethers.JsonRpcProvider(url));
  }

  private async getCurrentProvider(): Promise<ethers.JsonRpcProvider> {
    // Return current provider, with fallback rotation on failures
    return this.providers[this.currentProviderIndex];
  }

  private async rotateProvider(): Promise<void> {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    console.log(`Switching to RPC provider ${this.currentProviderIndex + 1}/${this.providers.length}`);
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

      // Try to resolve the name using ethers.js built-in ENS support
      let currentAddress: string | undefined;
      let isRegistered = false;
      let retryCount = 0;
      const maxRetries = this.providers.length;

      while (retryCount < maxRetries) {
        try {
          const provider = await this.getCurrentProvider();
          console.log(`Attempting ENS resolution for ${fullName} (attempt ${retryCount + 1}/${maxRetries})`);
          
          // Use ethers.js built-in ENS resolution
          const resolved = await provider.resolveName(fullName);
          
          if (resolved) {
            currentAddress = resolved;
            isRegistered = true;
            console.log(`Successfully resolved ${fullName} to ${resolved}`);
            break;
          } else {
            console.log(`Name ${fullName} not found - likely available`);
            break;
          }
        } catch (error: any) {
          console.log(`ENS resolution failed with provider ${this.currentProviderIndex + 1}: ${error.message}`);
          
          if (retryCount < maxRetries - 1) {
            await this.rotateProvider();
            retryCount++;
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.error(`All ENS resolution attempts failed for ${fullName}`);
            // If all providers fail, try ENS public API as fallback
            return await this.checkNameViaAPI(normalizedName);
          }
        }
      }

      return {
        name: normalizedName,
        normalizedName,
        available: !isRegistered,
        ...(currentAddress && { address: currentAddress })
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
   * Fallback method using ENS public API
   */
  private async checkNameViaAPI(normalizedName: string): Promise<{
    name: string;
    available: boolean;
    address?: string;
    error?: string;
    normalizedName?: string;
  }> {
    try {
      console.log(`Trying ENS API fallback for ${normalizedName}`);
      
      // Use ENS subgraph or similar public API
      const response = await fetch(`https://api.thegraph.com/subgraphs/name/ensdomains/ens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query {
              domain(id: "${normalizedName}") {
                id
                name
                owner {
                  id
                }
                resolver {
                  id
                }
              }
            }
          `
        })
      });

      if (response.ok) {
        const data = await response.json();
        const domain = data.data?.domain;
        
        if (domain && domain.owner) {
          return {
            name: normalizedName,
            normalizedName,
            available: false,
            address: domain.owner.id
          };
        } else {
          return {
            name: normalizedName,
            normalizedName,
            available: true
          };
        }
      }
      
      throw new Error('API request failed');
    } catch (error: any) {
      console.error('ENS API fallback also failed:', error);
      
      // Final fallback - return likely availability based on name characteristics
      const popularNames = ['vitalik', 'ethereum', 'opensea', 'uniswap', 'chainlink'];
      const isLikelyRegistered = popularNames.includes(normalizedName) || normalizedName.length <= 4;
      
      return {
        name: normalizedName,
        normalizedName,
        available: !isLikelyRegistered,
        error: 'Unable to connect to blockchain - showing estimated availability'
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
      
      let retryCount = 0;
      const maxRetries = this.providers.length;

      while (retryCount < maxRetries) {
        try {
          const provider = await this.getCurrentProvider();
          const address = await provider.resolveName(fullName);
          
          if (address) {
            console.log(`Resolved ${fullName} to ${address}`);
            return address;
          }
          return null;
        } catch (error: any) {
          console.log(`ENS resolution failed: ${error.message}`);
          
          if (retryCount < maxRetries - 1) {
            await this.rotateProvider();
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.error(`All resolution attempts failed for ${fullName}`);
            return null;
          }
        }
      }
      
      return null;
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
      
      let retryCount = 0;
      const maxRetries = this.providers.length;

      while (retryCount < maxRetries) {
        try {
          const provider = await this.getCurrentProvider();
          const name = await provider.lookupAddress(address);
          
          if (name) {
            console.log(`Reverse resolved ${address} to ${name}`);
            return name;
          }
          return null;
        } catch (error: any) {
          console.log(`ENS reverse resolution failed: ${error.message}`);
          
          if (retryCount < maxRetries - 1) {
            await this.rotateProvider();
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.error(`All reverse resolution attempts failed for ${address}`);
            return null;
          }
        }
      }
      
      return null;
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
        const provider = await this.getCurrentProvider();
        const avatarResult = await provider.getAvatar(fullName);
        avatar = avatarResult || undefined;
        
        if (avatar) {
          console.log(`Retrieved avatar for ${fullName}: ${avatar}`);
        }
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