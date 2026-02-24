const DEV_API_URL = 'http://localhost:3000/v1';
const PROD_API_URL = 'https://api.cocopay.biz/v1';

const DEV_WS_URL = 'ws://localhost:3000/cable';
const PROD_WS_URL = 'wss://api.cocopay.biz/cable';

export const ENV = {
  API_URL: __DEV__ ? DEV_API_URL : PROD_API_URL,
  WS_URL: __DEV__ ? DEV_WS_URL : PROD_WS_URL,
  CHAIN_ENV: __DEV__ ? 'sepolia' : 'mainnet',
} as const;

export type ChainEnv = typeof ENV.CHAIN_ENV;
