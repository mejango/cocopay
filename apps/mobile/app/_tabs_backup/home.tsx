import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { useBalanceStore } from '../../src/stores/balance';
import { useAuthStore } from '../../src/stores/auth';
import { useRequireAuth } from '../../src/hooks/useRequireAuth';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';

// Mock data for demo mode
const MOCK_USER = { name: 'Demo User' };
const MOCK_BALANCE = {
  totalUsd: '117.50',
  availableBonus: '15.00',
  breakdown: [
    { label: 'Sunny Side Cafe', amount_usd: '12.50' },
    { label: 'Green Garden Market', amount_usd: '8.75' },
    { label: 'Urban Threads', amount_usd: '25.00' },
    { label: 'Zen Yoga Studio', amount_usd: '45.00' },
    { label: 'Fresh Bites Deli', amount_usd: '15.80' },
    { label: 'The Book Nook', amount_usd: '3.20' },
    { label: 'Artisan Bakery', amount_usd: '7.25' },
  ],
};

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const { isAuthenticated, requireAuth } = useRequireAuth();
  const { totalUsd, breakdown, availableBonus, isLoading, fetch } = useBalanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showDemoPreview, setShowDemoPreview] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetch();
    }
  }, [fetch, isAuthenticated]);

  const onRefresh = async () => {
    if (!isAuthenticated && !showDemoPreview) return;
    setRefreshing(true);
    if (isAuthenticated) {
      await fetch();
    }
    setRefreshing(false);
  };

  const handleSignIn = () => {
    requireAuth({ type: 'navigate_tab', tab: 'home' });
  };

  // Show sign-in prompt when not authenticated (unless demo preview)
  if (!isAuthenticated && !showDemoPreview) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
        </View>

        <View style={styles.signInCard}>
          <Text style={styles.signInIcon}>💰</Text>
          <Text style={styles.signInTitle}>Sign in to see your balance</Text>
          <Text style={styles.signInSubtitle}>
            View your rewards, tokens, and transaction history
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={handleSignIn}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>

          <Pressable style={styles.ghostButton} onPress={() => setShowDemoPreview(true)}>
            <Text style={styles.ghostButtonText}>Preview Demo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Use mock or real data
  const displayUser = isAuthenticated ? user : MOCK_USER;
  const displayTotal = isAuthenticated ? totalUsd : MOCK_BALANCE.totalUsd;
  const displayBonus = isAuthenticated ? availableBonus : MOCK_BALANCE.availableBonus;
  const displayBreakdown = isAuthenticated ? breakdown : MOCK_BALANCE.breakdown;
  const displayLoading = isAuthenticated ? isLoading : false;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.juiceCyan}
        />
      }
    >
      {showDemoPreview && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>Demo Mode</Text>
          <Pressable onPress={() => setShowDemoPreview(false)}>
            <Text style={styles.exitDemoText}>Exit</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello{displayUser?.name ? `, ${displayUser.name}` : ''}
        </Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
        <Text style={styles.balanceAmount}>${displayTotal}</Text>
        {parseFloat(displayBonus) > 0 && (
          <View style={styles.bonusContainer}>
            <Text style={styles.bonus}>+${displayBonus} bonus available</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Tokens</Text>
        {displayLoading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : displayBreakdown.length === 0 ? (
          <Text style={styles.emptyText}>No tokens yet. Pay at a store to earn rewards!</Text>
        ) : (
          displayBreakdown.map((item, index) => (
            <View key={index} style={styles.tokenRow}>
              <Text style={styles.tokenName}>{item.label}</Text>
              <Text style={styles.tokenAmount}>${item.amount_usd}</Text>
            </View>
          ))
        )}
      </View>

      {showDemoPreview && (
        <View style={styles.signInPrompt}>
          <Text style={styles.signInPromptText}>Ready to get started?</Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={handleSignIn}
          >
            <Text style={styles.primaryButtonText}>Sign In Now</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.juiceDark,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[16],
    paddingBottom: spacing[4],
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  greeting: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  demoBanner: {
    backgroundColor: colors.juiceOrange,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demoBannerText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exitDemoText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textDecorationLine: 'underline',
  },
  balanceCard: {
    backgroundColor: colors.juiceDarkLighter,
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.juiceCyan,
    ...shadows.glow,
  },
  balanceLabel: {
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    fontSize: typography.sizes.xs,
    letterSpacing: 1,
  },
  balanceAmount: {
    fontFamily: typography.fontFamily,
    color: colors.white,
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    marginTop: spacing[2],
  },
  bonusContainer: {
    marginTop: spacing[3],
    backgroundColor: colors.juiceOrange,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  bonus: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  section: {
    backgroundColor: colors.juiceDarkLighter,
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[4],
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingText: {
    fontFamily: typography.fontFamily,
    color: colors.gray500,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    color: colors.gray500,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.whiteAlpha10,
  },
  tokenName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.white,
  },
  tokenAmount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.juiceOrange,
  },
  signInCard: {
    backgroundColor: colors.juiceDarkLighter,
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
  },
  signInIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  signInTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.white,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  signInSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  primaryButton: {
    backgroundColor: colors.juiceCyan,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius.lg,
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  ghostButton: {
    marginTop: spacing[4],
    paddingVertical: spacing[2],
  },
  ghostButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    fontSize: typography.sizes.sm,
  },
  signInPrompt: {
    backgroundColor: colors.juiceDarkLighter,
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    marginBottom: spacing[8],
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
  },
  signInPromptText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    marginBottom: spacing[4],
  },
});
