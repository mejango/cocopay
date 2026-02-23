import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { useState, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { spacing, useTheme } from '../src/theme';
import type { BrandTheme } from '../src/theme';
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
  const theme = useTheme();
  const styles = useStyles(theme);
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
              placeholderTextColor={theme.colors.textMuted}
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

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
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
      fontFamily: t.typography.fontFamily,
      color: t.colors.accent,
      fontSize: 32,
      fontWeight: t.typography.weights.medium,
    },
    headerTitle: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
    },
    storeName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
      textAlign: 'center',
    },
    chainName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      textAlign: 'center',
      marginTop: spacing[1],
      marginBottom: spacing[6],
    },
    balanceInfo: {
      alignItems: 'center',
      marginBottom: spacing[6],
    },
    balanceLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    balanceAmount: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes['3xl'],
      fontWeight: t.typography.weights.bold,
      color: t.colors.accentSecondary,
      marginTop: spacing[1],
    },
    tokenSymbolLarge: {
      fontSize: t.typography.sizes.lg,
      color: t.colors.textSecondary,
    },
    inputSection: {
      marginBottom: spacing[4],
    },
    label: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.textSecondary,
      marginBottom: spacing[2],
      letterSpacing: 1,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.backgroundSecondary,
      borderRadius: t.borderRadius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      paddingHorizontal: spacing[4],
    },
    amountInput: {
      flex: 1,
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes['2xl'],
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
      paddingVertical: spacing[4],
    },
    inputTokenSymbol: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
      marginRight: spacing[3],
    },
    maxButton: {
      backgroundColor: t.colors.accentSecondary,
      paddingVertical: spacing[1.5],
      paddingHorizontal: spacing[3],
      borderRadius: t.borderRadius.sm,
    },
    maxButtonText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accentText,
    },
    conversionCard: {
      backgroundColor: t.colors.backgroundSecondary,
      padding: spacing[5],
      borderRadius: t.borderRadius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: 'center',
      marginBottom: spacing[6],
    },
    conversionLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    conversionAmount: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes['2xl'],
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
      marginTop: spacing[1],
    },
    conversionNote: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
      marginTop: spacing[2],
      textAlign: 'center',
    },
    cashOutButton: {
      backgroundColor: t.colors.accentSecondary,
      paddingVertical: spacing[4],
      borderRadius: t.borderRadius.lg,
      alignItems: 'center',
    },
    cashOutButtonPressed: {
      opacity: 0.9,
    },
    cashOutButtonDisabled: {
      opacity: 0.6,
    },
    cashOutButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
    },
  }), [t.key]);
}
