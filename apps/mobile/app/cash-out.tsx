import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';
import { useBalanceStore } from '../src/stores/balance';
import { buildCashOutTransaction, formatTransactionForDisplay } from '../src/services/terminal';
import { getChainById } from '../src/constants/juicebox';

export default function CashOutScreen() {
  const params = useLocalSearchParams<{
    storeId: string;
    storeName: string;
    balance: string;
    tokenSymbol: string;
    chainId: string;
    projectId: string;
    rawBalance: string;
  }>();

  const { walletAddress } = useBalanceStore();
  const { t } = useTranslation();
  const [amount, setAmount] = useState(params.balance || '0');
  const [isLoading, setIsLoading] = useState(false);

  const maxAmount = parseFloat(params.balance || '0');
  const tokenSymbol = params.tokenSymbol || 'TOKEN';
  const chainId = parseInt(params.chainId || '1', 10);
  const projectId = parseInt(params.projectId || '0', 10);
  const chain = getChainById(chainId);

  const handleDismiss = () => {
    router.back();
  };

  const handleSetMax = () => {
    setAmount(params.balance || '0');
  };

  const handleCashOut = async () => {
    const cashOutAmount = parseFloat(amount);

    if (isNaN(cashOutAmount) || cashOutAmount <= 0) {
      Alert.alert(t('cashOut.errorTitle'), t('cashOut.errorInvalidAmount'));
      return;
    }

    if (cashOutAmount > maxAmount) {
      Alert.alert(t('cashOut.errorTitle'), t('cashOut.errorMaxAmount', { amount: maxAmount.toFixed(2), symbol: tokenSymbol }));
      return;
    }

    setIsLoading(true);
    try {
      // Convert to wei (18 decimals)
      const cashOutWei = BigInt(Math.floor(cashOutAmount * 1e18));

      // Build cash out transaction
      const tx = buildCashOutTransaction(
        {
          holder: walletAddress,
          projectId,
          cashOutCount: cashOutWei,
          beneficiary: walletAddress,
          // Set min tokens reclaimed to 0 for MVP (in production, calculate with slippage)
          minTokensReclaimed: BigInt(0),
        },
        chainId
      );

      // For MVP: show transaction details
      const txDisplay = formatTransactionForDisplay(tx);
      Alert.alert(
        t('cashOut.txPreparedTitle'),
        t('cashOut.txPreparedMessage', { symbol: tokenSymbol, details: txDisplay }),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleDismiss} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('cashOut.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.storeName}>{params.storeName}</Text>
        {chain && (
          <Text style={styles.chainName}>{chain.name}</Text>
        )}

        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>{t('cashOut.availableBalance')}</Text>
          <Text style={styles.balanceAmount}>
            {params.balance} <Text style={styles.tokenSymbolLarge}>{tokenSymbol}</Text>
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>{t('cashOut.amountLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.gray500}
              keyboardType="decimal-pad"
              editable={!isLoading}
            />
            <Text style={styles.inputTokenSymbol}>{tokenSymbol}</Text>
            <Pressable onPress={handleSetMax} style={styles.maxButton}>
              <Text style={styles.maxButtonText}>MAX</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.conversionCard}>
          <Text style={styles.conversionLabel}>{t('cashOut.youWillReceive')}</Text>
          <Text style={styles.conversionAmount}>ETH</Text>
          <Text style={styles.conversionNote}>
            {t('cashOut.bondingCurveNote')}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.cashOutButton,
            pressed && styles.cashOutButtonPressed,
            isLoading && styles.cashOutButtonDisabled,
          ]}
          onPress={handleCashOut}
          disabled={isLoading}
        >
          <Text style={styles.cashOutButtonText}>
            {isLoading ? t('cashOut.processing') : t('cashOut.cashOut')}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  backButton: {
    padding: spacing[2],
    width: 40,
  },
  backArrow: {
    fontFamily: typography.fontFamily,
    color: colors.juiceCyan,
    fontSize: 32,
    fontWeight: typography.weights.medium,
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  storeName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.white,
    textAlign: 'center',
  },
  chainName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing[1],
    marginBottom: spacing[6],
  },
  balanceInfo: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  balanceLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.juiceOrange,
    marginTop: spacing[1],
  },
  tokenSymbolLarge: {
    fontSize: typography.sizes.lg,
    color: colors.gray400,
  },
  inputSection: {
    marginBottom: spacing[4],
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.gray400,
    marginBottom: spacing[2],
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.juiceDarkLighter,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
    paddingHorizontal: spacing[4],
  },
  amountInput: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
    paddingVertical: spacing[4],
  },
  inputTokenSymbol: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    marginRight: spacing[3],
  },
  maxButton: {
    backgroundColor: colors.juiceOrange,
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.sm,
  },
  maxButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.juiceDark,
  },
  conversionCard: {
    backgroundColor: colors.juiceDarkLighter,
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  conversionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  conversionAmount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginTop: spacing[1],
  },
  conversionNote: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  cashOutButton: {
    backgroundColor: colors.juiceOrange,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cashOutButtonPressed: {
    opacity: 0.9,
  },
  cashOutButtonDisabled: {
    opacity: 0.6,
  },
  cashOutButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
});
