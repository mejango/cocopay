import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { storesApi } from '../../src/api/stores';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

interface Store {
  id: string;
  name: string;
  category: string;
  location?: { address?: string };
  user_rewards_usd: string;
}

// Mock data for development/demo
const MOCK_STORES: Store[] = [
  {
    id: '1',
    name: 'Sunny Side Cafe',
    category: 'Coffee & Breakfast',
    location: { address: '123 Main St, Downtown' },
    user_rewards_usd: '12.50',
  },
  {
    id: '2',
    name: 'Green Garden Market',
    category: 'Grocery',
    location: { address: '456 Oak Ave' },
    user_rewards_usd: '8.75',
  },
  {
    id: '3',
    name: 'Urban Threads',
    category: 'Clothing',
    location: { address: '789 Fashion Blvd' },
    user_rewards_usd: '25.00',
  },
  {
    id: '4',
    name: 'Pixel Perfect Electronics',
    category: 'Electronics',
    location: { address: '321 Tech Park' },
    user_rewards_usd: '0.00',
  },
  {
    id: '5',
    name: 'The Book Nook',
    category: 'Books & Stationery',
    location: { address: '555 Library Lane' },
    user_rewards_usd: '3.20',
  },
  {
    id: '6',
    name: 'Fresh Bites Deli',
    category: 'Restaurant',
    location: { address: '888 Foodie Court' },
    user_rewards_usd: '15.80',
  },
  {
    id: '7',
    name: 'Zen Yoga Studio',
    category: 'Fitness & Wellness',
    location: { address: '100 Peace St' },
    user_rewards_usd: '45.00',
  },
  {
    id: '8',
    name: 'Artisan Bakery',
    category: 'Bakery',
    location: { address: '222 Flour Mill Rd' },
    user_rewards_usd: '7.25',
  },
];

export default function ExploreScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesApi.list(),
    retry: false,
  });

  const stores = (data?.data ?? MOCK_STORES) as Store[];
  const usingMockData = !data?.data;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading stores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>Discover stores accepting CocoPay</Text>
      </View>

      {usingMockData && (
        <View style={styles.mockBanner}>
          <Text style={styles.mockBannerText}>Demo Mode</Text>
        </View>
      )}

      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.storeCard}>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{item.name}</Text>
              <Text style={styles.storeCategory}>{item.category}</Text>
              {item.location?.address && (
                <Text style={styles.storeAddress}>{item.location.address}</Text>
              )}
            </View>
            <View style={styles.rewards}>
              <Text style={styles.rewardsLabel}>rewards</Text>
              <Text style={[
                styles.rewardsAmount,
                parseFloat(item.user_rewards_usd) > 0 && styles.rewardsAmountActive
              ]}>
                ${item.user_rewards_usd}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No stores found nearby</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.juiceDark,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.juiceDark,
  },
  loadingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
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
  headerSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    marginTop: spacing[1],
  },
  mockBanner: {
    backgroundColor: colors.juiceOrange,
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[4],
  },
  mockBannerText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    padding: spacing[4],
  },
  storeCard: {
    backgroundColor: colors.juiceDarkLighter,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
  },
  storeCardPressed: {
    backgroundColor: colors.whiteAlpha10,
    borderColor: colors.whiteAlpha20,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  storeCategory: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.juiceCyan,
    marginTop: spacing[0.5],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storeAddress: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    marginTop: spacing[1],
  },
  rewards: {
    alignItems: 'flex-end',
  },
  rewardsLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rewardsAmount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.gray500,
    marginTop: spacing[0.5],
  },
  rewardsAmountActive: {
    color: colors.juiceOrange,
  },
  empty: {
    padding: spacing[10],
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    color: colors.gray500,
    fontSize: typography.sizes.sm,
  },
});
