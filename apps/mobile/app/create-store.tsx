import { View, Text, StyleSheet, Pressable, TextInput, Alert, useWindowDimensions, ScrollView, Image } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { useAuthStore } from '../src/stores/auth';
import { storesApi } from '../src/api/stores';
import { useDeployRevnet } from '../src/hooks/useDeployRevnet';
import { DeployProgress } from '../src/components/DeployProgress';
import { colors, typography, spacing } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';

const PROD_CHAIN_IDS = [8453, 10, 42161, 1]; // Base, Optimism, Arbitrum, Ethereum
const TEST_CHAIN_IDS = [84532, 11155420, 421614, 11155111]; // Base Sepolia, OP Sepolia, Arb Sepolia, Eth Sepolia

export default function CreateStoreScreen() {
  const { requireAuth } = useRequireAuth();
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const [storeName, setStoreName] = useState('');
  const [shortName, setShortName] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [phase, setPhase] = useState<'form' | 'deploying'>('form');
  const [storeId, setStoreId] = useState<string | null>(null);
  const createRef = useRef<View>(null);

  const { status: deployStatus, chainStates, slowChainIds, error: deployError, deploy, dismiss } = useDeployRevnet();

  // Navigate to store on completion
  useEffect(() => {
    if (deployStatus === 'completed' && storeId) {
      router.replace(`/store/${storeId}`);
    }
  }, [deployStatus, storeId]);

  // Show error alert on failure
  useEffect(() => {
    if (deployStatus === 'failed' && deployError) {
      Alert.alert(t('createStore.errorTitle'), deployError);
    }
  }, [deployStatus, deployError, t]);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleDismiss = () => {
    if (phase === 'deploying' && deployStatus === 'processing') {
      // Don't allow dismissing while actively deploying
      return;
    }
    if (phase === 'deploying') {
      dismiss();
      setPhase('form');
      setIsLoading(false);
      return;
    }
    router.back();
  };

  const doCreate = async () => {
    if (!storeName.trim()) {
      Alert.alert(t('createStore.errorTitle'), t('createStore.errorEmptyName'));
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      // 1. Create store record in backend
      const store = await storesApi.create({
        name: storeName.trim(),
        symbol: shortName.trim() || storeName.trim().slice(0, 7).toUpperCase(),
        description: website || undefined,
      });

      setStoreId(store.id);

      if (user.auth_type === 'self_custody' && user.wallet_address) {
        // Self-custody: deploy via hook with per-chain progress
        setPhase('deploying');

        await deploy({
          name: storeName.trim(),
          ticker: shortName.trim() || storeName.trim().slice(0, 7).toUpperCase(),
          walletAddress: user.wallet_address,
          chainIds: testMode ? TEST_CHAIN_IDS : PROD_CHAIN_IDS,
          testMode,
        });
      } else {
        // Managed users: backend handles deployment via StoreDeploymentJob
        router.replace(`/store/${store.id}`);
      }
    } catch (error) {
      setPhase('form');
      Alert.alert(
        t('createStore.errorTitle'),
        error instanceof Error ? error.message : t('createStore.comingSoonMessage')
      );
    } finally {
      if (phase === 'form') {
        setIsLoading(false);
      }
    }
  };

  const handleCreate = () => {
    createRef.current?.measureInWindow((x, y, w, h) => {
      if (!requireAuth({ type: 'action', action: 'create_store' }, { x, y, width: w, height: h })) {
        return;
      }
      doCreate();
    });
  };

  const handleSlowDismiss = () => {
    if (storeId) {
      router.replace(`/store/${storeId}`);
    }
  };

  // ── Deploying phase ──
  if (phase === 'deploying') {
    return (
      <PageContainer>
        <View style={styles.container}>
          {!isMobile && (
            <View style={styles.topBar}>
              <View style={styles.topBackButton} />
            </View>
          )}

          <ScrollView
            style={[styles.content, isMobile && styles.contentMobile]}
            contentContainerStyle={styles.contentContainer}
          >
            <Text style={styles.title}>{storeName}</Text>
            <Text style={styles.deployingLabel}>{t('createStore.deploying')}</Text>

            <View style={styles.progressSection}>
              <DeployProgress chainStates={chainStates} slowChainIds={slowChainIds} />
            </View>

            {deployStatus === 'failed' && deployError ? (
              <Text style={styles.errorText}>{deployError}</Text>
            ) : (
              <Text style={styles.doNotClose}>{t('createStore.doNotClose')}</Text>
            )}

            {deployStatus === 'failed' && (
              <View style={styles.slowDismissContainer}>
                <Pressable
                  style={({ pressed }) => [styles.dismissButton, pressed && styles.buttonPressed]}
                  onPress={handleDismiss}
                >
                  <Text style={styles.dismissButtonText}>{'\u2190'}</Text>
                </Pressable>
              </View>
            )}

            {slowChainIds.length > 0 && deployStatus !== 'failed' && (
              <View style={styles.slowDismissContainer}>
                <Pressable
                  style={({ pressed }) => [styles.dismissButton, pressed && styles.buttonPressed]}
                  onPress={handleSlowDismiss}
                >
                  <Text style={styles.dismissButtonText}>{t('createStore.deployComplete')}</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </PageContainer>
    );
  }

  // ── Form phase ──
  return (
    <PageContainer>
      <View style={styles.container}>
        {/* Top Bar - back button (desktop only) */}
        {!isMobile && (
          <View style={styles.topBar}>
            <Pressable onPress={handleDismiss} style={styles.topBackButton}>
              <Text style={styles.topBackArrow}>{'\u2190'}</Text>
            </Pressable>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={[styles.content, isMobile && styles.contentMobile]}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.title}>{t('createStore.title')}</Text>

          <Text style={styles.tagline}>{t('createStore.tagline')}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoNumber}>1.</Text>
            <Text style={styles.infoText}>{t('createStore.benefit1')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoNumber}>2.</Text>
            <Text style={styles.infoText}>{t('createStore.benefit2')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoNumber}>3.</Text>
            <Text style={styles.infoText}>{t('createStore.benefit3')}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoNumber}>4.</Text>
            <Text style={styles.infoText}>{t('createStore.benefit4')}</Text>
          </View>

          <Text style={styles.label}>{t('createStore.logoLabel')}</Text>
          <Pressable style={styles.logoPicker} onPress={pickLogo}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>+</Text>
              </View>
            )}

          </Pressable>

          <Text style={styles.label}>{t('createStore.storeNameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={storeName}
            onChangeText={setStoreName}
            placeholder={t('createStore.storeNamePlaceholder')}
            placeholderTextColor={colors.gray500}
            autoCapitalize="words"
            editable={!isLoading}
          />

          <Text style={styles.label}>{t('createStore.shortNameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={shortName}
            onChangeText={(text) => setShortName(text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7))}
            placeholder={t('createStore.shortNamePlaceholder')}
            placeholderTextColor={colors.gray500}
            autoCapitalize="characters"
            maxLength={7}
            editable={!isLoading}
          />

          <Text style={styles.label}>{t('createStore.websiteLabel')}</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder={t('createStore.websitePlaceholder')}
            placeholderTextColor={colors.gray500}
            autoCapitalize="none"
            keyboardType="url"
            editable={!isLoading}
          />
        </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <View style={styles.dockLeft}>
          {isMobile && (
            <Pressable onPress={handleDismiss} style={styles.bottomBackButton}>
              <Text style={styles.topBackArrow}>{'\u2190'}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.dockSpacer} />

        <Pressable
          style={styles.modeToggle}
          onPress={() => setTestMode((v) => !v)}
          disabled={isLoading}
        >
          <Text style={[styles.modeLabel, !testMode && styles.modeLabelActive]}>Real</Text>
          <Text style={styles.modeSeparator}>/</Text>
          <Text style={[styles.modeLabel, testMode && styles.modeLabelActive]}>Test</Text>
        </Pressable>

        <Pressable
          ref={createRef}
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleCreate}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? t('createStore.creating') : t('createStore.create')}
          </Text>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  topBackButton: {
    paddingVertical: spacing[2],
  },
  topBackArrow: {
    fontFamily: typography.fontFamily,
    color: colors.juiceCyan,
    fontSize: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  contentMobile: {
    paddingTop: spacing[16],
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginBottom: spacing[6],
  },
  tagline: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
    marginBottom: spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  infoRowLast: {
    marginBottom: spacing[8],
  },
  logoPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[6],
    gap: spacing[4],
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 0,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 0,
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 2,
    borderColor: colors.whiteAlpha20,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontFamily: typography.fontFamily,
    fontSize: 32,
    color: colors.gray500,
  },
  logoHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
    flex: 1,
  },
  infoNumber: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    lineHeight: 20,
    width: 20,
  },
  infoText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    lineHeight: 20,
    flex: 1,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.gray400,
    marginBottom: spacing[2],
    letterSpacing: 1,
  },
  input: {
    fontFamily: typography.fontFamily,
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.lg,
    color: colors.white,
    marginBottom: spacing[6],
  },
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
  modeToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: spacing[3],
  },
  modeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray500,
  },
  modeLabelActive: {
    color: colors.white,
  },
  modeSeparator: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    marginHorizontal: 4,
  },
  createButton: {
    backgroundColor: colors.juiceCyan,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  // Deploying phase styles
  deployingLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    marginBottom: spacing[6],
  },
  progressSection: {
    marginBottom: spacing[6],
  },
  doNotClose: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.warning,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.danger,
    textAlign: 'center',
  },
  slowDismissContainer: {
    marginTop: spacing[6],
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
  dismissButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
});
