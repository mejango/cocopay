/**
 * Client-side revnet deployment calldata encoding using viem.
 * ABI sourced from revnet-core-v5 Solidity structs (canonical source of truth).
 */

import { encodeFunctionData, type Address, type Hex, keccak256, toBytes } from 'viem';
import { JB_MULTI_TERMINAL, USDC_ADDRESSES as SHARED_USDC_ADDRESSES, USDC_DECIMALS } from '../../constants/juicebox';

// Contract addresses (same on all chains via CREATE2)
const REV_DEPLOYER_ADDRESS = '0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d' as const;
const REV_LOANS_ADDRESS = '0x1880d832aa283d05b8eab68877717e25fbd550bb' as const;
const JB_NATIVE_TOKEN = '0x000000000000000000000000000000000000EEEe' as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;

// JBBuybackHookRegistry (CREATE2, same on all chains)
const JB_BUYBACK_HOOK_REGISTRY = '0x9e1e0fb70bc4661f2cc2d5eddd87a9d582a12b1a' as const;

// JBBuybackHook (chain-specific)
const JB_BUYBACK_HOOK: Record<number, Address> = {
  1: '0xd342490ec41d5982c23951253a74a1c940fe0f9b',
  10: '0x318f8aa6a95cb83419985c0d797c762f5a7824f3',
  8453: '0xb6133a222315f8e9d25e7c77bac5ddeb3451d088',
  42161: '0x4ac3e20edd1d398def0dfb44d3adb9fc244f0320',
  11155111: '0xf082e3218a690ea6386506bed338f6878d21815f',
  11155420: '0x79e5ca5ebe4f110965248afad88b8e539e1aa8fd',
  84532: '0x79e5ca5ebe4f110965248afad88b8e539e1aa8fd',
  421614: '0xb35ab801c008a64d8f3eea0a8a6209b0d176f2df',
};

// Sucker deployers (CREATE2, same on all chains)
const JB_OPTIMISM_SUCKER_DEPLOYER = '0x77cdb0f5eef8febd67dd6e594ff654fb12cc3057' as const;
const JB_BASE_SUCKER_DEPLOYER = '0xd9f35d8dd36046f14479e6dced03733724947efd' as const;
const JB_ARBITRUM_SUCKER_DEPLOYER = '0xea06bd663a1cec97b5bdec9375ab9a63695c9699' as const;

// JBSwapTerminalUSDCRegistry (CREATE2, same on all chains)
const JB_SWAP_TERMINAL_USDC_REGISTRY = '0x1ce40d201cdec791de05810d17aaf501be167422' as const;

// JBPrices (CREATE2, same on all chains)
const JB_PRICES = '0x9b90e507cf6b7eb681a506b111f6f50245e614c4' as const;

// USD currency ID (baseCurrency)
const USD_CURRENCY = 2;

// Cast shared USDC addresses to viem Address type
const USDC_ADDRESSES = SHARED_USDC_ADDRESSES as Record<number, Address>;

/**
 * Derive currency uint32 from a token address: uint32(uint160(address))
 * This takes the lower 4 bytes of the address.
 */
function tokenCurrency(tokenAddress: string): number {
  return parseInt(tokenAddress.toLowerCase().replace(/^0x/, '').slice(-8), 16);
}

// REVDeployer.deployWith721sFor ABI (from revnet-core-v5 Solidity source)
const REV_DEPLOYER_ABI = [
  {
    name: 'deployWith721sFor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'revnetId', type: 'uint256' },
      {
        name: 'configuration',
        type: 'tuple',
        components: [
          {
            name: 'description',
            type: 'tuple',
            components: [
              { name: 'name', type: 'string' },
              { name: 'ticker', type: 'string' },
              { name: 'uri', type: 'string' },
              { name: 'salt', type: 'bytes32' },
            ],
          },
          { name: 'baseCurrency', type: 'uint32' },
          { name: 'splitOperator', type: 'address' },
          {
            name: 'stageConfigurations',
            type: 'tuple[]',
            components: [
              { name: 'startsAtOrAfter', type: 'uint48' },
              {
                name: 'autoIssuances',
                type: 'tuple[]',
                components: [
                  { name: 'chainId', type: 'uint32' },
                  { name: 'count', type: 'uint104' },
                  { name: 'beneficiary', type: 'address' },
                ],
              },
              { name: 'splitPercent', type: 'uint16' },
              {
                name: 'splits',
                type: 'tuple[]',
                components: [
                  { name: 'percent', type: 'uint32' },
                  { name: 'projectId', type: 'uint64' },
                  { name: 'beneficiary', type: 'address' },
                  { name: 'preferAddToBalance', type: 'bool' },
                  { name: 'lockedUntil', type: 'uint48' },
                  { name: 'hook', type: 'address' },
                ],
              },
              { name: 'initialIssuance', type: 'uint112' },
              { name: 'issuanceCutFrequency', type: 'uint32' },
              { name: 'issuanceCutPercent', type: 'uint32' },
              { name: 'cashOutTaxRate', type: 'uint16' },
              { name: 'extraMetadata', type: 'uint16' },
            ],
          },
          {
            name: 'loanSources',
            type: 'tuple[]',
            components: [
              { name: 'token', type: 'address' },
              { name: 'terminal', type: 'address' },
            ],
          },
          { name: 'loans', type: 'address' },
        ],
      },
      {
        name: 'terminalConfigurations',
        type: 'tuple[]',
        components: [
          { name: 'terminal', type: 'address' },
          {
            name: 'accountingContextsToAccept',
            type: 'tuple[]',
            components: [
              { name: 'token', type: 'address' },
              { name: 'decimals', type: 'uint8' },
              { name: 'currency', type: 'uint32' },
            ],
          },
        ],
      },
      {
        name: 'buybackHookConfiguration',
        type: 'tuple',
        components: [
          { name: 'dataHook', type: 'address' },
          { name: 'hookToConfigure', type: 'address' },
          {
            name: 'poolConfigurations',
            type: 'tuple[]',
            components: [
              { name: 'token', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'twapWindow', type: 'uint32' },
            ],
          },
        ],
      },
      {
        name: 'suckerDeploymentConfiguration',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
            type: 'tuple[]',
            components: [
              { name: 'deployer', type: 'address' },
              {
                name: 'mappings',
                type: 'tuple[]',
                components: [
                  { name: 'localToken', type: 'address' },
                  { name: 'minGas', type: 'uint32' },
                  { name: 'remoteToken', type: 'address' },
                  { name: 'minBridgeAmount', type: 'uint256' },
                ],
              },
            ],
          },
          { name: 'salt', type: 'bytes32' },
        ],
      },
      {
        name: 'tiered721HookConfiguration',
        type: 'tuple',
        components: [
          {
            name: 'baseline721HookConfiguration',
            type: 'tuple',
            components: [
              { name: 'name', type: 'string' },
              { name: 'symbol', type: 'string' },
              { name: 'baseUri', type: 'string' },
              { name: 'tokenUriResolver', type: 'address' },
              { name: 'contractUri', type: 'string' },
              {
                name: 'tiersConfig',
                type: 'tuple',
                components: [
                  {
                    name: 'tiers',
                    type: 'tuple[]',
                    components: [
                      { name: 'price', type: 'uint104' },
                      { name: 'initialSupply', type: 'uint32' },
                      { name: 'votingUnits', type: 'uint32' },
                      { name: 'reserveFrequency', type: 'uint16' },
                      { name: 'reserveBeneficiary', type: 'address' },
                      { name: 'encodedIPFSUri', type: 'bytes32' },
                      { name: 'category', type: 'uint24' },
                      { name: 'discountPercent', type: 'uint8' },
                      { name: 'allowOwnerMint', type: 'bool' },
                      { name: 'useReserveBeneficiaryAsDefault', type: 'bool' },
                      { name: 'transfersPausable', type: 'bool' },
                      { name: 'useVotingUnits', type: 'bool' },
                      { name: 'cannotBeRemoved', type: 'bool' },
                      { name: 'cannotIncreaseDiscountPercent', type: 'bool' },
                    ],
                  },
                  { name: 'currency', type: 'uint32' },
                  { name: 'decimals', type: 'uint8' },
                  { name: 'prices', type: 'address' },
                ],
              },
              { name: 'reserveBeneficiary', type: 'address' },
              {
                name: 'flags',
                type: 'tuple',
                components: [
                  { name: 'noNewTiersWithReserves', type: 'bool' },
                  { name: 'noNewTiersWithVotes', type: 'bool' },
                  { name: 'noNewTiersWithOwnerMinting', type: 'bool' },
                  { name: 'preventOverspending', type: 'bool' },
                ],
              },
            ],
          },
          { name: 'salt', type: 'bytes32' },
          { name: 'splitOperatorCanAdjustTiers', type: 'bool' },
          { name: 'splitOperatorCanUpdateMetadata', type: 'bool' },
          { name: 'splitOperatorCanMint', type: 'bool' },
          { name: 'splitOperatorCanIncreaseDiscountPercent', type: 'bool' },
        ],
      },
      {
        name: 'allowedPosts',
        type: 'tuple[]',
        components: [
          { name: 'category', type: 'uint24' },
          { name: 'minimumPrice', type: 'uint104' },
          { name: 'minimumTotalSupply', type: 'uint32' },
          { name: 'maximumTotalSupply', type: 'uint32' },
          { name: 'allowedAddresses', type: 'address[]' },
        ],
      },
    ],
    outputs: [
      { name: 'revnetId', type: 'uint256' },
      { name: 'hook', type: 'address' },
    ],
  },
] as const;

// ============================================================================
// Types
// ============================================================================

export interface CocoPayRevnetConfig {
  name: string;
  ticker: string;
  splitOperator: string; // Store owner address
  chainIds: number[];
}

export interface RevnetTransactionData {
  to: string;
  data: string;
  value: string;
  chainId: number;
}

// ============================================================================
// Fixed CocoPay Revnet Parameters
// ============================================================================

// CocoPay standard revnet parameters:
// - Initial issuance: 1M tokens per ETH
// - Decay (cut): 0.5% every 90 days
// - Cash out tax: 10% (1000/10000)
// - Split: 95% to operator
function cocopayStageConfig(startsAtOrAfter: number, splitOperator: Address) {
  return {
    startsAtOrAfter,
    autoIssuances: [] as { chainId: number; count: bigint; beneficiary: Address }[],
    splitPercent: 9500, // 95% (out of 10000)
    splits: [
      {
        percent: 1_000_000_000, // 100% of the split (JBConstants.MAX_RESERVED_PERCENT)
        projectId: BigInt(0),
        beneficiary: splitOperator,
        preferAddToBalance: false,
        lockedUntil: 0,
        hook: ZERO_ADDRESS as Address,
      },
    ],
    initialIssuance: BigInt('1000000000000000000000000'), // 1M tokens (18 decimals)
    issuanceCutFrequency: 86400 * 90, // 90 days in seconds
    issuanceCutPercent: 5_000_000, // 0.5%
    cashOutTaxRate: 1000, // 10% exit tax (1000/10000)
    extraMetadata: 4, // Allow adding suckers
  };
}

/**
 * Generate a deterministic salt for revnet deployment.
 */
export function generateRevnetSalt(name: string, operator: string): Hex {
  const saltInput = `cocopay-revnet-${name}-${operator}-${Date.now()}`;
  return keccak256(toBytes(saltInput));
}

/**
 * Encode REVDeployer.deployWith721sFor() calldata for a CocoPay store revnet.
 * Returns one transaction per chain.
 */
export function encodeDeployRevnetTransactions(
  config: CocoPayRevnetConfig
): RevnetTransactionData[] {
  const salt = generateRevnetSalt(config.name, config.splitOperator);

  // Same startsAtOrAfter on all chains: +5 minutes from now
  const startsAtOrAfter = Math.floor(Date.now() / 1000) + 300;
  const stageConfig = cocopayStageConfig(startsAtOrAfter, config.splitOperator as Address);

  return config.chainIds.map((chainId) => {
    const usdcAddress = USDC_ADDRESSES[chainId];
    if (!usdcAddress) {
      throw new Error(`No USDC address configured for chain ${chainId}`);
    }
    const usdcCurrency = tokenCurrency(usdcAddress);

    const configuration = {
      description: {
        name: config.name,
        ticker: config.ticker,
        uri: '',
        salt,
      },
      baseCurrency: USD_CURRENCY,
      splitOperator: config.splitOperator as Address,
      stageConfigurations: [stageConfig] as any,
      loanSources: [
        {
          token: usdcAddress,
          terminal: JB_MULTI_TERMINAL as Address,
        },
      ],
      loans: REV_LOANS_ADDRESS as Address,
    };

    const terminalConfigurations = [
      {
        terminal: JB_MULTI_TERMINAL as Address,
        accountingContextsToAccept: [
          {
            token: usdcAddress,
            decimals: USDC_DECIMALS,
            currency: usdcCurrency,
          },
        ],
      },
      {
        terminal: JB_SWAP_TERMINAL_USDC_REGISTRY as Address,
        accountingContextsToAccept: [] as { token: Address; decimals: number; currency: number }[],
      },
    ];

    const buybackHookConfiguration = {
      dataHook: JB_BUYBACK_HOOK_REGISTRY as Address,
      hookToConfigure: (JB_BUYBACK_HOOK[chainId] ?? ZERO_ADDRESS) as Address,
      poolConfigurations: [
        {
          token: usdcAddress,
          fee: 10_000,
          twapWindow: 2 * 24 * 60 * 60, // 2 days
        },
      ],
    };

    // Sucker deployment: bridge USDC between chains
    // Ethereum/Sepolia deploys to all L2s; L2s deploy back to L1
    const isMainnet = chainId === 1 || chainId === 11155111;
    const l1ChainId = chainId === 11155111 ? 11155111 : 1;

    // Helper: build token mappings for a sucker (local USDC ↔ remote USDC)
    const suckerMappings = (remoteChainId: number) => [
      {
        localToken: usdcAddress,
        minGas: 200_000,
        remoteToken: USDC_ADDRESSES[remoteChainId] as Address,
        minBridgeAmount: BigInt('1000000'), // 1 USDC (6 decimals)
      },
    ];

    // Map L2 chain IDs to their testnet equivalents for sucker deployer selection
    const opChainId = chainId >= 11155111 ? 11155420 : 10;
    const baseChainId = chainId >= 11155111 ? 84532 : 8453;
    const arbChainId = chainId >= 11155111 ? 421614 : 42161;

    let deployerConfigurations: { deployer: Address; mappings: ReturnType<typeof suckerMappings> }[];
    if (isMainnet) {
      deployerConfigurations = [
        { deployer: JB_OPTIMISM_SUCKER_DEPLOYER as Address, mappings: suckerMappings(opChainId) },
        { deployer: JB_BASE_SUCKER_DEPLOYER as Address, mappings: suckerMappings(baseChainId) },
        { deployer: JB_ARBITRUM_SUCKER_DEPLOYER as Address, mappings: suckerMappings(arbChainId) },
      ];
    } else {
      // L2 → L1: use the deployer for this specific L2
      const deployer =
        chainId === 10 || chainId === 11155420 ? JB_OPTIMISM_SUCKER_DEPLOYER :
        chainId === 8453 || chainId === 84532 ? JB_BASE_SUCKER_DEPLOYER :
        JB_ARBITRUM_SUCKER_DEPLOYER;
      deployerConfigurations = [
        { deployer: deployer as Address, mappings: suckerMappings(l1ChainId) },
      ];
    }

    const suckerDeploymentConfiguration = {
      deployerConfigurations,
      salt,
    };

    const tiered721HookConfiguration = {
      baseline721HookConfiguration: {
        name: config.name,
        symbol: config.ticker,
        baseUri: '',
        tokenUriResolver: ZERO_ADDRESS as Address,
        contractUri: '',
        tiersConfig: {
          tiers: [],
          currency: USD_CURRENCY,
          decimals: 18,
          prices: JB_PRICES as Address,
        },
        reserveBeneficiary: ZERO_ADDRESS as Address,
        flags: {
          noNewTiersWithReserves: false,
          noNewTiersWithVotes: false,
          noNewTiersWithOwnerMinting: false,
          preventOverspending: false,
        },
      },
      salt: ZERO_BYTES32,
      splitOperatorCanAdjustTiers: true,
      splitOperatorCanUpdateMetadata: true,
      splitOperatorCanMint: true,
      splitOperatorCanIncreaseDiscountPercent: true,
    };

    // Log full ABI and args for debugging (BigInt-safe serializer)
    const stringify = (obj: unknown) => JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
    console.log('[encoder] === FULL ABI ===');
    console.log(stringify(REV_DEPLOYER_ABI));
    console.log('[encoder] === ARGS (JSON) ===');
    console.log(stringify({
      revnetId: '0',
      configuration,
      terminalConfigurations,
      buybackHookConfiguration,
      suckerDeploymentConfiguration,
      tiered721HookConfiguration,
      allowedPosts: [],
    }));
    console.log('[encoder] === TARGET ===');
    console.log(stringify({ to: REV_DEPLOYER_ADDRESS, chainId }));

    const data = encodeFunctionData({
      abi: REV_DEPLOYER_ABI,
      functionName: 'deployWith721sFor',
      args: [
        0n, // revnetId = 0 for new deployment
        configuration as any,
        terminalConfigurations,
        buybackHookConfiguration,
        suckerDeploymentConfiguration,
        tiered721HookConfiguration as any,
        [], // allowedPosts
      ],
    });

    return {
      to: REV_DEPLOYER_ADDRESS,
      data,
      value: '0x0',
      chainId,
    };
  });
}
