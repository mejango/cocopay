// Juicebox V5 Contract Addresses (same on all chains)
export const JB_DIRECTORY = '0x0061e516886a0540f63157f112c0588ee0651dcf' as const;
export const JB_MULTI_TERMINAL = '0x2db6d704058e552defe415753465df8df0361846' as const;
export const JB_TOKENS = '0x4d0edd347fb1fa21589c1e109b3474924be87636' as const;
export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

// REVLoans (CREATE2, same on all chains)
export const REV_LOANS_ADDRESS = '0x1880d832aa283d05b8eab68877717e25fbd550bb' as const;

// USDC addresses per chain (decimals = 6)
export const USDC_ADDRESSES: Record<number, string> = {
  // Mainnets
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  // Testnets
  11155111: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  84532: '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
  421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
};

export const USDC_DECIMALS = 6;

// Default wallet address for this app (breadfruit.eth)
export const DEFAULT_WALLET_ADDRESS = '0x21a8c5f5666EC3b786585EABc311D9de18A5Db6C' as const;

// ERC-2771 Forwarder (same on all chains)
export const ERC2771_FORWARDER = '0xc29d6995ab3b0df4650ad643adeac55e7acbb566' as const;

// ForwardableSimpleAccountFactory (same on all chains)
export const SMART_ACCOUNT_FACTORY = '0x69a05d911af23501ff9d6b811a97cac972dade05' as const;

// Permit2 (same on all chains)
export const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;

// CocoPayRouter (deployed via CREATE2 — same on all chains)
// TODO: Populate after deployment
export const COCOPAY_ROUTER: string = '';

// Bendystraw GraphQL API endpoint
export const BENDYSTRAW_API_KEY = '3ZNJpGtazh5fwYoSW59GWDEj';
export const BENDYSTRAW_ENDPOINT = `https://bendystraw.xyz/${BENDYSTRAW_API_KEY}/graphql`;

// Chain configurations with multiple RPC fallbacks
// Order: publicnode (most reliable) -> ankr -> drpc
export const CHAINS = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
      'https://eth.drpc.org',
    ],
    blockExplorer: 'https://etherscan.io',
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://optimism.publicnode.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism.drpc.org',
    ],
    blockExplorer: 'https://optimistic.etherscan.io',
  },
  base: {
    id: 8453,
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://base.publicnode.com',
      'https://rpc.ankr.com/base',
      'https://base.drpc.org',
    ],
    blockExplorer: 'https://basescan.org',
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://arbitrum-one.publicnode.com',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.drpc.org',
    ],
    blockExplorer: 'https://arbiscan.io',
  },
  ethereumSepolia: {
    id: 11155111,
    name: 'Ethereum Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://ethereum-sepolia.publicnode.com',
    ],
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  optimismSepolia: {
    id: 11155420,
    name: 'OP Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://optimism-sepolia.publicnode.com',
    ],
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://base-sepolia.publicnode.com',
    ],
    blockExplorer: 'https://sepolia.basescan.org',
  },
  arbitrumSepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://arbitrum-sepolia.publicnode.com',
    ],
    blockExplorer: 'https://sepolia.arbiscan.io',
  },
} as const;

export type ChainId = typeof CHAINS[keyof typeof CHAINS]['id'];

// Get chain config by ID
export function getChainById(chainId: number) {
  return Object.values(CHAINS).find(chain => chain.id === chainId);
}

// Get first working RPC URL for a chain
export function getRpcUrl(chainId: number): string | null {
  const chain = getChainById(chainId);
  return chain?.rpcUrls[0] ?? null;
}
