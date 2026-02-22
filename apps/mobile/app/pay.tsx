import { View, Text, StyleSheet, Pressable, TextInput, Platform, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { colors, typography, spacing } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';

// Mock stores for code lookup
const STORE_CODES: Record<string, { id: string; name: string }> = {
  'SUNNY': { id: '1', name: 'Sunny Side Cafe' },
  'GREEN': { id: '2', name: 'Green Garden Market' },
  'URBAN': { id: '3', name: 'Urban Threads' },
  'ZEN': { id: '4', name: 'Zen Yoga Studio' },
  'FRESH': { id: '5', name: 'Fresh Bites Deli' },
};

export default function PayScreen() {
  const [code, setCode] = useState('');
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const handleScanQR = () => {
    // TODO: Navigate to QR scanner
  };

  const handleSubmitCode = () => {
    const upperCode = code.toUpperCase().trim();
    const store = STORE_CODES[upperCode];
    if (store) {
      router.push({
        pathname: '/payment',
        params: { storeId: store.id, storeName: store.name },
      });
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  const matchedStore = STORE_CODES[code.toUpperCase().trim()];

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
        <View style={styles.content}>
          <Text style={styles.label}>{t('pay.storeCode')}</Text>
          <TextInput
            style={[
              styles.codeInput,
              Platform.OS === 'web' && { outlineStyle: 'none' } as any,
            ]}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            placeholder="SUNNY"
            placeholderTextColor={colors.gray500}
            autoCapitalize="characters"
            autoCorrect={false}
            textAlign="center"
          />
          {matchedStore && (
            <Text style={styles.storeMatch}>{matchedStore.name}</Text>
          )}
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomContainer}>
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
              styles.scanButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleScanQR}
          >
            <Text style={styles.scanButtonText}>QR</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.payButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSubmitCode}
          >
            <Text style={styles.payButtonText}>
              {matchedStore ? t('pay.payStore', { name: matchedStore.name }) : t('pay.pay')}
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
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  codeInput: {
    fontFamily: typography.fontFamily,
    fontSize: 72,
    fontWeight: typography.weights.bold,
    color: colors.juiceCyan,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginBottom: spacing[3],
    textAlign: 'center',
    minWidth: 200,
  } as any,
  storeMatch: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    color: colors.gray400,
    textAlign: 'center',
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
  payButton: {
    backgroundColor: colors.juiceCyan,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  payButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  scanButton: {
    backgroundColor: colors.juiceDarkLighter,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
  },
  scanButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
});
