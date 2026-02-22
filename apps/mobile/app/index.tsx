import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAccount, useEnsName } from 'wagmi';
import { useBalanceStore } from '../src/stores/balance';
import { useAuthStore } from '../src/stores/auth';
import { useAuthPopoverStore } from '../src/stores/authPopover';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';
import { cycleLanguage, LANGUAGE_LABELS, type Language } from '../src/i18n';
import type { Revnet } from '../src/types/revnet';

// Format USD value for display (full numbers, no abbreviation)
function formatUsdValue(value: number): string {
  if (value >= 1) {
    return `$${Math.round(value).toLocaleString()}`;
  }
  if (value > 0) {
    return `$${value.toFixed(2)}`;
  }
  return '$0';
}

export default function BalancesScreen() {
  const { t, i18n } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthPopover = useAuthPopoverStore((state) => state.open);
  const setAuthStep = useAuthPopoverStore((state) => state.setStep);
  const { address: walletAddress, isConnected: isWalletConnected } = useAccount();
  const { data: ensName } = useEnsName({ address: walletAddress });
  const connectRef = useRef<View>(null);

  const walletLabel = ensName
    || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '');
  const { totalUsd, revnets, isLoading, error, fetch: fetchRevnets, setWalletAddress } = useBalanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [langLabel, setLangLabel] = useState(LANGUAGE_LABELS[i18n.language as Language] || 'PT');

  useEffect(() => {
    if (walletAddress) {
      setWalletAddress(walletAddress);
    }
    fetchRevnets();
  }, [walletAddress, setWalletAddress, fetchRevnets]);

  // Revnets already sorted by cash out value from the service

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRevnets();
    setRefreshing(false);
  };

  const handleRevnetPress = (revnet: Revnet) => {
    router.push({
      pathname: '/store/[id]',
      params: {
        id: `${revnet.chainId}-${revnet.projectId}`,
        name: revnet.name,
        balance: revnet.balanceFormatted,
        tokenSymbol: revnet.tokenSymbol,
        logoUri: revnet.logoUri || '',
        chainId: revnet.chainId.toString(),
        projectId: revnet.projectId.toString(),
        rawBalance: revnet.balance,
        cashOutValueUsd: revnet.cashOutValueUsd.toString(),
      },
    });
  };

  const handlePayPress = () => {
    router.push('/pay');
  };

  const handleCreateStore = () => {
    router.push('/create-store');
  };

  const handleWalletPress = () => {
    router.push('/wallet');
  };

  const handleCycleLanguage = () => {
    const nextLang = cycleLanguage();
    setLangLabel(LANGUAGE_LABELS[nextLang]);
  };

  // Calculate total USD value from all revnets
  const totalCashOutUsd = revnets.reduce((sum, r) => sum + (r.cashOutValueUsd || 0), 0);

  // Add USDC as a line item (placeholder - always $0 for now)
  const usdcItem: Revnet = {
    projectId: 0,
    chainId: 0,
    name: t('home.digitalDollars'),
    tokenSymbol: 'USDC',
    logoUri: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
    balance: '0',
    balanceFormatted: '0',
    treasuryBalance: '0',
    tokenSupply: '0',
    volume: '0',
    suckerGroupId: null,
    cashOutValueEth: 0,
    cashOutValueUsd: 0, // TODO: Fetch actual USDC balance across chains
    decimals: 6,
    currency: 2,
  };

  // Combine USDC at top with revnets
  const allItems = [usdcItem, ...revnets];

  return (
    <PageContainer>
      <View style={styles.container}>
        {/* Total Balance */}
        <View style={styles.totalCard}>
          <View style={styles.labelRow}>
            <Text style={styles.coconutEmoji}>🥥</Text>
            <Text style={styles.totalLabel}>{t('home.yourBalance')}</Text>
          </View>
          <Text style={styles.totalAmount}>{formatUsdValue(totalCashOutUsd)}</Text>
        </View>

        {/* Revnets List */}
        <View style={styles.storesSection}>
          {isLoading && revnets.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.loadingText}>{t('home.loading')}</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={fetchRevnets} style={styles.retryButton}>
                <Text style={styles.retryText}>{t('home.retry')}</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={allItems}
              keyExtractor={(item) => `${item.chainId}-${item.projectId}-${item.name}`}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.juiceCyan}
                />
              }
              renderItem={({ item }) => {
                const hasValue = (item.cashOutValueUsd || 0) > 0;
                const isUsdc = item.tokenSymbol === 'USDC' && item.projectId === 0;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.storeRow,
                      pressed && styles.storeRowPressed,
                    ]}
                    onPress={() => isUsdc ? handleWalletPress() : handleRevnetPress(item)}
                  >
                    {item.logoUri ? (
                      <Image source={{ uri: item.logoUri }} style={styles.storeLogo} />
                    ) : (
                      <View style={styles.storeLogoPlaceholder}>
                        <Text style={styles.logoInitial}>
                          {(item.tokenSymbol || item.name || '?').charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.nameColumn}>
                      <Text style={[
                        styles.cashOutValue,
                        hasValue && styles.cashOutValueActive,
                      ]}>
                        {formatUsdValue(item.cashOutValueUsd || 0)}
                      </Text>
                      <Text style={styles.storeName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.tokenSymbol}>{item.tokenSymbol}</Text>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{t('home.noTokens')}</Text>
                  <Text style={styles.emptySubtext}>
                    {t('home.noTokensSub')}
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* Bottom Dock */}
        <View style={styles.payButtonContainer}>
          <View style={styles.dockLeft}>
            {!isAuthenticated && !isWalletConnected && (
              <Pressable
                ref={connectRef}
                style={styles.signInButton}
                onPress={() => {
                  connectRef.current?.measureInWindow((x, y, w, h) => {
                    openAuthPopover({ x, y, width: w, height: h });
                  });
                }}
              >
                <Text style={styles.signInText}>{t('auth.connect')}</Text>
              </Pressable>
            )}
            {!isAuthenticated && isWalletConnected && (
              <Pressable
                ref={connectRef}
                style={styles.connectedStatus}
                onPress={() => {
                  connectRef.current?.measureInWindow((x, y, w, h) => {
                    openAuthPopover({ x, y, width: w, height: h });
                    setAuthStep('wallet');
                  });
                }}
              >
                <Text style={styles.hollowCircle}>○</Text>
                <Text style={styles.connectedText}>{walletLabel}</Text>
              </Pressable>
            )}
            {isAuthenticated && isWalletConnected && (
              <Pressable
                ref={connectRef}
                style={styles.connectedStatus}
                onPress={() => {
                  connectRef.current?.measureInWindow((x, y, w, h) => {
                    openAuthPopover({ x, y, width: w, height: h });
                    setAuthStep('connected');
                  });
                }}
              >
                <Text style={styles.greenCircle}>●</Text>
                <Text style={styles.connectedText}>{walletLabel}</Text>
              </Pressable>
            )}

            <Pressable onPress={handleCycleLanguage} style={styles.langButton}>
              <Text style={styles.langButtonText}>{langLabel}</Text>
            </Pressable>

            <Pressable onPress={handleCreateStore} style={styles.coconutButton}>
              <Text style={styles.coconutBottom}>🥥</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.payButton,
              pressed && styles.payButtonPressed,
            ]}
            onPress={handlePayPress}
          >
            <Text style={styles.payButtonText}>{t('home.pay')}</Text>
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
  totalCard: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[16],
    paddingBottom: spacing[6],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  totalLabel: {
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
  },
  coconutEmoji: {
    fontSize: 24,
  },
  totalAmount: {
    fontFamily: typography.fontFamily,
    color: colors.white,
    fontSize: 48,
    fontWeight: typography.weights.bold,
    marginTop: spacing[1],
  },
  storesSection: {
    flex: 1,
    marginTop: spacing[4],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  loadingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.juiceOrange,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  retryButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  retryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.juiceCyan,
  },
  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[20],
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.whiteAlpha10,
  },
  storeRowPressed: {
    backgroundColor: colors.whiteAlpha10,
    marginHorizontal: -spacing[4],
    paddingHorizontal: spacing[4],
  },
  storeLogo: {
    width: 48,
    height: 48,
    borderRadius: 0,
    marginRight: spacing[4],
    backgroundColor: colors.juiceDarkLighter,
  },
  storeLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 0,
    marginRight: spacing[4],
    backgroundColor: colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.gray400,
  },
  cashOutValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.gray500,
    marginBottom: spacing[1],
  },
  cashOutValueActive: {
    color: '#4ade80',
  },
  nameColumn: {
    flex: 1,
  },
  storeName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  tokenSymbol: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    marginTop: spacing[0.5],
  },
  chevron: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xl,
    color: colors.gray500,
    marginLeft: spacing[2],
  },
  empty: {
    padding: spacing[10],
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  emptySubtext: {
    fontFamily: typography.fontFamily,
    color: colors.gray500,
    fontSize: typography.sizes.sm,
    marginTop: spacing[2],
  },
  payButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  signInButton: {
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
  },
  signInText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
  },
  connectedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    minHeight: 52,
  },
  hollowCircle: {
    fontSize: 14,
    color: colors.gray400,
  },
  greenCircle: {
    fontSize: 14,
    color: colors.success,
  },
  connectedText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray400,
  },
  langButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
  },
  langButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
  },
  payButton: {
    backgroundColor: colors.juiceCyan,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  payButtonPressed: {
    opacity: 0.9,
  },
  payButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  coconutButton: {
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
    padding: spacing[2],
  },
  coconutBottom: {
    fontSize: 24,
  },
});
