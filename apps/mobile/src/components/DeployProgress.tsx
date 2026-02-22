import { View, Text, StyleSheet, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getChainById } from '../constants/juicebox';
import { colors, typography, spacing } from '../theme';
import type { ChainDeployState } from '../hooks/useDeployRevnet';

interface DeployProgressProps {
  chainStates: ChainDeployState[];
  slowChainIds: number[];
}

function ChainRow({ state, isSlow }: { state: ChainDeployState; isSlow: boolean }) {
  const { t } = useTranslation();
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
            <ActivityIndicator size="small" color={colors.juiceCyan} />
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
      ? colors.success
      : state.status === 'failed'
        ? colors.danger
        : state.status === 'submitted'
          ? colors.juiceCyan
          : colors.gray500;

  return (
    <View style={styles.chainRow}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.chainName}>{chainName}</Text>
      <View style={styles.statusContainer}>{renderStatus()}</View>
    </View>
  );
}

export function DeployProgress({ chainStates, slowChainIds }: DeployProgressProps) {
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

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  chainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[3],
  },
  chainName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    color: colors.white,
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
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
  },
  statusSlow: {
    color: colors.warning,
  },
  statusCreating: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.juiceCyan,
  },
  statusDone: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    color: colors.success,
  },
  statusFailed: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.danger,
  },
  viewLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.juiceCyan,
  },
});
