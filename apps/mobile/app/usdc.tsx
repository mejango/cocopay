import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, useWindowDimensions, Image } from 'react-native';
import { useState, useRef, useMemo } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBalanceStore } from '../src/stores/balance';
import { useAuthStore } from '../src/stores/auth';
import { useAuthPopoverStore } from '../src/stores/authPopover';
import { spacing, typography, useTheme } from '../src/theme';
import type { BrandTheme } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';

const CHAINS = ['Arbitrum', 'Optimism', 'Ethereum', 'Base'];
const USDC_LOGO = 'https://assets.coingecko.com/coins/images/6319/small/usdc.png';

export default function WalletScreen() {
  const totalUsd = useBalanceStore((s) => s.totalUsd);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const walletAddress = user?.deposit_address || '';
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const signInRef = useRef<View>(null);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleCopyAddress = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(walletAddress);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert(t('wallet.errorTitle'), t('wallet.errorInvalidAmount'));
      return;
    }

    if (!withdrawAddress || !withdrawAddress.startsWith('0x') || withdrawAddress.length !== 42) {
      Alert.alert(t('wallet.errorTitle'), t('wallet.errorInvalidAddress'));
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const balance = parseFloat(totalUsd || '0');

    if (withdrawAmount > balance) {
      Alert.alert(t('wallet.errorTitle'), t('wallet.errorInsufficientBalance', { amount: balance.toFixed(2) }));
      return;
    }

    setIsLoading(true);
    try {
      Alert.alert(
        t('wallet.comingSoonTitle'),
        t('wallet.comingSoonWithdraw')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Color-code every 6 characters of the address for readability
  const ADDRESS_COLORS = [
    theme.colors.text,
    theme.colors.textSecondary,
    theme.colors.text,
    theme.colors.textSecondary,
    theme.colors.text,
    theme.colors.textSecondary,
    theme.colors.text,
    theme.colors.textSecondary,
  ];

  const addressChunks = walletAddress
    ? walletAddress.match(/.{1,6}/g) || []
    : [];

  return (
    <PageContainer>
      <View style={styles.container}>
        {/* Top Bar - back button (desktop only) */}
        {!isMobile && (
          <View style={styles.topBar}>
            <Pressable onPress={handleBack} style={styles.topBackButton}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
          </View>
        )}

        {/* USDC Header + Tabs */}
        <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
          <Image source={{ uri: USDC_LOGO }} style={styles.headerLogo} />
          <View style={styles.headerTextColumn}>
            <Text style={styles.headerName}>USDC</Text>
          </View>
          <View style={styles.tabContainer}>
            <Pressable
              style={[styles.tab, activeTab === 'deposit' && styles.tabActive]}
              onPress={() => setActiveTab('deposit')}
            >
              <Text style={[styles.tabText, activeTab === 'deposit' && styles.tabTextActive]}>
                {t('wallet.deposit')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'withdraw' && styles.tabActive]}
              onPress={() => setActiveTab('withdraw')}
            >
              <Text style={[styles.tabText, activeTab === 'withdraw' && styles.tabTextActive]}>
                {t('wallet.withdraw')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>

          {activeTab === 'deposit' ? (
            /* Deposit: show address to receive USDC (requires auth) */
            !isAuthenticated ? (
              <View style={styles.depositSection}>
                <Text style={styles.depositLabel}>{t('wallet.signInToDeposit')}</Text>
                <Pressable
                  ref={signInRef}
                  style={({ pressed }) => [styles.signInButton, pressed && styles.actionButtonPressed]}
                  onPress={() => {
                    signInRef.current?.measureInWindow((x, y, w, h) => {
                      useAuthPopoverStore.getState().open({ x, y, width: w, height: h });
                    });
                  }}
                >
                  <Text style={styles.signInButtonText}>{t('profile.signIn')}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.depositSection}>
                <Text style={styles.depositLabel}>{t('wallet.sendUsdcTo')}</Text>
                <Pressable onPress={handleCopyAddress} style={styles.addressDisplay}>
                  <Text style={styles.addressText}>
                    {addressChunks.map((chunk, i) => (
                      <Text key={i} style={{ color: ADDRESS_COLORS[i % ADDRESS_COLORS.length] }}>
                        {chunk}
                      </Text>
                    ))}
                  </Text>
                  <Text style={styles.copyHint}>
                    {copied ? t('wallet.copied') : t('wallet.tapToCopy')}
                  </Text>
                </Pressable>
                <Text style={styles.chainsText}>
                  {t('wallet.onChains', { chains: CHAINS.slice(0, -1).join(', ') + ', ' + t('wallet.or') + ' ' + CHAINS[CHAINS.length - 1] })}
                </Text>
              </View>
            )
          ) : (
            /* Withdraw: amount input + address */
            <View style={styles.withdrawSection}>
              <Text style={styles.availableLabel}>$0.00 {t('wallet.available')}</Text>
              <View style={styles.amountWrapper}>
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
                  editable={!isLoading}
                  textAlign="center"
                />
                <Pressable
                  onPress={() => setAmount(totalUsd || '0')}
                  style={styles.maxButton}
                >
                  <Text style={styles.maxButtonText}>MAX</Text>
                </Pressable>
              </View>

              <View style={styles.addressInputSection}>
                <Text style={styles.fieldLabel}>{t('wallet.destinationAddress')}</Text>
                <TextInput
                  style={[
                    styles.addressInput,
                    Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                  ]}
                  value={withdrawAddress}
                  onChangeText={setWithdrawAddress}
                  placeholder="0x..."
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>
          )}
        </View>

        {/* Bottom Dock */}
        <View style={styles.bottomContainer}>
          <View style={styles.dockLeft}>
            {isMobile && (
              <Pressable onPress={handleBack} style={styles.bottomBackButton}>
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.dockSpacer} />

          {activeTab === 'withdraw' && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
                isLoading && styles.actionButtonDisabled,
              ]}
              onPress={handleWithdraw}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>
                {isLoading ? t('wallet.processing') : t('wallet.withdraw')}
              </Text>
            </Pressable>
          )}
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
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      gap: spacing[3],
    },
    topBackButton: {
      paddingVertical: spacing[2],
    },
    backArrow: {
      fontFamily: typography.fontFamily,
      color: t.colors.text,
      fontSize: 32,
    },
    headerTitle: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.text,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      paddingBottom: 0,
    },
    headerRowMobile: {
      paddingTop: spacing[6],
    },
    headerLogo: {
      width: 40,
      height: 40,
      marginRight: spacing[3],
      marginBottom: spacing[3],
    },
    headerTextColumn: {
      marginBottom: spacing[3],
      marginRight: spacing[4],
    },
    headerName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
    },
    headerSubtitle: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing[4],
      justifyContent: 'center',
      alignItems: 'center',
      maxWidth: 480,
      alignSelf: 'center',
      width: '100%',
    },
    tabContainer: {
      flexDirection: 'row',
      alignSelf: 'flex-end',
    },
    tab: {
      paddingVertical: spacing[2.5],
      paddingHorizontal: spacing[3],
      marginBottom: -1,
      borderBottomWidth: 1,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: t.colors.accent,
    },
    tabText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.textMuted,
    },
    tabTextActive: {
      color: t.colors.text,
    },
    // Deposit tab
    depositSection: {
      alignItems: 'center',
      width: '100%',
    },
    depositLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
      letterSpacing: 1,
      marginBottom: spacing[4],
    },
    addressDisplay: {
      alignItems: 'center',
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[6],
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.md,
    },
    addressText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
      lineHeight: 22,
    },
    copyHint: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
      marginTop: spacing[2],
    },
    chainsText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
      marginTop: spacing[6],
      textAlign: 'center',
    },
    // Withdraw tab
    withdrawSection: {
      alignItems: 'center',
      width: '100%',
    },
    availableLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      marginBottom: spacing[2],
    },
    amountWrapper: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[8],
    },
    amountInput: {
      fontFamily: t.typography.fontFamily,
      fontSize: 72,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accent,
      width: '100%',
      padding: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
      textAlign: 'center',
    } as any,
    maxButton: {
      paddingVertical: spacing[1],
      paddingHorizontal: spacing[2],
      borderWidth: 1,
      borderColor: t.colors.border,
      marginTop: spacing[2],
      borderRadius: t.borderRadius.sm,
    },
    maxButtonText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textMuted,
    },
    addressInputSection: {
      width: '100%',
    },
    fieldLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textSecondary,
      letterSpacing: 2,
      marginBottom: spacing[2],
    },
    addressInput: {
      fontFamily: t.typography.fontFamily,
      backgroundColor: t.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.sm,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      fontSize: t.typography.sizes.sm,
      color: t.colors.text,
    } as any,
    // Bottom dock
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
    actionButton: {
      backgroundColor: t.colors.accent,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      borderRadius: t.borderRadius.md,
    },
    actionButtonPressed: {
      opacity: 0.9,
    },
    actionButtonDisabled: {
      opacity: 0.6,
    },
    actionButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
    signInButton: {
      backgroundColor: t.colors.accent,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      marginTop: spacing[4],
      borderRadius: t.borderRadius.sm,
    },
    signInButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.semibold,
    },
  }), [t.key]);
}
