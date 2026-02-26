import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, ActivityIndicator, Keyboard, useWindowDimensions } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCashOutPopoverStore } from '../stores/cashOutPopover';
import { useBalanceStore } from '../stores/balance';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useCashOut, useBorrowableAmount } from '../hooks/useCashOut';
import { USDC_DECIMALS } from '../constants/juicebox';
import { spacing, useTheme } from '../theme';
import type { BrandTheme } from '../theme';

const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    buttons?.[0]?.onPress?.();
  } else {
    Alert.alert(title, message, buttons);
  }
};

const POPOVER_WIDTH = 280;
const POPOVER_MARGIN = spacing[4];

export function CashOutPopover() {
  const isOpen = useCashOutPopoverStore((s) => s.isOpen);
  const anchor = useCashOutPopoverStore((s) => s.anchor);
  const params = useCashOutPopoverStore((s) => s.params);
  const close = useCashOutPopoverStore((s) => s.close);
  const { walletAddress } = useBalanceStore();
  const { requireAuth } = useRequireAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [amount, setAmount] = useState('');
  const { status: cashOutStatus, confirmationCode, txHash, error: cashOutError, cashOut, reset: resetCashOut } = useCashOut();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Reset amount and cash-out state when popover opens
  useEffect(() => {
    if (isOpen && params) {
      setAmount(params.balance || '0');
      resetCashOut();
    }
  }, [isOpen, params, resetCashOut]);

  const maxAmount = parseFloat(params?.balance || '0');
  const tokenSymbol = params?.tokenSymbol || 'TOKEN';
  const chainId = parseInt(params?.chainId || '1', 10);
  const projectId = parseInt(params?.projectId || '0', 10);

  // Convert entered amount to raw token amount (18 decimals)
  const enteredAmount = parseFloat(amount) || 0;
  const collateral = BigInt(Math.floor(enteredAmount * 1e18));

  // Query on-chain borrowable USDC for this collateral amount
  const { borrowableAmount, loading: borrowableLoading } = useBorrowableAmount(chainId, projectId, collateral);

  // Show borrowable USDC in human-readable format
  const usdPreview = borrowableAmount !== null
    ? (Number(borrowableAmount) / 10 ** USDC_DECIMALS).toFixed(2)
    : '...';

  const isLoading = cashOutStatus === 'building' || cashOutStatus === 'submitting' || cashOutStatus === 'processing';
  const isCompleted = cashOutStatus === 'completed';
  const isFailed = cashOutStatus === 'failed';

  const handleMax = () => {
    setAmount(params?.balance || '0');
  };

  const handleCashOut = async () => {
    if (!params) return;

    // Auth gate
    if (!requireAuth({ type: 'action', action: 'cash_out' }, anchor ?? undefined)) {
      return;
    }

    const cashOutAmount = parseFloat(amount);
    if (isNaN(cashOutAmount) || cashOutAmount <= 0) {
      showAlert(t('cashOut.errorTitle'), t('cashOut.errorInvalidAmount'));
      return;
    }
    if (cashOutAmount > maxAmount) {
      showAlert(t('cashOut.errorTitle'), t('cashOut.errorMaxAmount', { amount: maxAmount.toFixed(2), symbol: tokenSymbol }));
      return;
    }
    if (!borrowableAmount || borrowableAmount === 0n) {
      showAlert(t('cashOut.errorTitle'), t('cashOut.errorNoBorrowable'));
      return;
    }

    await cashOut({
      chainId,
      projectId,
      collateral,
      minBorrowAmount: borrowableAmount,
      amountUsd: Number(usdPreview),
      beneficiary: walletAddress,
    });
  };

  const isMobile = screenWidth < 600;

  const positionStyle = useMemo(() => {
    // Mobile: full-width bottom sheet
    if (isMobile) {
      return {
        bottom: keyboardHeight > 0 ? keyboardHeight : 0,
        left: 0,
        right: 0,
        width: undefined as unknown as number,
      };
    }

    // Desktop: anchor-based popover
    if (keyboardHeight > 0) {
      return {
        bottom: keyboardHeight + spacing[2],
        left: (screenWidth - POPOVER_WIDTH) / 2,
      };
    }

    if (!anchor) {
      return {
        top: screenHeight * 0.3,
        left: (screenWidth - POPOVER_WIDTH) / 2,
      };
    }

    const buttonCenter = anchor.x + anchor.width / 2;
    const onRightSide = buttonCenter > screenWidth / 2;

    let left: number;
    if (onRightSide) {
      left = anchor.x + anchor.width - POPOVER_WIDTH;
    } else {
      left = anchor.x;
    }
    left = Math.max(POPOVER_MARGIN, Math.min(left, screenWidth - POPOVER_WIDTH - POPOVER_MARGIN));

    return {
      bottom: screenHeight - anchor.y + spacing[2],
      left,
    };
  }, [anchor, screenWidth, screenHeight, keyboardHeight, isMobile]);

  if (!isOpen) return null;

  return (
    <>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.popoverBox, isMobile && styles.popoverBoxMobile, positionStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('store.cashOut')}</Text>
          <Pressable onPress={close} hitSlop={8}>
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
        </View>

        {/* Amount input */}
        <Text style={styles.label}>{t('cashOutPopover.amount')}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.amountInput,
              Platform.OS === 'web' && { outlineStyle: 'none' } as any,
            ]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
            editable={!isLoading}
          />
          <Text style={styles.tokenSymbol}>{tokenSymbol}</Text>
          <Pressable onPress={handleMax} style={styles.maxButton}>
            <Text style={styles.maxButtonText}>{t('cashOutPopover.max')}</Text>
          </Pressable>
        </View>

        {/* USD preview (from on-chain borrowable query) */}
        <Text style={styles.usdPreview}>
          {borrowableLoading
            ? t('cashOutPopover.usdValue', { value: '...' })
            : t('cashOutPopover.usdValue', { value: usdPreview })}
        </Text>

        {/* Status overlay */}
        {isCompleted ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{t('cashOut.completed')}</Text>
            {txHash && <Text style={styles.txHash}>{txHash.slice(0, 10)}...{txHash.slice(-8)}</Text>}
            {confirmationCode && <Text style={styles.confirmationCode}>{confirmationCode}</Text>}
            <Pressable style={styles.cashOutButton} onPress={close}>
              <Text style={styles.cashOutButtonText}>{t('common.done')}</Text>
            </Pressable>
          </View>
        ) : isFailed ? (
          <View style={styles.statusContainer}>
            <Text style={styles.errorText}>{cashOutError || t('cashOut.failed')}</Text>
            <Pressable style={styles.cashOutButton} onPress={resetCashOut}>
              <Text style={styles.cashOutButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          /* Cash Out button */
          <Pressable
            style={({ pressed }) => [
              styles.cashOutButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleCashOut}
            disabled={isLoading || borrowableLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.accentText} size="small" />
            ) : (
              <Text style={styles.cashOutButtonText}>{t('store.cashOut')}</Text>
            )}
          </Pressable>
        )}
      </View>
    </>
  );
}

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    popoverBox: {
      position: 'absolute',
      width: POPOVER_WIDTH,
      padding: spacing[4],
      backgroundColor: t.colors.background,
      borderWidth: 1,
      borderColor: t.colors.borderHover,
      borderRadius: t.borderRadius.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 8,
    },
    popoverBoxMobile: {
      width: '100%',
      borderRadius: 0,
      borderTopLeftRadius: t.borderRadius.lg,
      borderTopRightRadius: t.borderRadius.lg,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      paddingBottom: spacing[8],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing[3],
    },
    title: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.text,
    },
    closeButton: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
    },
    label: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textSecondary,
      letterSpacing: 1,
      marginBottom: spacing[2],
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.sm,
      paddingHorizontal: spacing[2],
      marginBottom: spacing[2],
    },
    amountInput: {
      flex: 1,
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
      paddingVertical: spacing[2],
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    tokenSymbol: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textSecondary,
      marginRight: spacing[2],
    },
    maxButton: {
      backgroundColor: t.colors.accentSecondary,
      paddingVertical: spacing[1],
      paddingHorizontal: spacing[2],
      borderRadius: t.borderRadius.sm,
    },
    maxButtonText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accentText,
    },
    usdPreview: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
      marginBottom: spacing[3],
    },
    cashOutButton: {
      backgroundColor: t.colors.accentSecondary,
      paddingVertical: spacing[2],
      borderRadius: t.borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 36,
    },
    cashOutButtonText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accentText,
    },
    statusContainer: {
      alignItems: 'center',
      gap: spacing[2],
    },
    statusText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
    },
    txHash: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
    },
    confirmationCode: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accent,
      letterSpacing: 2,
    },
    errorText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: '#ef4444',
      textAlign: 'center',
      marginBottom: spacing[2],
    },
    buttonPressed: {
      opacity: 0.7,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  }), [t.key]);
}
