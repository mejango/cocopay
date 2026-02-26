import { View, Text, StyleSheet, ScrollView, Image, ImageSourcePropType } from 'react-native';
import { useMemo } from 'react';
import { spacing, typography, useTheme } from '../../src/theme';
import type { BrandTheme } from '../../src/theme';
import { PageContainer } from '../../src/components/PageContainer';

const LOGOS = {
  cafe: require('../../assets/store-img/cafe.png'),
  mercado: require('../../assets/store-img/mercado.png'),
  acai: require('../../assets/store-img/acai.png'),
  restaurant: require('../../assets/store-img/restaurant.png'),
};

interface MockToken {
  symbol: string;
  name: string;
  balance: number;
  logo: ImageSourcePropType;
  selected: boolean;
  amount: string;
}

const MOCK_TOKENS: MockToken[] = [
  { symbol: 'CAFE', name: 'Café do Campeche', balance: 892, logo: LOGOS.cafe, selected: true, amount: '45.90' },
  { symbol: 'MRT', name: 'Mercado Rio Tavares', balance: 634, logo: LOGOS.mercado, selected: false, amount: '0.00' },
  { symbol: 'ACAI', name: 'Açaí da Praia', balance: 421, logo: LOGOS.acai, selected: false, amount: '0.00' },
];

export default function MockPayment() {
  const theme = useTheme();
  const styles = useStyles(theme);

  return (
    <PageContainer>
      <View style={styles.container}>
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          {/* Centered Amount Input */}
          <View style={styles.amountSection}>
            <Image source={LOGOS.restaurant} style={styles.storeLogo} />
            <Text style={styles.storeName}>RESTAURANTE RIOZINHO</Text>
            <Text style={styles.amountInput}>$45.90</Text>
          </View>

          {/* Token Selection */}
          <View style={styles.tokenSection}>
            <View style={styles.tokenSectionHeader}>
              <Text style={styles.tokenSectionLabel}>PAGAR COM</Text>
              <Text style={styles.tokenSectionTotal}>45.90 / 45.90</Text>
            </View>

            {MOCK_TOKENS.map((token) => (
              <View
                key={token.symbol}
                style={[
                  styles.tokenRow,
                  token.selected && styles.tokenRowSelected,
                ]}
              >
                <Image source={token.logo} style={styles.tokenLogo} />
                <View style={styles.tokenInfo}>
                  <Text style={[styles.tokenShort, token.selected && styles.tokenShortSelected]}>
                    {token.symbol}
                  </Text>
                  <Text style={styles.tokenName}>{token.name}</Text>
                </View>
                {token.selected ? (
                  <View style={styles.tokenAmountDisplay}>
                    <Text style={styles.tokenAmountValue}>${token.amount}</Text>
                    <Text style={styles.tokenMaxLabel}>/ ${Math.round(token.balance).toLocaleString()}</Text>
                  </View>
                ) : (
                  <Text style={styles.tokenBalance}>
                    ${Math.round(token.balance).toLocaleString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomContainer}>
          <View style={styles.dockLeft}>
            <View style={styles.bottomBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </View>
          </View>
          <View style={styles.dockSpacer} />
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
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingHorizontal: spacing[4],
      paddingBottom: 120,
    },
    amountSection: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      paddingVertical: spacing[8],
    },
    amountInput: {
      fontFamily: t.typography.fontFamily,
      fontSize: 72,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accent,
      textAlign: 'center',
      marginBottom: spacing[3],
    },
    storeName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textSecondary,
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
      fontFamily: t.typography.fontFamily,
      color: t.colors.textSecondary,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      letterSpacing: 2,
    },
    tokenSectionTotal: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accent,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
    },
    tokenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3],
      marginBottom: spacing[2],
      backgroundColor: t.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.sm,
    },
    tokenRowSelected: {
      borderColor: t.colors.accentSecondary,
      backgroundColor: `${t.colors.accentSecondary}1A`,
    },
    storeLogo: {
      width: 96,
      height: 96,
      borderRadius: t.borderRadius.md,
      marginBottom: spacing[6],
    },
    tokenLogo: {
      width: 32,
      height: 32,
      marginRight: spacing[2],
      borderRadius: t.borderRadius.sm,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenShort: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.base,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textSecondary,
    },
    tokenShortSelected: {
      color: t.colors.accentSecondary,
    },
    tokenName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
      marginTop: spacing[0.5],
    },
    tokenBalance: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textMuted,
    },
    tokenAmountDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenAmountValue: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accentSecondary,
    },
    tokenMaxLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      marginLeft: spacing[1],
    },
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
    topBackArrow: {
      fontFamily: typography.fontFamily,
      color: t.colors.text,
      fontSize: 32,
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
  }), [t.key]);
}
