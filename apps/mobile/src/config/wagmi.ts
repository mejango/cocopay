import { createConfig, http, fallback, type Config } from 'wagmi';
import { mainnet, optimism, base, arbitrum, sepolia, optimismSepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { injected } from 'wagmi/connectors';
import { CHAINS } from '../constants/juicebox';

function buildFallbackTransport(rpcUrls: readonly string[]) {
  return fallback(rpcUrls.map((url) => http(url)));
}

function buildWagmiConfig(): Config {
  return createConfig({
    chains: [mainnet, optimism, base, arbitrum, sepolia, optimismSepolia, baseSepolia, arbitrumSepolia],
    connectors: [
      injected(),
    ],
    transports: {
      [mainnet.id]: buildFallbackTransport(CHAINS.ethereum.rpcUrls),
      [optimism.id]: buildFallbackTransport(CHAINS.optimism.rpcUrls),
      [base.id]: buildFallbackTransport(CHAINS.base.rpcUrls),
      [arbitrum.id]: buildFallbackTransport(CHAINS.arbitrum.rpcUrls),
      [sepolia.id]: buildFallbackTransport(CHAINS.ethereumSepolia.rpcUrls),
      [optimismSepolia.id]: buildFallbackTransport(CHAINS.optimismSepolia.rpcUrls),
      [baseSepolia.id]: buildFallbackTransport(CHAINS.baseSepolia.rpcUrls),
      [arbitrumSepolia.id]: buildFallbackTransport(CHAINS.arbitrumSepolia.rpcUrls),
    },
  });
}

export const wagmiConfig = buildWagmiConfig();
