import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { spacing, typography, useTheme } from '../../src/theme';
import type { BrandTheme } from '../../src/theme';
import { PageContainer } from '../../src/components/PageContainer';

// Mock bar graph data — realistic growth curves
const VOLUME_DATA = [12, 18, 25, 31, 22, 38, 45, 52, 41, 58];
const BALANCE_DATA = [0, 15, 28, 35, 42, 55, 68, 72, 80, 89];
const PAYMENTS_DATA = [1, 2, 3, 2, 4, 3, 5, 2, 3, 4];

function BarGraph({ data, color }: { data: number[]; color: string }) {
  const theme = useTheme();
  const styles = useBarStyles(theme);
  const maxValue = Math.max(...data, 1);

  return (
    <View style={styles.graphContainer}>
      <View style={styles.graphBars}>
        {data.map((val, index) => {
          const height = maxValue > 0 ? (val / maxValue) * 100 : 0;
          return (
            <View key={index} style={styles.graphBarWrapper}>
              <View
                style={[
                  styles.graphBar,
                  {
                    height: `${Math.max(height, 2)}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.graphLabels}>
        <Text style={styles.graphLabel}>30d</Text>
        <Text style={styles.graphLabel}>hoje</Text>
      </View>
    </View>
  );
}

export default function MockStoreDetail() {
  const theme = useTheme();
  const styles = useStyles(theme);

  return (
    <PageContainer>
      <View style={styles.container}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLogoPlaceholder}>
              <Text style={styles.headerLogoInitial}>C</Text>
            </View>
            <View style={styles.headerTextColumn}>
              <Text style={styles.headerName}>Café do Campeche</Text>
              <Text style={styles.headerToken}>CAFE</Text>
            </View>
          </View>

          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            {['1m', '3m', '6m', '1y', 'Tudo'].map((label, i) => (
              <View
                key={label}
                style={[
                  styles.timeRangeButton,
                  i === 0 && styles.timeRangeButtonActive,
                ]}
              >
                <Text style={[
                  styles.timeRangeText,
                  i === 0 && styles.timeRangeTextActive,
                ]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {/* Network Volume */}
          <View style={styles.statSection}>
            <Text style={styles.statLabel}>VOLUME DA REDE</Text>
            <Text style={[styles.statValue, { color: '#a78bfa' }]}>$12.450</Text>
            <BarGraph data={VOLUME_DATA} color="rgba(167, 139, 250, 0.7)" />
          </View>

          {/* Your Balance */}
          <View style={styles.statSection}>
            <View style={styles.volumeHeader}>
              <Text style={styles.statLabel}>SEU SALDO</Text>
              <Text style={styles.menuDots}>⋮</Text>
            </View>
            <Text style={[styles.statValue, { color: '#f472b6' }]}>$892</Text>
            <BarGraph data={BALANCE_DATA} color="rgba(244, 114, 182, 0.7)" />
          </View>

          {/* Your Payments */}
          <View style={styles.statSection}>
            <Text style={styles.statLabel}>SEUS PAGAMENTOS</Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>23</Text>
            <BarGraph data={PAYMENTS_DATA} color="rgba(255, 255, 255, 0.7)" />
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.buttonContainer}>
          <View style={styles.dockLeft}>
            <View style={styles.bottomBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </View>
          </View>
          <View style={styles.dockSpacer} />
          <View style={[styles.button, styles.qrButton]}>
            <Text style={styles.qrButtonText}>COBRAR</Text>
          </View>
          <View style={[styles.button, styles.spendButton]}>
            <Text style={styles.spendButtonText}>GASTAR</Text>
          </View>
        </View>
      </View>
    </PageContainer>
  );
}

function useBarStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    graphContainer: {
      height: 80,
    },
    graphBars: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
    },
    graphBarWrapper: {
      flex: 1,
      height: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    graphBar: {
      width: '100%',
      minHeight: 2,
    },
    graphLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing[2],
    },
    graphLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
    },
  }), [t.key]);
}

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[6],
      paddingBottom: 120,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: spacing[3],
      marginBottom: spacing[6],
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    headerLogoPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: t.borderRadius.sm,
      marginRight: spacing[3],
      backgroundColor: t.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerLogoInitial: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textSecondary,
    },
    headerTextColumn: {
      flex: 1,
    },
    headerName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
    },
    headerToken: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
    },
    timeRangeContainer: {
      flexDirection: 'row',
      gap: spacing[1],
      marginBottom: spacing[4],
    },
    timeRangeButton: {
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
      borderRadius: 4,
    },
    timeRangeButtonActive: {
      backgroundColor: t.colors.border,
    },
    timeRangeText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
    },
    timeRangeTextActive: {
      color: t.colors.accent,
    },
    statSection: {
      marginBottom: spacing[10],
    },
    statLabel: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.textSecondary,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      letterSpacing: 2,
    },
    statValue: {
      fontFamily: t.typography.fontFamily,
      fontSize: 48,
      fontWeight: t.typography.weights.bold,
      marginTop: spacing[1],
      marginBottom: spacing[2],
    },
    volumeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing[1],
    },
    menuDots: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      color: t.colors.textSecondary,
      paddingHorizontal: spacing[2],
    },
    buttonContainer: {
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
    dockSpacer: {
      flex: 1,
    },
    button: {
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    qrButton: {
      backgroundColor: t.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.md,
    },
    qrButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.text,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
    spendButton: {
      backgroundColor: t.colors.accent,
      borderRadius: t.borderRadius.md,
    },
    spendButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
    dockLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
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
  }), [t.key]);
}
