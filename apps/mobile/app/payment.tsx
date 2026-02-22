import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, ScrollView, useWindowDimensions, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';
import { useBalanceStore } from '../src/stores/balance';
import { buildPayTransaction, formatTransactionForDisplay } from '../src/services/terminal';
import { NATIVE_TOKEN } from '../src/constants/juicebox';
import type { Revnet } from '../src/types/revnet';

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
  const params = useLocalSearchParams<{ storeId: string; storeName: string; storeLogo: string }>();
  const { revnets, walletAddress } = useBalanceStore();
  const payableTokens = revnetsToPayableTokens(revnets);
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenAmounts, setTokenAmounts] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

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

    setIsLoading(true);
    try {
      // Build transactions for each selected token
      const transactions = selectedIds
        .filter(id => parseFloat(tokenAmounts[id] || '0') > 0)
        .map(id => {
          const token = payableTokens.find(t => t.id === id);
          if (!token) return null;

          const tokenAmount = parseFloat(tokenAmounts[id] || '0');
          const amountWei = BigInt(Math.floor(tokenAmount * 1e18));

          // For MVP: just show the transaction details
          // In production, this would go through WalletConnect
          return buildPayTransaction(
            {
              projectId: token.projectId,
              token: NATIVE_TOKEN, // Pay with ETH
              amount: amountWei,
              beneficiary: walletAddress,
              memo: `CocoPay: ${params.storeName || 'Payment'}`,
            },
            token.chainId
          );
        })
        .filter(Boolean);

      if (transactions.length === 0) {
        Alert.alert(t('payment.errorTitle'), t('payment.errorNoTransaction'));
        return;
      }

      // For MVP: show transaction details
      const txDisplay = transactions.map(tx => formatTransactionForDisplay(tx!)).join('\n\n');
      Alert.alert(
        t('payment.txPreparedTitle'),
        t('payment.txPreparedMessage', { details: txDisplay }),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

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
              placeholderTextColor={colors.gray500}
              keyboardType="decimal-pad"
              editable={!isLoading}
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
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handlePay}
            disabled={isLoading}
          >
            <Text style={styles.payButtonText}>
              {isLoading ? t('payment.processing') : t('payment.pay')}
            </Text>
          </Pressable>
        </View>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.juiceDark,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  amountSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    paddingVertical: spacing[8],
  },
  amountInput: {
    fontFamily: typography.fontFamily,
    fontSize: 72,
    fontWeight: typography.weights.bold,
    color: colors.juiceCyan,
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
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.gray400,
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
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
  },
  tokenSectionTotal: {
    fontFamily: typography.fontFamily,
    color: colors.juiceCyan,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  tokenSectionTotalWarning: {
    color: colors.juiceOrange,
  },
  noTokens: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  noTokensText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    color: colors.gray400,
    fontWeight: typography.weights.semibold,
  },
  noTokensSubtext: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
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
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
  },
  tokenRowSelected: {
    borderColor: colors.juiceOrange,
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
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
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.gray400,
  },
  tokenShortSelected: {
    color: colors.juiceOrange,
  },
  tokenName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    marginTop: spacing[0.5],
  },
  tokenBalance: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.gray500,
  },
  tokenAmountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenAmountValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.juiceOrange,
  },
  tokenMaxLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
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
    color: colors.juiceCyan,
    fontSize: 32,
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    paddingBottom: spacing[8],
    minHeight: 101,
    borderTopWidth: 1,
    borderTopColor: colors.whiteAlpha10,
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
    backgroundColor: colors.juiceCyan,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
});
