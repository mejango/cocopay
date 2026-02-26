import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, ScrollView, useWindowDimensions, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { spacing, typography, useTheme } from '../src/theme';
import type { BrandTheme } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';
import { useBalanceStore } from '../src/stores/balance';
import { usePayment } from '../src/hooks/usePayment';
import type { SelectedToken } from '../src/hooks/usePayment';
import { storesApi } from '../src/api/stores';
import type { StoreDetails } from '../src/api/stores';
import type { Revnet } from '../src/types/revnet';
import { COCOPAY_ROUTER } from '../src/constants/juicebox';

interface PayableToken {
  id: string;
  name: string;
  short: string;
  balance: number; // cash out value in USD (currentReclaimableSurplusOf)
  chainId: number;
  projectId: number;
  rawBalance: string;
  logoUri: string | null;
}

// Convert revnets to payable token format using cash out USD value
function revnetsToPayableTokens(revnets: Revnet[]): PayableToken[] {
  return revnets
    .filter(r => parseFloat(r.balanceFormatted) > 0)
    .map(r => ({
      id: `${r.chainId}-${r.projectId}`,
      name: r.name,
      short: r.tokenSymbol,
      balance: r.cashOutValueUsd,
      chainId: r.chainId,
      projectId: r.projectId,
      rawBalance: r.balance,
      logoUri: r.logoUri,
    }));
}

// Distribute amount across selected tokens
function distributeAmount(
  total: number,
  selectedIds: string[],
  tokens: PayableToken[]
): Record<string, string> {
  const result: Record<string, string> = {};
  let remaining = total;

  for (const id of selectedIds) {
    const token = tokens.find(t => t.id === id);
    if (token && remaining > 0) {
      const useAmount = Math.min(remaining, token.balance);
      result[id] = useAmount.toFixed(2);
      remaining = Math.round((remaining - useAmount) * 100) / 100;
    } else if (token) {
      result[id] = '0.00';
    }
  }

  return result;
}

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ storeId: string; storeName: string; storeLogo: string; amount: string }>();
  const revnets = useBalanceStore((s) => s.revnets);
  const walletAddress = useBalanceStore((s) => s.walletAddress);
  const payableTokens = revnetsToPayableTokens(revnets);
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const [amount, setAmount] = useState(params.amount || '');
  const [tokenAmounts, setTokenAmounts] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);

  const { status: paymentStatus, confirmationCode, txHash, error: paymentError, pay, reset } = usePayment();
  const isActive = paymentStatus !== 'idle' && paymentStatus !== 'failed' && paymentStatus !== 'completed';

  // Fetch store details on mount (need owner_address and deployments)
  useEffect(() => {
    if (params.storeId) {
      storesApi.get(params.storeId).then(setStoreDetails).catch(console.error);
    }
  }, [params.storeId]);

  // Auto-select first token when user enters an amount
  useEffect(() => {
    const total = parseFloat(amount) || 0;
    if (total > 0 && !hasAutoSelected && selectedIds.length === 0 && payableTokens.length > 0) {
      setSelectedIds([payableTokens[0].id]);
      setHasAutoSelected(true);
    }
  }, [amount, hasAutoSelected, selectedIds.length, payableTokens]);

  // Redistribute when amount or selections change
  useEffect(() => {
    const total = parseFloat(amount) || 0;
    if (selectedIds.length > 0 && total > 0) {
      setTokenAmounts(distributeAmount(total, selectedIds, payableTokens));
    } else if (selectedIds.length === 0) {
      setTokenAmounts({});
    }
  }, [amount, selectedIds, payableTokens]);

  // Calculate total of selected tokens
  const selectedTotal = Object.values(tokenAmounts).reduce(
    (sum, val) => sum + (parseFloat(val) || 0), 0
  );
  const targetAmount = parseFloat(amount) || 0;
  const isBalanced = Math.abs(selectedTotal - targetAmount) < 0.01;

  const handleDismiss = () => {
    if (isActive) return;
    reset();
    router.back();
  };

  const handlePay = async () => {
    const payAmount = parseFloat(amount);

    if (isNaN(payAmount) || payAmount <= 0) {
      Alert.alert(t('payment.errorTitle'), t('payment.errorInvalidAmount'));
      return;
    }

    if (selectedIds.length === 0) {
      Alert.alert(t('payment.errorTitle'), t('payment.errorNoToken'));
      return;
    }

    if (!storeDetails?.owner_address) {
      Alert.alert(t('payment.errorTitle'), 'Store owner address not available');
      return;
    }

    if (!storeDetails.deployments || storeDetails.deployments.length === 0) {
      Alert.alert(t('payment.errorTitle'), 'Store has no active deployments');
      return;
    }

    // Pick the first deployment (or match by chainId if user selects one)
    const deployment = storeDetails.deployments[0];

    // Build selected tokens for the hook
    const selectedTokens: SelectedToken[] = selectedIds
      .filter(id => parseFloat(tokenAmounts[id] || '0') > 0)
      .map(id => {
        const token = payableTokens.find(t => t.id === id);
        if (!token) return null;
        const amountUsd = parseFloat(tokenAmounts[id] || '0');
        const revnet = revnets.find(r => `${r.chainId}-${r.projectId}` === id);

        // If this token matches the store's own revnet, it's a store token payment
        // Otherwise, treat as USDC (user's other revnet tokens get cashed out to USDC first)
        const isStoreToken = revnet && deployment.project_id === revnet.projectId;

        return {
          type: isStoreToken ? 'store_token' : 'usdc',
          amountUsd,
          revnet,
        } as SelectedToken;
      })
      .filter((t): t is SelectedToken => t !== null);

    if (selectedTokens.length === 0) return;

    await pay({
      storeId: params.storeId,
      amountUsd: payAmount,
      chainId: deployment.chain_id,
      ownerAddress: storeDetails.owner_address,
      deployment,
      selectedTokens,
      beneficiary: walletAddress,
    });
  };

  // Status overlay for active payment states
  if (paymentStatus === 'building' || paymentStatus === 'submitting') {
    return (
      <PageContainer>
        <View style={[styles.container, styles.overlayCenter]}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.overlayText}>
            {paymentStatus === 'building' ? 'Preparing payment...' : 'Submitting...'}
          </Text>
        </View>
      </PageContainer>
    );
  }

  if (paymentStatus === 'processing') {
    return (
      <PageContainer>
        <View style={[styles.container, styles.overlayCenter]}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.overlayText}>Processing payment</Text>
          {confirmationCode && (
            <Text style={styles.confirmationCode}>{confirmationCode}</Text>
          )}
          <Text style={styles.overlaySubtext}>This may take a moment...</Text>
        </View>
      </PageContainer>
    );
  }

  if (paymentStatus === 'completed') {
    return (
      <PageContainer>
        <View style={[styles.container, styles.overlayCenter]}>
          <Text style={styles.checkmark}>&#10003;</Text>
          <Text style={styles.overlayText}>Payment complete</Text>
          {confirmationCode && (
            <Text style={styles.confirmationCode}>{confirmationCode}</Text>
          )}
          {txHash && (
            <Text style={styles.overlaySubtext}>TX: {txHash.slice(0, 10)}...{txHash.slice(-6)}</Text>
          )}
          <Pressable
            style={({ pressed }) => [styles.payButton, { marginTop: spacing[6] }, pressed && styles.buttonPressed]}
            onPress={() => { reset(); router.back(); }}
          >
            <Text style={styles.payButtonText}>Done</Text>
          </Pressable>
        </View>
      </PageContainer>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <PageContainer>
        <View style={[styles.container, styles.overlayCenter]}>
          <Text style={[styles.overlayText, { color: theme.colors.accentSecondary }]}>Payment failed</Text>
          {paymentError && (
            <Text style={styles.overlaySubtext}>{paymentError}</Text>
          )}
          <Pressable
            style={({ pressed }) => [styles.payButton, { marginTop: spacing[6] }, pressed && styles.buttonPressed]}
            onPress={reset}
          >
            <Text style={styles.payButtonText}>Try Again</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [{ marginTop: spacing[3] }, pressed && styles.buttonPressed]}
            onPress={() => { reset(); router.back(); }}
          >
            <Text style={[styles.overlaySubtext, { textDecorationLine: 'underline' }]}>Go back</Text>
          </Pressable>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.container}>
        {/* Top Bar - back button (desktop only) */}
        {!isMobile && (
          <View style={styles.topBar}>
            <Pressable onPress={handleDismiss} style={styles.topBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </Pressable>
          </View>
        )}

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          {/* Centered Amount Input */}
          <View style={styles.amountSection}>
            {params.storeLogo ? (
              <Image source={{ uri: params.storeLogo }} style={styles.storeLogo} />
            ) : null}
            <Text style={styles.storeName}>{params.storeName}</Text>
            <TextInput
              style={[
                styles.amountInput,
                Platform.OS === 'web' && { outlineStyle: 'none' } as any,
              ]}
              value={amount ? `$${amount}` : ''}
              onChangeText={(text) => setAmount(text.replace(/^\$/, ''))}
              placeholder="$0.00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Token Selection */}
          <View style={styles.tokenSection}>
            <View style={styles.tokenSectionHeader}>
              <Text style={styles.tokenSectionLabel}>{t('payment.payWith')}</Text>
              {targetAmount > 0 && selectedIds.length > 0 && (
                <Text style={[styles.tokenSectionTotal, !isBalanced && styles.tokenSectionTotalWarning]}>
                  {selectedTotal.toFixed(2)} / {targetAmount.toFixed(2)}
                </Text>
              )}
            </View>

            {payableTokens.length === 0 ? (
              <View style={styles.noTokens}>
                <Text style={styles.noTokensText}>{t('payment.noTokens')}</Text>
                <Text style={styles.noTokensSubtext}>
                  {t('payment.noTokensSub')}
                </Text>
                {/* External payer info: show when no tokens available */}
                {storeDetails?.deployments?.[0] && (
                  <View style={styles.externalPayInfo}>
                    <Text style={styles.externalPayLabel}>Pay with external wallet</Text>
                    {storeDetails.owner_address && (
                      <View style={styles.externalPayRow}>
                        <Text style={styles.externalPayKey}>Owner</Text>
                        <Text style={styles.externalPayValue} selectable>
                          {storeDetails.owner_address.slice(0, 6)}...{storeDetails.owner_address.slice(-4)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.externalPayRow}>
                      <Text style={styles.externalPayKey}>Project ID</Text>
                      <Text style={styles.externalPayValue} selectable>
                        {storeDetails.deployments[0].project_id}
                      </Text>
                    </View>
                    <View style={styles.externalPayRow}>
                      <Text style={styles.externalPayKey}>Chain</Text>
                      <Text style={styles.externalPayValue}>
                        {storeDetails.deployments[0].chain_id}
                      </Text>
                    </View>
                    {COCOPAY_ROUTER && (
                      <View style={styles.externalPayRow}>
                        <Text style={styles.externalPayKey}>Router</Text>
                        <Text style={styles.externalPayValue} selectable>
                          {COCOPAY_ROUTER.slice(0, 6)}...{COCOPAY_ROUTER.slice(-4)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              payableTokens.map((token) => {
                const isSelected = selectedIds.includes(token.id);
                const tokenAmount = tokenAmounts[token.id] || '0.00';
                return (
                  <Pressable
                    key={token.id}
                    style={[
                      styles.tokenRow,
                      isSelected && styles.tokenRowSelected,
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedIds(selectedIds.filter(id => id !== token.id));
                      } else {
                        setSelectedIds([...selectedIds, token.id]);
                      }
                    }}
                  >
                    {token.logoUri ? (
                      <Image source={{ uri: token.logoUri }} style={styles.tokenLogo} />
                    ) : null}
                    <View style={styles.tokenInfo}>
                      <Text style={[styles.tokenShort, isSelected && styles.tokenShortSelected]}>
                        {token.short}
                      </Text>
                      <Text style={styles.tokenName}>{token.name}</Text>
                    </View>
                    {isSelected ? (
                      <View style={styles.tokenAmountDisplay}>
                        <Text style={styles.tokenAmountValue}>${tokenAmount}</Text>
                        <Text style={styles.tokenMaxLabel}>/ ${Math.round(token.balance).toLocaleString()}</Text>
                      </View>
                    ) : (
                      <Text style={styles.tokenBalance}>
                        ${Math.round(token.balance).toLocaleString()}
                      </Text>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomContainer}>
          <View style={styles.dockLeft}>
            {isMobile && (
              <Pressable onPress={handleDismiss} style={styles.bottomBackButton}>
                <Text style={styles.topBackArrow}>←</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.dockSpacer} />

          <Pressable
            style={({ pressed }) => [
              styles.payButton,
              pressed && styles.buttonPressed,
              isActive && styles.buttonDisabled,
            ]}
            onPress={handlePay}
            disabled={isActive}
          >
            <Text style={styles.payButtonText}>
              {t('payment.pay')}
            </Text>
          </Pressable>
        </View>
      </View>
    </PageContainer>
  );
}

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingHorizontal: spacing[4],
      paddingBottom: 120,
    },
    amountSection: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      paddingVertical: spacing[8],
    },
    amountInput: {
      fontFamily: t.typography.fontFamily,
      fontSize: 72,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accent,
      padding: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
      textAlign: 'center',
      marginBottom: spacing[3],
    } as any,
    storeLogo: {
      width: 96,
      height: 96,
      marginBottom: spacing[6],
    },
    storeName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textSecondary,
      letterSpacing: 2,
      marginBottom: spacing[3],
      textTransform: 'uppercase',
    },
    tokenSection: {
      paddingBottom: spacing[4],
    },
    tokenSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing[2],
    },
    tokenSectionLabel: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.textSecondary,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      letterSpacing: 2,
    },
    tokenSectionTotal: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accent,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
    },
    tokenSectionTotalWarning: {
      color: t.colors.accentSecondary,
    },
    noTokens: {
      paddingVertical: spacing[6],
      alignItems: 'center',
    },
    noTokensText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.base,
      color: t.colors.textSecondary,
      fontWeight: t.typography.weights.semibold,
    },
    noTokensSubtext: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      marginTop: spacing[2],
      textAlign: 'center',
    },
    tokenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3],
      marginBottom: spacing[2],
      backgroundColor: t.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.sm,
    },
    tokenRowSelected: {
      borderColor: t.colors.accentSecondary,
      backgroundColor: `${t.colors.accentSecondary}1A`,
    },
    tokenLogo: {
      width: 32,
      height: 32,
      marginRight: spacing[2],
    },
    tokenInfo: {
      flex: 1,
    },
    tokenShort: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.base,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textSecondary,
    },
    tokenShortSelected: {
      color: t.colors.accentSecondary,
    },
    tokenName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
      marginTop: spacing[0.5],
    },
    tokenBalance: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textMuted,
    },
    tokenAmountDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenAmountValue: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accentSecondary,
    },
    tokenMaxLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      marginLeft: spacing[1],
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
    },
    topBackButton: {
      paddingVertical: spacing[2],
    },
    topBackArrow: {
      fontFamily: typography.fontFamily,
      color: t.colors.text,
      fontSize: 32,
    },
    bottomContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      padding: spacing[4],
      paddingBottom: spacing[8],
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: t.colors.backgroundTranslucent,
    },
    dockLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    dockSpacer: {
      flex: 1,
    },
    bottomBackButton: {
      paddingVertical: spacing[2],
      paddingRight: spacing[2],
    },
    payButton: {
      backgroundColor: t.colors.accent,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      borderRadius: t.borderRadius.md,
    },
    buttonPressed: {
      opacity: 0.9,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    payButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
    overlayCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[6],
    },
    overlayText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
      marginTop: spacing[4],
      textAlign: 'center',
    },
    overlaySubtext: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      marginTop: spacing[2],
      textAlign: 'center',
    },
    confirmationCode: {
      fontFamily: t.typography.fontFamily,
      fontSize: 48,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accent,
      marginTop: spacing[4],
      letterSpacing: 8,
      textAlign: 'center',
    },
    checkmark: {
      fontSize: 64,
      color: t.colors.accent,
    },
    externalPayInfo: {
      marginTop: spacing[4],
      padding: spacing[3],
      backgroundColor: t.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.sm,
      width: '100%',
    },
    externalPayLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textSecondary,
      letterSpacing: 1,
      marginBottom: spacing[2],
      textTransform: 'uppercase',
    },
    externalPayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing[1],
    },
    externalPayKey: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
    },
    externalPayValue: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.text,
    },
  }), [t.key]);
}
