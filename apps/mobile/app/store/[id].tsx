import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { useState, useEffect, useRef, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../src/hooks/useRequireAuth';
import { useCashOutPopoverStore } from '../../src/stores/cashOutPopover';
import { spacing, typography, useTheme } from '../../src/theme';
import type { BrandTheme } from '../../src/theme';
import { PageContainer } from '../../src/components/PageContainer';
import {
  fetchProjectStats,
  fetchUserPayEvents,
  fetchProjectTimeline,
  fetchBalanceHistory,
  generatePaymentsGraphData,
  type ProjectStats,
  type GraphData,
} from '../../src/services/bendystraw';
import { useBalanceStore } from '../../src/stores/balance';

// Interactive bar graph with time range labels
interface GraphStatProps {
  label: string;
  value: string;
  data: number[];
  labels: string[];
  color: string;
  isLoading?: boolean;
  rangeLabel?: string;
  formatValue?: (val: number, index: number, total: number) => string;
}

function GraphStat({ label, value, data, labels, color, isLoading, rangeLabel = '30d', formatValue }: GraphStatProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const maxValue = Math.max(...data, 1);

  const defaultFormat = (val: number, _index: number, _total: number) => val.toString();
  const format = formatValue || defaultFormat;

  // If no label/value, render just the graph (embedded mode)
  const isEmbedded = !label && !value;

  return (
    <View style={isEmbedded ? undefined : styles.statSection}>
      {!isEmbedded && <Text style={styles.statLabel}>{label}</Text>}
      {!isEmbedded && (
        <View style={styles.valueRow}>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
          {isLoading && <ActivityIndicator color={color} size="small" style={styles.valueSpinner} />}
        </View>
      )}
      <View style={styles.graphContainer}>
        <View style={styles.graphBars}>
          {data.map((val, index) => {
            const height = maxValue > 0 ? (val / maxValue) * 100 : 0;
            const isSelected = selectedIndex === index;
            return (
              <Pressable
                key={index}
                style={styles.graphBarWrapper}
                onPress={() => setSelectedIndex(isSelected ? null : index)}
              >
                <View
                  style={[
                    styles.graphBar,
                    {
                      height: `${Math.max(height, 2)}%`,
                      backgroundColor: isSelected ? color.replace(/[\d.]+\)$/, '1)') : color,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      {selectedIndex !== null && labels.length > 0 ? (
        <View style={styles.graphLabels}>
          <View style={styles.tooltipLeft}>
            <Text style={[styles.tooltipDate, { color }]}>
              {labels[selectedIndex] || ''}
            </Text>
            <Text style={[styles.tooltipValue, { color }]}>
              {format(data[selectedIndex] || 0, selectedIndex, data.length)}
            </Text>
          </View>
          <View />
        </View>
      ) : (
        <View style={styles.graphLabels}>
          <Text style={styles.graphLabel}>{rangeLabel}</Text>
          <Text style={styles.graphLabel}>{t('store.today')}</Text>
        </View>
      )}
    </View>
  );
}

// Time range options for volume graph
type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';
const TIME_RANGES: { key: TimeRange; label: string; days: number }[] = [
  { key: '1m', label: '1m', days: 30 },
  { key: '3m', label: '3m', days: 90 },
  { key: '6m', label: '6m', days: 180 },
  { key: '1y', label: '1y', days: 365 },
  { key: 'all', label: 'Tudo', days: 3650 }, // ~10 years for "all time"
];

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

function TimeRangeSelector({ selected, onSelect }: TimeRangeSelectorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={styles.timeRangeContainer}>
      {TIME_RANGES.map((range) => (
        <Pressable
          key={range.key}
          style={[
            styles.timeRangeButton,
            selected === range.key && styles.timeRangeButtonActive,
          ]}
          onPress={() => onSelect(range.key)}
        >
          <Text
            style={[
              styles.timeRangeText,
              selected === range.key && styles.timeRangeTextActive,
            ]}
          >
            {range.key === 'all' ? t('store.all') : range.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function RevnetDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    balance: string;
    tokenSymbol: string;
    logoUri: string;
    chainId: string;
    projectId: string;
    rawBalance: string;
    cashOutValueUsd: string;
  }>();
  const { requireAuth } = useRequireAuth();
  const cashOutMenuRef = useRef<View>(null);
  const openCashOutPopover = useCashOutPopoverStore((s) => s.open);
  const walletAddress = useBalanceStore((state) => state.walletAddress);
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);

  // Graph data with time ranges
  const [balanceGraph, setBalanceGraph] = useState<GraphData>({ values: [], labels: [] });
  const [paymentsGraph, setPaymentsGraph] = useState<GraphData>({ values: [], labels: [] });
  const [volumeGraph, setVolumeGraph] = useState<GraphData>({ values: [], labels: [] });
  const [timeRange, setTimeRange] = useState<TimeRange>('1m');

  const [isLoading, setIsLoading] = useState(true);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [isVolumeLoading, setIsVolumeLoading] = useState(false);
  const [userPaymentsCount, setUserPaymentsCount] = useState(0);

  const balance = parseFloat(params.balance || '0');
  const hasBalance = balance > 0;
  const tokenSymbol = params.tokenSymbol || 'TOKEN';
  const chainId = parseInt(params.chainId || '1', 10);
  const projectId = parseInt(params.projectId || '0', 10);

  // Fetch project stats on mount
  useEffect(() => {
    async function loadProjectData() {
      setIsLoading(true);
      try {
        const stats = await fetchProjectStats(projectId, chainId);
        if (stats) {
          setProjectStats(stats);
        }
      } catch (error) {
        console.error('Failed to load project data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (projectId > 0) {
      loadProjectData();
    } else {
      setIsLoading(false);
    }
  }, [projectId, chainId]);

  // Fetch balance history when time range changes
  useEffect(() => {
    async function loadBalanceHistory() {
      if (projectId <= 0 || !walletAddress) return;

      setIsBalanceLoading(true);
      try {
        const days = TIME_RANGES.find(r => r.key === timeRange)?.days ?? 30;
        // Parse current balance (remove commas from formatted string) to fill recent periods
        const currentBalanceNumber = parseFloat((params.balance || '0').replace(/,/g, ''));
        const history = await fetchBalanceHistory(projectId, chainId, walletAddress, days, currentBalanceNumber);
        setBalanceGraph(history.values.length > 0 ? history : { values: new Array(10).fill(0), labels: [] });
      } catch (error) {
        console.error('Failed to load balance history:', error);
        setBalanceGraph({ values: new Array(10).fill(0), labels: [] });
      } finally {
        setIsBalanceLoading(false);
      }
    }

    loadBalanceHistory();
  }, [projectId, chainId, walletAddress, timeRange, params.balance]);

  // Fetch user's payments when time range changes
  useEffect(() => {
    async function loadPayments() {
      if (projectId <= 0 || !walletAddress) return;

      setIsPaymentsLoading(true);
      try {
        const days = TIME_RANGES.find(r => r.key === timeRange)?.days ?? 30;
        const payEvents = await fetchUserPayEvents(projectId, chainId, walletAddress, 500);
        setUserPaymentsCount(payEvents.length);
        const graph = generatePaymentsGraphData(payEvents, 10, days);
        setPaymentsGraph(graph.values.length > 0 ? graph : { values: new Array(10).fill(0), labels: [] });
      } catch (error) {
        console.error('Failed to load user payments:', error);
        setPaymentsGraph({ values: new Array(10).fill(0), labels: [] });
      } finally {
        setIsPaymentsLoading(false);
      }
    }

    loadPayments();
  }, [projectId, chainId, walletAddress, timeRange]);

  // Fetch volume timeline when time range changes
  useEffect(() => {
    async function loadVolumeTimeline() {
      if (projectId <= 0) return;

      setIsVolumeLoading(true);
      try {
        const days = TIME_RANGES.find(r => r.key === timeRange)?.days ?? 30;
        // Pass current volumeUsd as fallback for single-chain projects without suckerGroupId
        const fallbackVolume = projectStats?.volumeUsd;
        // Detect USDC projects by tokenSymbol (Bendystraw tokenSymbol is the accounting currency)
        const isUsdcProject = projectStats?.tokenSymbol === 'USDC';
        const timeline = await fetchProjectTimeline(projectId, chainId, days, fallbackVolume, isUsdcProject);
        setVolumeGraph(timeline.volume.length > 0
          ? { values: timeline.volume, labels: timeline.labels }
          : { values: new Array(10).fill(0), labels: [] }
        );
      } catch (error) {
        console.error('Failed to load volume timeline:', error);
        setVolumeGraph({ values: new Array(10).fill(0), labels: [] });
      } finally {
        setIsVolumeLoading(false);
      }
    }

    loadVolumeTimeline();
  }, [projectId, chainId, timeRange, projectStats?.volumeUsd, projectStats?.tokenSymbol]);

  // Compute range label for graph x-axis start
  const rangeLabel = useMemo(() => {
    if (timeRange === 'all') {
      // Use first bucket label from loaded graph data as the start reference
      const firstLabel = volumeGraph.labels[0] || balanceGraph.labels[0] || paymentsGraph.labels[0];
      if (firstLabel) {
        // For range labels like "10 Feb - 17 Feb", extract the start part
        const parts = firstLabel.split(' - ');
        return parts[0];
      }
      return t('store.all');
    }
    switch (timeRange) {
      case '1m': return '30d';
      case '3m': return '3m';
      case '6m': return '6m';
      case '1y': return '1y';
      default: return '30d';
    }
  }, [timeRange, volumeGraph.labels, balanceGraph.labels, paymentsGraph.labels, t]);

  const handleCashOutMenu = () => {
    cashOutMenuRef.current?.measureInWindow((x, y, w, h) => {
      const anchor = { x, y, width: w, height: h };
      if (!requireAuth({ type: 'action', action: 'cash_out' }, anchor)) {
        return;
      }
      openCashOutPopover(anchor, {
        storeName: params.name || '',
        balance: params.balance || '0',
        tokenSymbol: params.tokenSymbol || 'TOKEN',
        chainId: params.chainId || '1',
        projectId: params.projectId || '0',
        rawBalance: params.rawBalance || '0',
        cashOutValueUsd: params.cashOutValueUsd || '0',
      });
    });
  };

  const handleCharge = () => {
    router.push({
      pathname: '/charge',
      params: { storeId: params.id, storeName: params.name, storeLogo: params.logoUri || '', tokenSymbol: params.tokenSymbol || '' },
    });
  };

  const handleSpend = () => {
    router.push({
      pathname: '/payment',
      params: { storeId: params.id, storeName: params.name, storeLogo: params.logoUri || '' },
    });
  };

  const handleDismiss = () => {
    router.back();
  };

  // Format display values - use user's payment count, not project total
  const paymentsCount = userPaymentsCount;

  // Cash out value in USD (passed from main screen)
  const cashOutValueUsd = parseFloat(params.cashOutValueUsd || '0');
  const cashOutValueFormatted = cashOutValueUsd >= 1
    ? `$${Math.round(cashOutValueUsd).toLocaleString()}`
    : '$0';

  // Use pre-calculated volumeUsd from Bendystraw
  const volumeUsd = projectStats?.volumeUsd ?? 0;
  const networkValueFormatted = volumeUsd >= 1
    ? `$${Math.round(volumeUsd).toLocaleString()}`
    : '$0';

  // Format balance for graph tooltip (show USD value, use header value for last bar)
  const formatBalance = (val: number, index: number, total: number) => {
    if (index === total - 1 && cashOutValueUsd > 0) {
      return cashOutValueUsd >= 1000 ? `$${(cashOutValueUsd / 1000).toFixed(1)}k` : `$${Math.round(cashOutValueUsd)}`;
    }
    return val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${Math.round(val)}`;
  };
  const formatPayments = (val: number, _index: number, _total: number) => t('store.payments', { count: val });
  // For network volume, use the consistent header value for current (last bar)
  const formatVolumeWithTotal = (val: number, index: number, total: number) => {
    // If this is the last bar and we have a header value, use it for consistency
    if (index === total - 1 && volumeUsd > 0) {
      return volumeUsd >= 1000 ? `$${(volumeUsd / 1000).toFixed(1)}k` : `$${Math.round(volumeUsd)}`;
    }
    return val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${Math.round(val)}`;
  };

  return (
    <PageContainer>
      <View style={styles.container}>
        {/* Top Bar - back button (desktop only) */}
        {!isMobile && (
          <View style={styles.topBar}>
            <Pressable onPress={handleDismiss} style={styles.topBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </Pressable>
          </View>
        )}
        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
          {params.logoUri ? (
            <Image source={{ uri: params.logoUri }} style={styles.headerLogo} />
          ) : null}
          <View style={styles.headerTextColumn}>
            <Text style={styles.headerName}>{params.name}</Text>
            <Text style={styles.headerToken}>{tokenSymbol}</Text>
          </View>
        </View>
        <TimeRangeSelector
          selected={timeRange}
          onSelect={setTimeRange}
        />
        {/* VOLUME DA REDE - moved to top */}
        <View style={styles.statSection}>
          <Text style={styles.statLabel}>{t('store.networkVolume')}</Text>
          {isLoading || isVolumeLoading ? (
            <View style={styles.loadingValue}>
              <ActivityIndicator color={'#a78bfa'} size="small" />
            </View>
          ) : (
            <Text style={[styles.statValue, { color: '#a78bfa' }]}>
              {networkValueFormatted}
            </Text>
          )}
          <GraphStat
            label=""
            value=""
            data={volumeGraph.values.length > 0 ? volumeGraph.values : new Array(10).fill(0)}
            labels={volumeGraph.labels}
            color={'rgba(167, 139, 250, 0.7)'}
            isLoading={isVolumeLoading}
            rangeLabel={rangeLabel}
            formatValue={formatVolumeWithTotal}
          />
        </View>

        {/* SEU SALDO - Cash out value in USD */}
        <View style={styles.statSection}>
          <View style={styles.volumeHeader}>
            <Text style={styles.statLabel}>{t('store.yourBalance')}</Text>
            {hasBalance && (
              <Pressable ref={cashOutMenuRef} onPress={handleCashOutMenu} hitSlop={8}>
                <Text style={styles.menuDots}>⋮</Text>
              </Pressable>
            )}
          </View>
          {isLoading ? (
            <View style={styles.loadingValue}>
              <ActivityIndicator color={'#f472b6'} size="small" />
            </View>
          ) : (
            <Text style={[styles.statValue, { color: '#f472b6' }]}>
              {cashOutValueFormatted}
            </Text>
          )}
          <GraphStat
            label=""
            value=""
            data={balanceGraph.values.length > 0 ? balanceGraph.values : new Array(10).fill(0)}
            labels={balanceGraph.labels}
            color={'rgba(244, 114, 182, 0.7)'}
            isLoading={isBalanceLoading}
            rangeLabel={rangeLabel}
            formatValue={formatBalance}
          />
        </View>

        {/* SEUS PAGAMENTOS (user's payments only) */}
        <View style={styles.statSection}>
          <Text style={styles.statLabel}>{t('store.yourPayments')}</Text>
          {isLoading ? (
            <View style={styles.loadingValue}>
              <ActivityIndicator color={theme.colors.text} size="small" />
            </View>
          ) : (
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {paymentsCount}
            </Text>
          )}
          <GraphStat
            label=""
            value=""
            data={paymentsGraph.values.length > 0 ? paymentsGraph.values : new Array(10).fill(0)}
            labels={paymentsGraph.labels}
            color={'rgba(255, 255, 255, 0.7)'}
            isLoading={isPaymentsLoading}
            rangeLabel={rangeLabel}
            formatValue={formatPayments}
          />
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.buttonContainer}>
        <View style={styles.dockLeft}>
          {isMobile && (
            <Pressable onPress={handleDismiss} style={styles.bottomBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.dockSpacer} />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.qrButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleCharge}
        >
          <Text style={styles.qrButtonText}>{t('store.charge')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.spendButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSpend}
        >
          <Text style={styles.spendButtonText}>
            {hasBalance ? t('store.spend') : t('store.spendHere')}
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
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: spacing[3],
      marginBottom: spacing[6],
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    headerRowMobile: {
      paddingTop: spacing[6],
    },
    headerLogo: {
      width: 40,
      height: 40,
      borderRadius: t.borderRadius.sm,
      marginRight: spacing[3],
    },
    headerTextColumn: {
      flex: 1,
    },
    topBackButton: {
      paddingVertical: spacing[2],
      paddingRight: spacing[3],
    },
    topBackArrow: {
      fontFamily: typography.fontFamily,
      color: t.colors.text,
      fontSize: 32,
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
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: 120,
    },
    storeName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes['2xl'],
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
    },
    chainName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      marginTop: spacing[1],
      marginBottom: spacing[8],
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
    statValueSuffix: {
      fontSize: t.typography.sizes.lg,
      color: t.colors.textSecondary,
    },
    tokenBalanceSubtext: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      marginTop: -spacing[1],
      marginBottom: spacing[2],
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    valueSpinner: {
      marginBottom: spacing[1],
    },
    loadingValue: {
      height: 60,
      justifyContent: 'center',
      marginTop: spacing[1],
      marginBottom: spacing[2],
    },
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
    graphBarSelected: {
      // Selected state handled inline with full opacity
    },
    tooltipDate: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.accent,
    },
    tooltipValue: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accent,
    },
    tooltipLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
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
    buttonPressed: {
      opacity: 0.9,
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
    dockLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    bottomBackButton: {
      paddingVertical: spacing[2],
      paddingRight: spacing[2],
    },
    spendButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
  }), [t.key]);
}
