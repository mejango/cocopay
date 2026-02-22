import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, useWindowDimensions, Image } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBalanceStore } from '../src/stores/balance';
import { useAuthStore } from '../src/stores/auth';
import { useAuthPopoverStore } from '../src/stores/authPopover';
import { colors, typography, spacing, shadows } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';

const CHAINS = ['Arbitrum', 'Optimism', 'Ethereum', 'Base'];
const USDC_LOGO = 'https://assets.coingecko.com/coins/images/6319/small/usdc.png';

export default function WalletScreen() {
  const { totalUsd } = useBalanceStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const walletAddress = user?.deposit_address || '';
  const { t } = useTranslation();
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
    colors.white,
    colors.gray300,
    colors.white,
    colors.gray300,
    colors.white,
    colors.gray300,
    colors.white,
    colors.gray300,
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
            <Text style={styles.headerSubtitle}>{t('wallet.title')}</Text>
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
                  placeholderTextColor={colors.gray500}
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
                  placeholderTextColor={colors.gray500}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.juiceDark,
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
    color: colors.juiceCyan,
    fontSize: 32,
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.whiteAlpha10,
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
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
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
    borderBottomColor: colors.juiceCyan,
  },
  tabText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gray500,
  },
  tabTextActive: {
    color: colors.white,
  },
  // Deposit tab
  depositSection: {
    alignItems: 'center',
    width: '100%',
  },
  depositLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    letterSpacing: 1,
    marginBottom: spacing[4],
  },
  addressDisplay: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
  },
  addressText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.white,
    lineHeight: 22,
  },
  copyHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    marginTop: spacing[2],
  },
  chainsText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    marginTop: spacing[6],
    textAlign: 'center',
  },
  // Withdraw tab
  withdrawSection: {
    alignItems: 'center',
    width: '100%',
  },
  availableLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
    marginBottom: spacing[2],
  },
  amountWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  amountInput: {
    fontFamily: typography.fontFamily,
    fontSize: 72,
    fontWeight: typography.weights.bold,
    color: colors.juiceCyan,
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
    borderColor: colors.whiteAlpha20,
    marginTop: spacing[2],
  },
  maxButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.gray500,
  },
  addressInputSection: {
    width: '100%',
  },
  fieldLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.gray400,
    letterSpacing: 2,
    marginBottom: spacing[2],
  },
  addressInput: {
    fontFamily: typography.fontFamily,
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.sm,
    color: colors.white,
  } as any,
  // Bottom dock
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
  actionButton: {
    backgroundColor: colors.juiceCyan,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  signInButton: {
    borderWidth: 1,
    borderColor: colors.success,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    marginTop: spacing[4],
  },
  signInButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.success,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
