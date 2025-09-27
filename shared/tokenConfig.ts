// Token configuration for micro-tips
export interface TokenConfig {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  contractAddress: string;
  minAmount: string; // in USD as string to avoid float precision issues
  maxAmount: string; // in USD as string to avoid float precision issues
  step: string; // slider step increment as string
  displayPrecision: number; // decimal places to show in UI
  network: string;
  chainId: number;
  isStablecoin: boolean;
  icon?: string;
  color: string; // hex color for UI
}

export const SUPPORTED_TOKENS: TokenConfig[] = [
  {
    id: 'pyusd',
    name: 'PayPal USD',
    symbol: 'PYUSD',
    decimals: 6,
    contractAddress: '0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9', // Official PYUSD Sepolia address
    minAmount: '0.0001',
    maxAmount: '1.0000',
    step: '0.0001',
    displayPrecision: 4,
    network: 'ethereum-sepolia',
    chainId: 11155111,
    isStablecoin: true,
    color: '#0070f3',
  },
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC Sepolia testnet
    minAmount: '0.0001',
    maxAmount: '5.0000',
    step: '0.0001',
    displayPrecision: 4,
    network: 'ethereum-sepolia',
    chainId: 11155111,
    isStablecoin: true,
    color: '#2775ca',
  },
  {
    id: 'usdt',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    contractAddress: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // USDT Sepolia testnet
    minAmount: '0.0001',
    maxAmount: '2.0000',
    step: '0.0001',
    displayPrecision: 4,
    network: 'ethereum-sepolia',
    chainId: 11155111,
    isStablecoin: true,
    color: '#26a17b',
  },
  {
    id: 'dai',
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    contractAddress: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // DAI Sepolia testnet
    minAmount: '0.0010',
    maxAmount: '3.0000',
    step: '0.0010',
    displayPrecision: 4,
    network: 'ethereum-sepolia',
    chainId: 11155111,
    isStablecoin: true,
    color: '#f5ac37',
  },
];

export const DEFAULT_TOKEN = SUPPORTED_TOKENS[0]; // PYUSD as default

// Create efficient lookup maps
export const TOKEN_MAP = SUPPORTED_TOKENS.reduce((map, token) => {
  map[token.id] = token;
  return map;
}, {} as Record<string, TokenConfig>);

export const TOKEN_SYMBOL_MAP = SUPPORTED_TOKENS.reduce((map, token) => {
  map[token.symbol] = token;
  return map;
}, {} as Record<string, TokenConfig>);

export function getTokenById(tokenId: string): TokenConfig | undefined {
  return TOKEN_MAP[tokenId];
}

export function getTokenBySymbol(symbol: string): TokenConfig | undefined {
  return TOKEN_SYMBOL_MAP[symbol];
}

export function formatTokenAmount(amount: string, token: TokenConfig): string {
  const numAmount = parseFloat(amount);
  return numAmount.toFixed(token.displayPrecision);
}

// Precise conversion utilities for on-chain amounts using BigInt
export function toBaseUnits(amountStr: string, token: TokenConfig): bigint {
  // Remove any non-numeric characters except decimal point
  const cleanAmount = amountStr.replace(/[^0-9.]/g, '');
  
  // Split by decimal point
  const [whole, decimal = ''] = cleanAmount.split('.');
  
  // Pad decimal part to match token decimals
  const paddedDecimal = decimal.padEnd(token.decimals, '0').slice(0, token.decimals);
  
  // Combine and convert to BigInt
  const combinedStr = whole + paddedDecimal;
  return BigInt(combinedStr);
}

export function fromBaseUnits(baseUnits: bigint, token: TokenConfig): string {
  const str = baseUnits.toString();
  const decimals = token.decimals;
  
  if (str.length <= decimals) {
    // Pad with leading zeros if necessary
    const padded = str.padStart(decimals, '0');
    return '0.' + padded;
  } else {
    // Split into whole and decimal parts
    const wholeLength = str.length - decimals;
    const whole = str.slice(0, wholeLength);
    const decimal = str.slice(wholeLength);
    return whole + '.' + decimal;
  }
}

// Safe comparison utilities for string amounts
export function isAmountValid(amount: string, token: TokenConfig): boolean {
  try {
    const amountNum = parseFloat(amount);
    const minNum = parseFloat(token.minAmount);
    const maxNum = parseFloat(token.maxAmount);
    
    return !isNaN(amountNum) && 
           amountNum >= minNum && 
           amountNum <= maxNum && 
           amountNum > 0;
  } catch {
    return false;
  }
}

export function clampAmount(amount: string, token: TokenConfig): string {
  const amountNum = parseFloat(amount);
  const minNum = parseFloat(token.minAmount);
  const maxNum = parseFloat(token.maxAmount);
  
  if (isNaN(amountNum)) return token.minAmount;
  
  const clamped = Math.max(minNum, Math.min(maxNum, amountNum));
  return clamped.toFixed(token.displayPrecision);
}