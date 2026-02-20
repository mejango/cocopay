import AsyncStorage from '@react-native-async-storage/async-storage';
import { BENDYSTRAW_ENDPOINT, DEFAULT_WALLET_ADDRESS, JB_TOKENS, getChainById } from '../constants/juicebox';
import type { Revnet, BendystrawParticipant, WalletQueryResponse } from '../types/revnet';

// Cache for token symbols (chainId-projectId -> symbol)
// Token symbols never change after deployment, so cache permanently in AsyncStorage
const TOKEN_SYMBOL_CACHE_KEY = '@cocopay/token_symbols';
let tokenSymbolCache: Record<string, string> = {};
let cacheLoaded = false;

// Load cached symbols from AsyncStorage
async function loadTokenSymbolCache(): Promise<void> {
  if (cacheLoaded) return;
  try {
    const cached = await AsyncStorage.getItem(TOKEN_SYMBOL_CACHE_KEY);
    if (cached) {
      tokenSymbolCache = JSON.parse(cached);
      console.log(`[TokenCache] Loaded ${Object.keys(tokenSymbolCache).length} cached symbols`);
    }
    cacheLoaded = true;
  } catch (error) {
    console.log('[TokenCache] Failed to load cache:', error);
    cacheLoaded = true;
  }
}

// Save token symbol to persistent cache
async function saveTokenSymbol(key: string, symbol: string): Promise<void> {
  tokenSymbolCache[key] = symbol;
  try {
    await AsyncStorage.setItem(TOKEN_SYMBOL_CACHE_KEY, JSON.stringify(tokenSymbolCache));
  } catch (error) {
    console.log('[TokenCache] Failed to save:', error);
  }
}

// Make RPC call with fallback to multiple endpoints and timeout
async function rpcCall(rpcUrls: readonly string[], to: string, data: string): Promise<string | null> {
  for (const rpcUrl of rpcUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to, data }, 'latest'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`[rpcCall] ${rpcUrl} returned ${response.status}`);
        continue;
      }

      const result = await response.json();
      if (result.error) {
        console.log(`[rpcCall] ${rpcUrl} error:`, result.error);
        continue;
      }

      if (result.result && result.result !== '0x') {
        console.log(`[rpcCall] ${rpcUrl} success for ${to.slice(0, 10)}...`);
        return result.result;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[rpcCall] ${rpcUrl} failed: ${errorMsg}`);
      continue;
    }
  }
  return null;
}

// Decode ABI-encoded string from eth_call result
function decodeString(hexResult: string): string | null {
  try {
    const hex = hexResult.slice(2);
    if (hex.length < 128) return null;

    // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
    const length = parseInt(hex.slice(64, 128), 16);
    if (length === 0 || length > 100) return null; // Sanity check

    const symbolHex = hex.slice(128, 128 + length * 2);

    // Convert hex to string (React Native compatible)
    let symbol = '';
    for (let i = 0; i < symbolHex.length; i += 2) {
      const charCode = parseInt(symbolHex.slice(i, i + 2), 16);
      if (charCode > 0) symbol += String.fromCharCode(charCode);
    }

    return symbol || null;
  } catch {
    return null;
  }
}

// Fetch token symbol from JBTokens contract -> ERC20 token -> symbol()
async function fetchTokenSymbolFromChain(projectId: number, chainId: number): Promise<string | null> {
  const chain = getChainById(chainId);
  if (!chain) {
    console.log(`[fetchTokenSymbol] No chain config for chainId ${chainId}`);
    return null;
  }

  console.log(`[fetchTokenSymbol] Fetching token for project ${projectId} on ${chain.name}...`);

  try {
    // Call JBTokens.tokenOf(projectId) to get the ERC20 token address
    // Function selector: 0xea78803f = keccak256("tokenOf(uint256)")[0:4]
    const tokenOfData = `0xea78803f${projectId.toString(16).padStart(64, '0')}`;
    console.log(`[fetchTokenSymbol] JBTokens.tokenOf(${projectId}) calldata: ${tokenOfData}`);
    const tokenResult = await rpcCall(chain.rpcUrls, JB_TOKENS, tokenOfData);
    console.log(`[fetchTokenSymbol] tokenOf result: ${tokenResult?.slice(0, 66)}...`);

    if (!tokenResult || tokenResult === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log(`[fetchTokenSymbol] No ERC20 token deployed for project ${projectId}`);
      return null;
    }

    const tokenAddress = '0x' + tokenResult.slice(26);
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      console.log(`[fetchTokenSymbol] Token address is zero for project ${projectId}`);
      return null;
    }

    console.log(`[fetchTokenSymbol] Token address: ${tokenAddress}`);

    // Call symbol() on the ERC20 token (0x95d89b41 = keccak256("symbol()"))
    const symbolResult = await rpcCall(chain.rpcUrls, tokenAddress, '0x95d89b41');

    if (!symbolResult) {
      console.log(`[fetchTokenSymbol] symbol() call failed for ${tokenAddress}`);
      return null;
    }

    const symbol = decodeString(symbolResult);
    console.log(`[fetchTokenSymbol] Decoded symbol: "${symbol}"`);
    return symbol;
  } catch (error) {
    console.log(`[fetchTokenSymbol] Error for project ${projectId} on chain ${chainId}:`, error);
    return null;
  }
}

// Get token symbol - fetch from chain or generate from name
// NOTE: Bendystraw's tokenSymbol is the accounting currency (ETH/USDC), NOT the project's issued token
async function getTokenSymbol(projectId: number, chainId: number, name: string): Promise<string> {
  const key = `${chainId}-${projectId}`;

  // Ensure cache is loaded from AsyncStorage
  await loadTokenSymbolCache();

  // Check cache first
  if (tokenSymbolCache[key]) {
    console.log(`[getTokenSymbol] Cache hit: ${key} -> ${tokenSymbolCache[key]}`);
    return tokenSymbolCache[key];
  }

  console.log(`[getTokenSymbol] Fetching symbol for project ${projectId} on chain ${chainId} (${name})`);

  // Try to fetch from chain (JBTokens.tokenOf -> ERC20.symbol)
  const symbol = await fetchTokenSymbolFromChain(projectId, chainId);
  if (symbol) {
    await saveTokenSymbol(key, symbol);
    console.log(`[getTokenSymbol] SUCCESS from chain: ${key} -> ${symbol}`);
    return symbol;
  }

  // Fall back to generating from name (don't persist generated symbols)
  const generated = generateTokenSymbol(name);
  console.log(`[getTokenSymbol] FALLBACK generated: ${key} -> ${generated} (chain fetch failed)`);
  return generated;
}

// Mock data for development (used when API fails or no revnets found)
const MOCK_REVNETS: Revnet[] = [
  {
    projectId: 1,
    chainId: 1,
    name: 'Juicebox',
    tokenSymbol: 'JBX',
    logoUri: null,
    balance: '125000000000000000000000',
    balanceFormatted: '125000',
    treasuryBalance: '500000000000000000000',
    tokenSupply: '1000000000000000000000000',
    volume: '15000000000000000000000',
    suckerGroupId: 'mock-jbx-group',
    cashOutValueEth: 62.5,
    cashOutValueUsd: 156250,
    decimals: 18,
    currency: 1,
  },
  {
    projectId: 2,
    chainId: 8453,
    name: 'Bananapus',
    tokenSymbol: 'NANA',
    logoUri: null,
    balance: '50000000000000000000000',
    balanceFormatted: '50000',
    treasuryBalance: '200000000000000000000',
    tokenSupply: '500000000000000000000000',
    volume: '8000000000000000000000',
    suckerGroupId: 'mock-nana-group',
    cashOutValueEth: 20,
    cashOutValueUsd: 50000,
    decimals: 18,
    currency: 1,
  },
  {
    projectId: 3,
    chainId: 10,
    name: 'Revnet DAO',
    tokenSymbol: 'REV',
    logoUri: null,
    balance: '10000000000000000000000',
    balanceFormatted: '10000',
    treasuryBalance: '75000000000000000000',
    tokenSupply: '100000000000000000000000',
    volume: '3500000000000000000000',
    suckerGroupId: 'mock-rev-group',
    cashOutValueEth: 7.5,
    cashOutValueUsd: 18750,
    decimals: 18,
    currency: 1,
  },
  {
    projectId: 4,
    chainId: 42161,
    name: 'Defifa',
    tokenSymbol: 'DEFA',
    logoUri: null,
    balance: '2500000000000000000000',
    balanceFormatted: '2500',
    treasuryBalance: '25000000000000000000',
    tokenSupply: '50000000000000000000000',
    volume: '1200000000000000000000',
    suckerGroupId: 'mock-defa-group',
    cashOutValueEth: 1.25,
    cashOutValueUsd: 3125,
    decimals: 18,
    currency: 1,
  },
];

// GraphQL query to get all token holdings for a wallet across all chains
const USER_REVNETS_QUERY = `
  query UserWallet($address: String!) {
    wallet(address: $address) {
      participants(limit: 100) {
        items {
          projectId
          chainId
          balance
          project {
            name
            logoUri
            tokenSymbol
            balance
            volume
            volumeUsd
            tokenSupply
            suckerGroupId
            version
            decimals
            currency
          }
        }
      }
    }
  }
`;

// GraphQL query to get suckerGroupId for a project
const PROJECT_SUCKER_GROUP_QUERY = `
  query ProjectSuckerGroup($projectId: Float!, $chainId: Float!, $version: Float!) {
    project(projectId: $projectId, chainId: $chainId, version: $version) {
      suckerGroupId
    }
  }
`;

// GraphQL query to get historical snapshots via suckerGroupMoments
const SUCKER_GROUP_MOMENTS_QUERY = `
  query SuckerGroupMoments($suckerGroupId: String!, $startTimestamp: Int!, $limit: Int!) {
    suckerGroupMoments(
      where: { suckerGroupId: $suckerGroupId, timestamp_gte: $startTimestamp }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        timestamp
        volume
        volumeUsd
        balance
      }
    }
  }
`;

export interface TimelineMoment {
  timestamp: number;
  volume: string;
  volumeUsd: string;
  balance: string;
}

interface ProjectSuckerGroupResponse {
  project: {
    suckerGroupId: string | null;
  } | null;
}

interface SuckerGroupMomentsResponse {
  suckerGroupMoments: {
    items: TimelineMoment[];
  };
}

// GraphQL query for participant balance history (V5 only)
const PARTICIPANT_SNAPSHOTS_QUERY = `
  query ParticipantSnapshots($projectId: Int!, $chainId: Int!, $version: Int!, $address: String!, $startTimestamp: Int!, $limit: Int!) {
    participantSnapshots(
      where: { projectId: $projectId, chainId: $chainId, version: $version, address: $address, timestamp_gte: $startTimestamp }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        timestamp
        balance
      }
    }
  }
`;

interface ParticipantSnapshot {
  timestamp: number;
  balance: string;
}

interface ParticipantSnapshotsResponse {
  participantSnapshots: {
    items: ParticipantSnapshot[];
  };
}

// Fetch current ETH price in USD
let cachedEthPrice: { price: number; timestamp: number } | null = null;
const ETH_PRICE_CACHE_MS = 5 * 60 * 1000; // 5 minutes

async function getEthPriceUsd(): Promise<number> {
  // Return cached price if fresh
  if (cachedEthPrice && Date.now() - cachedEthPrice.timestamp < ETH_PRICE_CACHE_MS) {
    return cachedEthPrice.price;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
    );
    const data = await response.json();
    const price = data.ethereum?.usd || 2500; // Fallback to $2500
    cachedEthPrice = { price, timestamp: Date.now() };
    return price;
  } catch (error) {
    console.log('[getEthPriceUsd] Failed to fetch, using fallback:', error);
    return cachedEthPrice?.price || 2500;
  }
}

// Calculate cash out value based on bonding curve
// cashOutValue = (userBalance / tokenSupply) * treasuryBalance
// decimals: 18 for ETH, 6 for USDC
function calculateCashOutValue(
  userBalance: bigint,
  tokenSupply: bigint,
  treasuryBalance: bigint,
  decimals: number = 18
): number {
  if (tokenSupply === BigInt(0)) return 0;

  // Calculate in high precision then convert to human-readable
  const cashOutWei = (userBalance * treasuryBalance) / tokenSupply;
  const divisor = 10 ** decimals;
  return Number(cashOutWei) / divisor;
}

// Format balance from 18 decimals to human-readable
function formatTokenBalance(balance: string): string {
  try {
    const balanceBigInt = BigInt(balance);
    const decimals = 18;
    const divisor = BigInt(10 ** decimals);
    const whole = balanceBigInt / divisor;
    const fraction = balanceBigInt % divisor;

    // Format with up to 2 decimal places
    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 2);
    const fractionNum = parseInt(fractionStr, 10);

    if (fractionNum === 0) {
      return whole.toString();
    }

    // Remove trailing zeros
    const cleanFraction = fractionStr.replace(/0+$/, '');
    return `${whole}.${cleanFraction}`;
  } catch {
    return '0';
  }
}

// Resolve logo URI - convert IPFS URIs to gateway URLs
function resolveLogoUri(uri: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`;
  }
  if (uri.startsWith('https://') || uri.startsWith('http://')) {
    return uri;
  }
  // Bare CID
  if (/^Qm[a-zA-Z0-9]{44}/.test(uri) || /^bafy[a-zA-Z0-9]+/.test(uri)) {
    return `https://gateway.pinata.cloud/ipfs/${uri}`;
  }
  return uri;
}

// Generate a token symbol from project name
// Bendystraw's tokenSymbol is the accounting currency (ETH/USDC), not the project token
function generateTokenSymbol(name: string): string {
  if (!name) return 'TOKEN';

  // Remove common words and get initials
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length === 1) {
    // Single word: take first 4-5 chars uppercase
    return words[0].slice(0, 5).toUpperCase();
  }

  // Multiple words: take first letter of each (up to 5)
  return words
    .slice(0, 5)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

// Execute a GraphQL query against Bendystraw
async function queryBendystraw<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  console.log('[Bendystraw] Fetching from:', BENDYSTRAW_ENDPOINT);
  console.log('[Bendystraw] Variables:', JSON.stringify(variables));

  const response = await fetch(BENDYSTRAW_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  console.log('[Bendystraw] Response status:', response.status);

  if (!response.ok) {
    throw new Error(`Bendystraw request failed: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors) {
    console.log('[Bendystraw] GraphQL errors:', JSON.stringify(json.errors));
    throw new Error(`GraphQL error: ${json.errors[0]?.message || 'Unknown error'}`);
  }

  console.log('[Bendystraw] Data received:', JSON.stringify(json.data).slice(0, 500));
  return json.data;
}

// Fetch all revnets where the user has a token balance
export async function fetchUserRevnets(
  address: string = DEFAULT_WALLET_ADDRESS,
  limit: number = 50
): Promise<Revnet[]> {
  console.log('[fetchUserRevnets] Starting fetch for address:', address);

  try {
    const data = await queryBendystraw<WalletQueryResponse>(
      USER_REVNETS_QUERY,
      { address: address.toLowerCase() }
    );

    console.log('[fetchUserRevnets] Wallet data:', data.wallet ? 'found' : 'null');

    if (!data.wallet) {
      console.log('[fetchUserRevnets] No wallet data found, returning mock data');
      return MOCK_REVNETS;
    }

    // Filter for V5 projects only and map
    console.log('[fetchUserRevnets] Raw participants:', data.wallet.participants.items.length);
    data.wallet.participants.items.forEach((p: BendystrawParticipant, i: number) => {
      console.log(`[fetchUserRevnets] Participant ${i}: ${p.project.name} (chain ${p.chainId}, v${p.project.version}, balance: ${p.balance}, logo: ${p.project.logoUri})`);
    });

    const v5Participants = data.wallet.participants.items.filter(
      (p: BendystrawParticipant) => p.project.version === 5 && BigInt(p.balance) > 0
    );

    console.log(`[fetchUserRevnets] Found ${data.wallet.participants.items.length} total participants, ${v5Participants.length} are V5 with balance > 0`);

    // Map all V5 projects
    const allParticipants = v5Participants.map((p: BendystrawParticipant) => {
      // Detect USDC projects by tokenSymbol (Bendystraw tokenSymbol is the accounting currency)
      const isUsdcProject = p.project.tokenSymbol === 'USDC' || p.project.currency === 2;

      return {
        projectId: p.projectId,
        chainId: p.chainId,
        name: p.project.name || `Project ${p.projectId}`,
        apiTokenSymbol: p.project.tokenSymbol,
        logoUri: resolveLogoUri(p.project.logoUri),
        balance: p.balance,
        treasuryBalance: p.project.balance,
        tokenSupply: p.project.tokenSupply || '0',
        volume: p.project.volume,
        volumeUsd: p.project.volumeUsd,
        suckerGroupId: p.project.suckerGroupId,
        currency: isUsdcProject ? 2 : 1,
      };
    });

    console.log(`Found ${allParticipants.length} V5 participants for address`);

    // Aggregate by suckerGroupId (cross-chain revnets)
    const groupedByRevnet = new Map<string, typeof allParticipants>();

    for (const p of allParticipants) {
      // Use suckerGroupId if available, otherwise use chainId-projectId
      const groupKey = p.suckerGroupId || `${p.chainId}-${p.projectId}`;

      if (!groupedByRevnet.has(groupKey)) {
        groupedByRevnet.set(groupKey, []);
      }
      groupedByRevnet.get(groupKey)!.push(p);
    }

    // Fetch ETH price for USD conversion
    const ethPriceUsd = await getEthPriceUsd();
    console.log(`[fetchUserRevnets] ETH price: $${ethPriceUsd}`);

    // Build revnet data and collect symbol fetch promises
    const revnetDataList: Array<{
      first: typeof allParticipants[0];
      totalBalance: bigint;
      totalTreasuryBalance: bigint;
      totalTokenSupply: bigint;
      totalVolume: bigint;
      cashOutValueEth: number;
      cashOutValueUsd: number;
      currency: number;
    }> = [];

    for (const [groupKey, participants] of groupedByRevnet) {
      // Sum balances across all chains
      let totalBalance = BigInt(0);
      let totalTreasuryBalance = BigInt(0);
      let totalTokenSupply = BigInt(0);
      let totalVolume = BigInt(0);

      for (const p of participants) {
        totalBalance += BigInt(p.balance);
        totalTreasuryBalance += BigInt(p.treasuryBalance || '0');
        totalTokenSupply += BigInt(p.tokenSupply || '0');
        totalVolume += BigInt(p.volume || '0');
      }

      const first = participants[0];

      // Detect USDC projects by tokenSymbol (Bendystraw tokenSymbol is the accounting currency)
      const isUsdcProject = first.currency === 2 || first.apiTokenSymbol === 'USDC';

      // For USDC projects: treasury is in 6 decimals, result is in USD
      // For ETH projects: treasury is in 18 decimals, result is in ETH
      const treasuryDecimals = isUsdcProject ? 6 : 18;
      const cashOutValue = calculateCashOutValue(totalBalance, totalTokenSupply, totalTreasuryBalance, treasuryDecimals);

      // For USDC projects, value is already in USD
      // For ETH projects, convert to USD using ETH price
      const cashOutValueEth = isUsdcProject ? 0 : cashOutValue;
      const cashOutValueUsd = isUsdcProject ? cashOutValue : cashOutValue * ethPriceUsd;

      console.log(`[fetchUserRevnets] ${first.name}: isUsdc=${isUsdcProject}, decimals=${treasuryDecimals}, cashOut=${cashOutValue}, usd=${cashOutValueUsd}`);

      revnetDataList.push({ first, totalBalance, totalTreasuryBalance, totalTokenSupply, totalVolume, cashOutValueEth, cashOutValueUsd, currency: isUsdcProject ? 2 : 1 });
    }

    // Fetch all token symbols in parallel (prefer API symbol from Bendystraw)
    const tokenSymbols = await Promise.all(
      revnetDataList.map(({ first }) => getTokenSymbol(first.projectId, first.chainId, first.name))
    );

    // Build final revnets array
    const revnets: Revnet[] = revnetDataList.map((data, i) => ({
      projectId: data.first.projectId,
      chainId: data.first.chainId,
      name: data.first.name,
      tokenSymbol: tokenSymbols[i],
      logoUri: data.first.logoUri,
      balance: data.totalBalance.toString(),
      balanceFormatted: formatTokenBalance(data.totalBalance.toString()),
      treasuryBalance: data.totalTreasuryBalance.toString(),
      tokenSupply: data.totalTokenSupply.toString(),
      volume: data.totalVolume.toString(),
      suckerGroupId: data.first.suckerGroupId,
      cashOutValueEth: data.cashOutValueEth,
      cashOutValueUsd: data.cashOutValueUsd,
      decimals: 18, // Bendystraw always uses 18 decimal format
      currency: data.currency,
    }));

    console.log(`[fetchUserRevnets] Aggregated to ${revnets.length} revnets across chains`);
    revnets.forEach((r, i) => {
      console.log(`[fetchUserRevnets] Revnet ${i}: ${r.name} - ${r.balanceFormatted} ${r.tokenSymbol} (chain ${r.chainId})`);
    });

    // If no projects found, return mock data for demo
    if (revnets.length === 0) {
      console.log('[fetchUserRevnets] No V5 projects found for address, using mock data for demo');
      return MOCK_REVNETS;
    }

    // Sort by cash out value descending
    revnets.sort((a, b) => b.cashOutValueUsd - a.cashOutValueUsd);

    return revnets;
  } catch (error) {
    console.error('Failed to fetch from Bendystraw, using mock data:', error);
    return MOCK_REVNETS;
  }
}

// Query to fetch project stats (version 5 = V5/revnets)
const PROJECT_STATS_QUERY = `
  query ProjectStats($projectId: Float!, $chainId: Float!, $version: Float!) {
    project(projectId: $projectId, chainId: $chainId, version: $version) {
      projectId
      chainId
      name
      tokenSymbol
      balance
      volume
      volumeUsd
      paymentsCount
      contributorsCount
      createdAt
      decimals
      currency
    }
  }
`;

// Query to fetch recent pay events for a project (V5 only)
const PROJECT_PAY_EVENTS_QUERY = `
  query ProjectPayEvents($projectId: Int!, $chainId: Int!, $version: Int!, $limit: Int) {
    payEvents(
      where: { projectId: $projectId, chainId: $chainId, version: $version }
      limit: $limit
      orderBy: "timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        amount
        timestamp
        beneficiary
        from
      }
    }
  }
`;

// Query to fetch user's pay events for a project (V5 only)
const USER_PAY_EVENTS_QUERY = `
  query UserPayEvents($projectId: Int!, $chainId: Int!, $version: Int!, $from: String!, $limit: Int) {
    payEvents(
      where: { projectId: $projectId, chainId: $chainId, version: $version, from: $from }
      limit: $limit
      orderBy: "timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        amount
        timestamp
        beneficiary
        from
      }
    }
  }
`;

export interface ProjectStats {
  projectId: number;
  chainId: number;
  name: string;
  tokenSymbol: string;
  treasuryBalance: string;
  treasuryBalanceFormatted: string;
  volume: string;
  volumeFormatted: string;
  volumeUsd: number; // Pre-calculated USD value from Bendystraw
  paymentsCount: number;
  contributorsCount: number;
  createdAt: number;
}

export interface PayEvent {
  id: string;
  amount: string;
  timestamp: number;
  beneficiary: string;
  from: string;
}

interface ProjectStatsResponse {
  project: {
    projectId: number;
    chainId: number;
    name: string | null;
    tokenSymbol: string | null;
    balance: string;
    volume: string;
    volumeUsd: string | null; // 18 decimal format
    paymentsCount: number;
    contributorsCount: number;
    createdAt: number;
    decimals: number | null;
    currency: number | null;
  } | null;
}

interface PayEventsResponse {
  payEvents: {
    items: PayEvent[];
  };
}

// Mock project stats for development
function getMockProjectStats(projectId: number, chainId: number): ProjectStats {
  const mockRevnet = MOCK_REVNETS.find(r => r.projectId === projectId && r.chainId === chainId)
    || MOCK_REVNETS[0];

  return {
    projectId: mockRevnet.projectId,
    chainId: mockRevnet.chainId,
    name: mockRevnet.name,
    tokenSymbol: mockRevnet.tokenSymbol,
    treasuryBalance: mockRevnet.treasuryBalance,
    treasuryBalanceFormatted: formatTokenBalance(mockRevnet.treasuryBalance),
    volume: mockRevnet.volume,
    volumeFormatted: formatTokenBalance(mockRevnet.volume),
    volumeUsd: mockRevnet.cashOutValueUsd * 10, // Mock: 10x cash out value
    paymentsCount: Math.floor(Math.random() * 500) + 50,
    contributorsCount: Math.floor(Math.random() * 200) + 20,
    createdAt: Date.now() / 1000 - 86400 * 365, // 1 year ago
  };
}

// Fetch project stats
export async function fetchProjectStats(
  projectId: number,
  chainId: number
): Promise<ProjectStats | null> {
  console.log(`[fetchProjectStats] Fetching stats for projectId: ${projectId}, chainId: ${chainId}, version: 5`);
  try {
    const data = await queryBendystraw<ProjectStatsResponse>(
      PROJECT_STATS_QUERY,
      { projectId, chainId, version: 5 }
    );

    console.log(`[fetchProjectStats] API response:`, JSON.stringify(data).slice(0, 500));

    if (!data.project) {
      console.log('[fetchProjectStats] No project data, falling back to mock');
      return getMockProjectStats(projectId, chainId);
    }

    const p = data.project;

    // Detect if this is a USDC project
    const isUsdcProject = p.tokenSymbol === 'USDC' || p.currency === 2;
    console.log(`[fetchProjectStats] Project ${p.name}: tokenSymbol=${p.tokenSymbol}, currency=${p.currency}, decimals=${p.decimals}, isUsdc=${isUsdcProject}`);

    // volumeUsd from Bendystraw is in 18 decimal format - convert to number
    // Example: "86408211137289181422099" represents $86,408.21
    let volumeUsd = 0;
    if (p.volumeUsd) {
      try {
        const raw = BigInt(p.volumeUsd.split('.')[0]);
        // Divide by 10^16 to preserve 2 decimal places, then convert to Number and divide by 100
        volumeUsd = Number(raw / BigInt(10 ** 16)) / 100;
        console.log(`[fetchProjectStats] volumeUsd raw: ${p.volumeUsd}, parsed: $${volumeUsd}`);
      } catch (e) {
        console.log(`[fetchProjectStats] Failed to parse volumeUsd: ${p.volumeUsd}`, e);
        volumeUsd = 0;
      }
    } else {
      console.log(`[fetchProjectStats] No volumeUsd returned from API`);
    }

    // Fallback for USDC projects: if volumeUsd is 0, use raw volume (which is in USDC)
    if (volumeUsd === 0 && isUsdcProject && p.volume) {
      try {
        // For USDC projects, volume is in 6 decimal format
        const rawVolume = BigInt(p.volume.split('.')[0]);
        volumeUsd = Number(rawVolume) / 1e6;
        console.log(`[fetchProjectStats] Using raw volume for USDC project: ${p.volume} -> $${volumeUsd}`);
      } catch (e) {
        console.log(`[fetchProjectStats] Failed to parse raw volume: ${p.volume}`, e);
      }
    }

    return {
      projectId: p.projectId,
      chainId: p.chainId,
      name: p.name || `Project ${p.projectId}`,
      tokenSymbol: p.tokenSymbol || 'TOKEN',
      treasuryBalance: p.balance,
      treasuryBalanceFormatted: formatTokenBalance(p.balance),
      volume: p.volume,
      volumeFormatted: formatTokenBalance(p.volume),
      volumeUsd,
      paymentsCount: p.paymentsCount,
      contributorsCount: p.contributorsCount,
      createdAt: p.createdAt,
    };
  } catch (error) {
    console.error('Failed to fetch project stats, using mock data:', error);
    return getMockProjectStats(projectId, chainId);
  }
}

// Fetch recent pay events for a project
export async function fetchProjectPayEvents(
  projectId: number,
  chainId: number,
  limit: number = 30
): Promise<PayEvent[]> {
  try {
    const data = await queryBendystraw<PayEventsResponse>(
      PROJECT_PAY_EVENTS_QUERY,
      { projectId, chainId, version: 5, limit }
    );

    return data.payEvents.items;
  } catch (error) {
    console.error('Failed to fetch pay events:', error);
    return [];
  }
}

// Fetch user's pay events for a project (payments made by this address)
export async function fetchUserPayEvents(
  projectId: number,
  chainId: number,
  userAddress: string,
  limit: number = 100
): Promise<PayEvent[]> {
  try {
    const data = await queryBendystraw<PayEventsResponse>(
      USER_PAY_EVENTS_QUERY,
      { projectId, chainId, version: 5, from: userAddress.toLowerCase(), limit }
    );

    return data.payEvents.items;
  } catch (error) {
    console.error('Failed to fetch user pay events:', error);
    return [];
  }
}

export interface GraphData {
  values: number[];
  labels: string[];
}

// Generate graph data from pay events (cumulative count over time)
export function generatePaymentsGraphData(
  events: PayEvent[],
  buckets: number = 10,
  days: number = 30
): GraphData {
  const now = Date.now();
  const startMs = now - days * 24 * 60 * 60 * 1000;
  const interval = (now - startMs) / buckets;

  const labels: string[] = [];

  // Count total events before the time range (baseline)
  let baselineCount = 0;
  for (const event of events) {
    if (event.timestamp * 1000 < startMs) {
      baselineCount++;
    }
  }

  // Generate cumulative counts for each bucket
  const values: number[] = [];
  let cumulativeCount = baselineCount;

  for (let i = 0; i < buckets; i++) {
    const bucketStart = startMs + interval * i;
    const bucketEnd = startMs + interval * (i + 1);
    labels.push(formatDateRange(bucketStart, bucketEnd, days));

    // Count events in this bucket and add to cumulative
    for (const event of events) {
      const eventTime = event.timestamp * 1000;
      if (eventTime >= bucketStart && eventTime < bucketEnd) {
        cumulativeCount++;
      }
    }

    values.push(cumulativeCount);
  }

  return { values, labels };
}

// Helper to convert 18-decimal volumeUsd to number
function parseVolumeUsd(volumeUsd: string | undefined): number {
  if (!volumeUsd) return 0;
  try {
    const raw = BigInt(volumeUsd.split('.')[0]);
    return Number(raw / BigInt(10 ** 16)) / 100;
  } catch {
    return 0;
  }
}

export interface TimelineData {
  volume: number[];
  balance: number[];
  labels: string[]; // Time period labels for each bar (e.g., "Jan 15-22")
}

// Format date range for a time bucket
function formatDateRange(startMs: number, endMs: number, days: number): string {
  const start = new Date(startMs);
  const end = new Date(endMs);

  const formatDate = (d: Date) => {
    const day = d.getDate();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${day} ${months[d.getMonth()]}`;
  };

  // For short ranges (< 7 days per bucket), show single date
  const bucketDays = days / 10;
  if (bucketDays < 7) {
    return formatDate(end);
  }

  // For longer ranges, show date range
  return `${formatDate(start)} - ${formatDate(end)}`;
}

// Fetch project timeline (historical volume/balance snapshots via suckerGroupMoments)
export async function fetchProjectTimeline(
  projectId: number,
  chainId: number,
  days: number = 30,
  fallbackVolumeUsd?: number, // Provide current volume as fallback for single-chain projects
  isUsdcProject: boolean = false // Whether this is a USDC-denominated project
): Promise<TimelineData> {
  try {
    // First, get the suckerGroupId for the project
    const projectData = await queryBendystraw<ProjectSuckerGroupResponse>(
      PROJECT_SUCKER_GROUP_QUERY,
      { projectId, chainId, version: 5 }
    );

    const suckerGroupId = projectData.project?.suckerGroupId;
    if (!suckerGroupId) {
      console.log('[fetchProjectTimeline] No suckerGroupId found for project, using fallback');
      // For single-chain projects, show a flat line with the current volume
      if (fallbackVolumeUsd && fallbackVolumeUsd > 0) {
        const points = 10;
        const now = Date.now();
        const startMs = now - days * 24 * 60 * 60 * 1000;
        const interval = (now - startMs) / points;
        const labels: string[] = [];
        for (let i = 0; i < points; i++) {
          const bucketStart = startMs + interval * i;
          const bucketEnd = startMs + interval * (i + 1);
          labels.push(formatDateRange(bucketStart, bucketEnd, days));
        }
        // Show cumulative volume as flat line (we don't have historical data)
        const volumeData = new Array(points).fill(fallbackVolumeUsd);
        return { volume: volumeData, balance: [], labels };
      }
      return { volume: [], balance: [], labels: [] };
    }

    // Fetch suckerGroupMoments for the timeline - get more to find baseline
    const startTimestamp = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
    // Also fetch moments from before the time range to get baseline
    const baselineTimestamp = Math.floor(Date.now() / 1000) - days * 2 * 24 * 60 * 60;

    const data = await queryBendystraw<SuckerGroupMomentsResponse>(
      SUCKER_GROUP_MOMENTS_QUERY,
      { suckerGroupId, startTimestamp: baselineTimestamp, limit: 200 }
    );

    const moments = data.suckerGroupMoments.items;

    if (moments.length === 0) {
      console.log('[fetchProjectTimeline] No moments found for suckerGroup');
      return { volume: [], balance: [], labels: [] };
    }

    console.log(`[fetchProjectTimeline] Found ${moments.length} moments for ${days} day range, isUsdcProject=${isUsdcProject}`);
    // Log first and last moment for debugging
    const firstMomentRaw = moments[0];
    const lastMomentRaw = moments[moments.length - 1];
    console.log(`[fetchProjectTimeline] First moment: volume=${firstMomentRaw.volume}, volumeUsd=${firstMomentRaw.volumeUsd}`);
    console.log(`[fetchProjectTimeline] Last moment: volume=${lastMomentRaw.volume}, volumeUsd=${lastMomentRaw.volumeUsd}`);

    // Get ETH price for USD conversion
    const ethPrice = await getEthPriceUsd();

    // Convert moments to 10 evenly-spaced data points for the graph
    // Show DELTA volume (new volume in each period) for meaningful visualization
    const points = 10;
    const now = Date.now();
    const startMs = startTimestamp * 1000;
    const interval = (now - startMs) / points;

    // Find the first moment to use as fallback for early time buckets
    const firstMoment = moments[0];

    const volumeData: number[] = [];
    const balanceData: number[] = [];
    const labels: string[] = [];

    for (let i = 0; i < points; i++) {
      const bucketStart = startMs + interval * i;
      const bucketEnd = startMs + interval * (i + 1);

      // Generate label for this time bucket
      labels.push(formatDateRange(bucketStart, bucketEnd, days));

      // Find the closest moment at or before this time
      let closest = firstMoment;
      for (const m of moments) {
        if (m.timestamp * 1000 <= bucketEnd) {
          closest = m;
        } else {
          break;
        }
      }

      // Use cumulative volume (total up to this point)
      // For USDC projects, use raw volume (6 decimals) since volumeUsd may be missing/incorrect
      let cumulativeVolume: number;
      if (isUsdcProject && closest.volume) {
        const rawVolume = BigInt(closest.volume.split('.')[0]);
        cumulativeVolume = Number(rawVolume) / 1e6;
      } else {
        cumulativeVolume = parseVolumeUsd(closest.volumeUsd);
      }
      volumeData.push(cumulativeVolume);

      // balance is in wei, convert to ETH then USD (cumulative treasury balance)
      const balanceWei = BigInt(closest.balance);
      const balanceEth = Number(balanceWei / BigInt(10 ** 16)) / 100;
      balanceData.push(balanceEth * ethPrice);
    }

    // Scale data proportionally if current value is higher than last moment
    // This preserves the growth pattern while ensuring accuracy
    const lastMomentVolume = volumeData[volumeData.length - 1] || 0;
    if (fallbackVolumeUsd && fallbackVolumeUsd > 0 && lastMomentVolume > 0) {
      // If current value is significantly higher than indexed data, scale proportionally
      const scaleFactor = fallbackVolumeUsd / lastMomentVolume;
      if (scaleFactor > 1.1) { // Only scale if >10% difference
        console.log(`[fetchProjectTimeline] Scaling historical data by ${scaleFactor.toFixed(2)}x (indexed: $${lastMomentVolume.toFixed(0)}, current: $${fallbackVolumeUsd.toFixed(0)})`);
        for (let i = 0; i < volumeData.length; i++) {
          volumeData[i] = volumeData[i] * scaleFactor;
        }
      }
    } else if (fallbackVolumeUsd && fallbackVolumeUsd > 0 && lastMomentVolume === 0) {
      // No historical data at all - show flat line with current value
      console.log(`[fetchProjectTimeline] No historical volume data, using flat line at $${fallbackVolumeUsd.toFixed(0)}`);
      volumeData.fill(fallbackVolumeUsd);
    }

    console.log(`[fetchProjectTimeline] Cumulative volume: ${volumeData.map(v => `$${v.toFixed(0)}`).join(', ')}`);
    return { volume: volumeData, balance: balanceData, labels };
  } catch (error) {
    console.error('Failed to fetch project timeline:', error);
    return { volume: [], balance: [], labels: [] };
  }
}

// Fetch user's balance history for a project
export async function fetchBalanceHistory(
  projectId: number,
  chainId: number,
  address: string,
  days: number = 30,
  currentBalance?: number // Pass current balance to fill recent periods
): Promise<GraphData> {
  try {
    // Query from further back to get baseline balance
    const startTimestamp = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
    const earlierTimestamp = Math.floor(Date.now() / 1000) - days * 2 * 24 * 60 * 60;

    const data = await queryBendystraw<ParticipantSnapshotsResponse>(
      PARTICIPANT_SNAPSHOTS_QUERY,
      { projectId, chainId, version: 5, address: address.toLowerCase(), startTimestamp: earlierTimestamp, limit: 200 }
    );

    const snapshots = data.participantSnapshots.items;
    console.log(`[fetchBalanceHistory] Found ${snapshots.length} snapshots, currentBalance: ${currentBalance}`);

    // Convert to 10 evenly-spaced data points
    const points = 10;
    const now = Date.now();
    const startMs = startTimestamp * 1000;
    const interval = (now - startMs) / points;

    const values: number[] = [];
    const labels: string[] = [];

    // If no snapshots but we have current balance, show flat line
    if (snapshots.length === 0) {
      if (currentBalance !== undefined && currentBalance > 0) {
        for (let i = 0; i < points; i++) {
          const bucketStart = startMs + interval * i;
          const bucketEnd = startMs + interval * (i + 1);
          labels.push(formatDateRange(bucketStart, bucketEnd, days));
          values.push(currentBalance);
        }
        return { values, labels };
      }
      return { values: [], labels: [] };
    }

    // Find earliest snapshot to know when participation started
    const earliestSnapshotMs = snapshots.length > 0 ? snapshots[0].timestamp * 1000 : now;

    // Build balance values for each time bucket
    // Before first snapshot: 0 (user had no participation)
    // After first snapshot: use snapshot data with carry-forward
    let lastKnownBalance = 0;

    for (let i = 0; i < points; i++) {
      const bucketStart = startMs + interval * i;
      const bucketEnd = startMs + interval * (i + 1);
      labels.push(formatDateRange(bucketStart, bucketEnd, days));

      // Find the most recent snapshot at or before this bucket's end
      for (const s of snapshots) {
        if (s.timestamp * 1000 <= bucketEnd) {
          const balance = Number(BigInt(s.balance) / BigInt(10 ** 16)) / 100;
          lastKnownBalance = balance;
        }
      }

      // For periods before first snapshot, show 0 (no participation yet)
      // For the last bucket, prefer currentBalance if available
      if (bucketEnd < earliestSnapshotMs) {
        values.push(0);
      } else if (i === points - 1 && currentBalance !== undefined) {
        values.push(currentBalance);
      } else {
        values.push(lastKnownBalance);
      }
    }

    // Forward fill: carry last known balance through to current
    // (handles gaps between snapshots within participation period)
    for (let i = 1; i < values.length; i++) {
      if (values[i] === 0 && values[i - 1] > 0 && (startMs + interval * i) >= earliestSnapshotMs) {
        values[i] = values[i - 1];
      }
    }

    console.log(`[fetchBalanceHistory] Balance values: ${values.map(v => v.toFixed(0)).join(', ')}`);
    return { values, labels };
  } catch (error) {
    console.error('Failed to fetch balance history:', error);
    return { values: [], labels: [] };
  }
}

// Export utility functions
export { formatTokenBalance, getEthPriceUsd };
