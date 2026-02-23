import { View, Text, StyleSheet, Pressable, TextInput, Platform, useWindowDimensions } from 'react-native';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { spacing, typography, useTheme } from '../src/theme';
import type { BrandTheme } from '../src/theme';
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
  const theme = useTheme();
  const styles = useStyles(theme);
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
            placeholderTextColor={theme.colors.textMuted}
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

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing[4],
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.textSecondary,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      letterSpacing: 2,
      marginBottom: spacing[3],
      textAlign: 'center',
    },
    codeInput: {
      fontFamily: t.typography.fontFamily,
      fontSize: 72,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accent,
      padding: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
      marginBottom: spacing[3],
      textAlign: 'center',
      minWidth: 200,
    } as any,
    storeMatch: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      color: t.colors.textSecondary,
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
      color: t.colors.accent,
      fontSize: 32,
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
    payButton: {
      backgroundColor: t.colors.accent,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      borderRadius: t.borderRadius.md,
    },
    buttonPressed: {
      opacity: 0.9,
    },
    payButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
    scanButton: {
      backgroundColor: t.colors.backgroundSecondary,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.md,
    },
    scanButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.text,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
  }), [t.key]);
}
