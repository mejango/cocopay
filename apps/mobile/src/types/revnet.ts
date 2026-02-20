// Revnet (project with token balance) from Bendystraw
export interface Revnet {
  projectId: number;
  chainId: number;
  name: string;
  tokenSymbol: string;
  logoUri: string | null;
  // User's token balance (raw, 18 decimals)
  balance: string;
  // User's token balance formatted for display
  balanceFormatted: string;
  // Project's total ETH balance in treasury
  treasuryBalance: string;
  // Project's total token supply
  tokenSupply: string;
  // Total volume received by project
  volume: string;
  // Sucker group ID for cross-chain revnets (null = not a revnet)
  suckerGroupId: string | null;
  // Estimated cash out value in ETH (or native currency)
  cashOutValueEth: number;
  // Estimated cash out value in USD
  cashOutValueUsd: number;
  // Treasury decimals: 18 for ETH, 6 for USDC
  decimals: number;
  // Currency code: 1 for ETH, 2 for USDC
  currency: number;
}

// Raw participant data from Bendystraw GraphQL
export interface BendystrawParticipant {
  projectId: number;
  chainId: number;
  balance: string;
  project: {
    name: string | null;
    logoUri: string | null;
    tokenSymbol: string | null;
    balance: string;
    volume: string;
    volumeUsd: string | null;
    tokenSupply: string;
    suckerGroupId: string | null;
    version: number | null;
    decimals: number | null;
    currency: number | null;
  };
}

// Response from wallet query
export interface WalletQueryResponse {
  wallet: {
    participants: {
      items: BendystrawParticipant[];
    };
  } | null;
}

// Legacy response type
export interface ParticipantsQueryResponse {
  participants: {
    items: BendystrawParticipant[];
  };
}
