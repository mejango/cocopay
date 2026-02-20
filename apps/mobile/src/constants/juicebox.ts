// Juicebox V5 Contract Addresses (same on all chains)
export const JB_DIRECTORY = '0x0061e516886a0540f63157f112c0588ee0651dcf' as const;
export const JB_MULTI_TERMINAL = '0x2db6d704058e552defe415753465df8df0361846' as const;
export const JB_TOKENS = '0x4d0edd347fb1fa21589c1e109b3474924be87636' as const;
export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

// Default wallet address for this app (breadfruit.eth)
export const DEFAULT_WALLET_ADDRESS = '0x21a8c5f5666EC3b786585EABc311D9de18A5Db6C' as const;

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
