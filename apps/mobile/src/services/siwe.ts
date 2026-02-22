/**
 * SIWE (Sign-In With Ethereum) message builder.
 * Produces messages byte-identical to the backend's SiweService.build_message.
 */

const DOMAIN = 'cocopay.app';
const URI = `https://${DOMAIN}`;
const STATEMENT = 'Sign in to CocoPay to manage your account.';

export function generateSiweMessage(
  address: string,
  nonce: string,
  chainId: number
): string {
  const issuedAt = new Date().toISOString();

  return `${DOMAIN} wants you to sign in with your Ethereum account:\n${address}\n\n${STATEMENT}\n\nURI: ${URI}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}
