import { View, Text, StyleSheet, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getChainById } from '../constants/juicebox';
import { spacing, useTheme } from '../theme';
import type { BrandTheme } from '../theme';
import type { ChainDeployState } from '../hooks/useDeployRevnet';

interface DeployProgressProps {
  chainStates: ChainDeployState[];
  slowChainIds: number[];
}

function ChainRow({ state, isSlow }: { state: ChainDeployState; isSlow: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const chain = getChainById(state.chainId);
  const chainName = chain?.name ?? `Chain ${state.chainId}`;

  const openExplorer = () => {
    if (state.txHash && chain?.blockExplorer) {
      Linking.openURL(`${chain.blockExplorer}/tx/${state.txHash}`);
    }
  };

  const renderStatus = () => {
    switch (state.status) {
      case 'pending':
        return (
          <Text style={[styles.statusText, isSlow && styles.statusSlow]}>
            {isSlow ? t('createStore.chainSlow') : t('createStore.chainPending')}
          </Text>
        );
      case 'submitted':
        return (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.statusCreating}>{t('createStore.chainSubmitted')}</Text>
          </View>
        );
      case 'confirmed':
        return (
          <View style={styles.statusRow}>
            <Text style={styles.statusDone}>{'\u2713'}</Text>
            {state.txHash && chain?.blockExplorer && (
              <Pressable onPress={openExplorer}>
                <Text style={styles.viewLink}>{t('createStore.viewExplorer')}</Text>
              </Pressable>
            )}
          </View>
        );
      case 'failed':
        return <Text style={styles.statusFailed}>{t('createStore.chainFailed')}</Text>;
    }
  };

  const dotColor =
    state.status === 'confirmed'
      ? theme.colors.success
      : state.status === 'failed'
        ? theme.colors.danger
        : state.status === 'submitted'
          ? theme.colors.accent
          : theme.colors.textMuted;

  return (
    <View style={styles.chainRow}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.chainName}>{chainName}</Text>
      <View style={styles.statusContainer}>{renderStatus()}</View>
    </View>
  );
}

export function DeployProgress({ chainStates, slowChainIds }: DeployProgressProps) {
  const theme = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={styles.container}>
      {chainStates.map((state) => (
        <ChainRow
          key={state.chainId}
          state={state}
          isSlow={slowChainIds.includes(state.chainId)}
        />
      ))}
    </View>
  );
}

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    container: {
      gap: spacing[3],
    },
    chainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      backgroundColor: t.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: spacing[3],
    },
    chainName: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.base,
      color: t.colors.text,
      flex: 1,
    },
    statusContainer: {
      alignItems: 'flex-end',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    statusText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
    },
    statusSlow: {
      color: t.colors.warning,
    },
    statusCreating: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.accent,
    },
    statusDone: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.base,
      color: t.colors.success,
    },
    statusFailed: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.danger,
    },
    viewLink: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.accent,
    },
  }), [t.key]);
}
