import { View, Text, StyleSheet, FlatList, Image, ImageSourcePropType } from 'react-native';
import { useMemo } from 'react';
import { spacing, useTheme } from '../../src/theme';
import type { BrandTheme } from '../../src/theme';
import { PageContainer } from '../../src/components/PageContainer';

// Static logo assets
const LOGOS = {
  usdc: require('../../assets/store-img/usdc.png'),
  cafe: require('../../assets/store-img/cafe.png'),
  mercado: require('../../assets/store-img/mercado.png'),
  acai: require('../../assets/store-img/acai.png'),
  padaria: require('../../assets/store-img/padaria.png'),
  bike: require('../../assets/store-img/bike.png'),
};

interface MockStore {
  name: string;
  symbol: string;
  cashOutValueUsd: number;
  logo: ImageSourcePropType;
}

const MOCK_STORES: MockStore[] = [
  { name: 'Dólares Digitais', symbol: 'USDC', cashOutValueUsd: 500, logo: LOGOS.usdc },
  { name: 'Café do Campeche', symbol: 'CAFE', cashOutValueUsd: 892, logo: LOGOS.cafe },
  { name: 'Mercado Rio Tavares', symbol: 'MRT', cashOutValueUsd: 634, logo: LOGOS.mercado },
  { name: 'Açaí da Praia', symbol: 'ACAI', cashOutValueUsd: 421, logo: LOGOS.acai },
  { name: 'Padaria Açoriana', symbol: 'PAD', cashOutValueUsd: 287, logo: LOGOS.padaria },
  { name: 'Bicicletaria Campeche', symbol: 'BIKE', cashOutValueUsd: 113, logo: LOGOS.bike },
];

function formatUsd(value: number): string {
  if (value >= 1) return `$${Math.round(value).toLocaleString()}`;
  if (value > 0) return `$${value.toFixed(2)}`;
  return '$0';
}

export default function MockDashboard() {
  const theme = useTheme();
  const styles = useStyles(theme);

  const total = MOCK_STORES.reduce((sum, s) => sum + s.cashOutValueUsd, 0);

  return (
    <PageContainer>
      <View style={styles.container}>
        <FlatList
          data={MOCK_STORES}
          keyExtractor={(item) => item.symbol}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.totalCard}>
              <View style={styles.labelRow}>
                <Text style={styles.coconutEmoji}>🥥</Text>
                <Text style={styles.totalLabel}>SEU SALDO</Text>
              </View>
              <Text style={styles.totalAmount}>{formatUsd(total)}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const hasValue = item.cashOutValueUsd > 0;
            return (
              <View style={styles.storeRow}>
                <Image source={item.logo} style={styles.storeLogo} />
                <View style={styles.nameColumn}>
                  <Text style={[styles.cashOutValue, hasValue && styles.cashOutValueActive]}>
                    {formatUsd(item.cashOutValueUsd)}
                  </Text>
                  <Text style={styles.storeName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                </View>
              </View>
            );
          }}
        />

        {/* Bottom Dock */}
        <View style={styles.payButtonContainer}>
          <View style={styles.dockLeft}>
            <View style={styles.dockItem}>
              <Text style={styles.greenCircle}>●</Text>
              <Text style={styles.connectedText}>0xA3f...c8E2</Text>
            </View>
            <Text style={styles.pipeSeparator}>|</Text>
            <View style={styles.dockItem}>
              <Text style={styles.dockItemText}>PT</Text>
            </View>
            <Text style={styles.pipeSeparator}>|</Text>
            <View style={styles.dockItem}>
              <Text style={styles.dockItemText}>○</Text>
            </View>
            <Text style={styles.pipeSeparator}>|</Text>
            <View style={styles.dockItem}>
              <Text style={styles.coconutBottom}>🥥</Text>
            </View>
          </View>

          <View style={styles.payButton}>
            <Text style={styles.payButtonText}>PAGAR</Text>
          </View>
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
    totalCard: {
      paddingTop: spacing[16],
      paddingBottom: spacing[6],
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    totalLabel: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.textSecondary,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      letterSpacing: 2,
    },
    coconutEmoji: {
      fontSize: 24,
    },
    totalAmount: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.text,
      fontSize: 48,
      fontWeight: t.typography.weights.bold,
      marginTop: spacing[1],
    },
    list: {
      paddingHorizontal: spacing[4],
      paddingBottom: 120,
    },
    storeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    storeLogo: {
      width: 48,
      height: 48,
      borderRadius: t.borderRadius.sm,
      marginRight: spacing[4],
      backgroundColor: t.colors.backgroundSecondary,
    },
    nameColumn: {
      flex: 1,
    },
    cashOutValue: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textMuted,
      marginBottom: spacing[1],
    },
    cashOutValueActive: {
      color: '#4ade80',
    },
    storeName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.text,
    },
    tokenSymbol: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
      marginTop: spacing[0.5],
    },
    payButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
      gap: spacing[2],
    },
    dockItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      paddingVertical: spacing[1],
      paddingHorizontal: spacing[1],
    },
    dockItemText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
    },
    pipeSeparator: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      opacity: 0.4,
    },
    greenCircle: {
      fontSize: 14,
      color: t.colors.success,
    },
    connectedText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textSecondary,
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
    payButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
    coconutBottom: {
      fontSize: 20,
    },
  }), [t.key]);
}
