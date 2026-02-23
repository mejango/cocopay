import { View, Text, StyleSheet, Pressable, TextInput, Platform, Share, useWindowDimensions, Image } from 'react-native';
import { useState, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from '../src/i18n';
import { QRCodeSVG } from 'qrcode.react';
import { spacing, typography, useTheme } from '../src/theme';
import type { BrandTheme } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';

// Map app language to Intl locale
const LOCALE_MAP: Record<string, string> = {
  pt: 'pt-BR', // comma decimal
  es: 'es-ES', // comma decimal
  en: 'en-US', // period decimal
  zh: 'zh-CN', // period decimal
};

function getLocale(): string {
  return LOCALE_MAP[i18n.language] || 'en-US';
}

function getDecimalSeparator(): string {
  const formatted = new Intl.NumberFormat(getLocale(), { minimumFractionDigits: 1 }).format(1.1);
  return formatted.charAt(1); // "1.1" or "1,1"
}

// Format a number as locale currency display (e.g. $1,000.50 or $1.000,50)
function formatCurrency(num: number): string {
  return '$' + new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Normalize user input: accept both "," and "." → store with "." decimal
function normalizeInput(raw: string): string {
  // Strip $ prefix
  let text = raw.replace(/^\$/, '');
  const sep = getDecimalSeparator();
  if (sep === ',') {
    // Remove thousands separators (periods) then swap comma → period
    text = text.replace(/\./g, '').replace(',', '.');
  } else {
    // Remove thousands separators (commas)
    text = text.replace(/,/g, '');
  }
  return text;
}

// Display raw normalized amount ("25.5") in locale format for the input field
function displayInput(normalized: string): string {
  if (!normalized) return '';
  const sep = getDecimalSeparator();
  if (sep === ',') {
    return '$' + normalized.replace('.', ',');
  }
  return '$' + normalized;
}

async function shareOrCopy(url: string, title: string): Promise<'shared' | 'copied'> {
  if (Platform.OS !== 'web') {
    await Share.share({ message: url, title });
    return 'shared';
  }
  // Web: use Web Share API if available (mobile browsers), otherwise clipboard
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ url, title });
      return 'shared';
    } catch {
      // User cancelled or share failed — fall through to clipboard
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
  }
  return 'copied';
}

export default function ChargeScreen() {
  const params = useLocalSearchParams<{
    storeId: string;
    storeName: string;
    storeLogo: string;
    tokenSymbol: string;
  }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const [amount, setAmount] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDismiss = () => {
    router.back();
  };

  const decimalSep = getDecimalSeparator();
  const placeholder = decimalSep === ',' ? '$0,00' : '$0.00';

  const handleGenerate = () => {
    const num = parseFloat(amount);
    if (!isNaN(num) && num > 0) {
      setIsGenerated(true);
    }
  };

  const handleNewCharge = () => {
    setIsGenerated(false);
    setAmount('');
    setCopied(false);
  };

  // Build payment URL
  const paymentUrl = useMemo(() => {
    if (!isGenerated) return '';
    const origin = Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://cocopay.app';
    const params_ = new URLSearchParams({
      storeId: params.storeId || '',
      storeName: params.storeName || '',
      amount,
      storeLogo: params.storeLogo || '',
    });
    return `${origin}/payment?${params_.toString()}`;
  }, [isGenerated, params.storeId, params.storeName, params.storeLogo, amount]);

  const handleShare = async () => {
    const result = await shareOrCopy(paymentUrl, `${params.storeName} — ${formattedAmount}`);
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedAmount = useMemo(() => {
    const num = parseFloat(amount);
    if (isNaN(num)) return formatCurrency(0);
    return formatCurrency(num);
  }, [amount]);

  // Phase 1: Amount entry
  if (!isGenerated) {
    return (
      <PageContainer>
        <View style={styles.container}>
          {!isMobile && (
            <View style={styles.topBar}>
              <Pressable onPress={handleDismiss} style={styles.topBackButton}>
                <Text style={styles.topBackArrow}>←</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.content}>
            {params.storeLogo ? (
              <Image source={{ uri: params.storeLogo }} style={styles.storeLogo} />
            ) : null}
            <Text style={styles.label}>{t('charge.enterAmount')}</Text>
            <TextInput
              style={[
                styles.amountInput,
                Platform.OS === 'web' && { outlineStyle: 'none' } as any,
              ]}
              value={displayInput(amount)}
              onChangeText={(text) => setAmount(normalizeInput(text))}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

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
                styles.generateButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleGenerate}
            >
              <Text style={styles.generateButtonText}>{t('charge.generate')}</Text>
            </Pressable>
          </View>
        </View>
      </PageContainer>
    );
  }

  // Phase 2: QR result
  return (
    <PageContainer>
      <View style={styles.container}>
        {!isMobile && (
          <View style={styles.topBar}>
            <Pressable onPress={handleDismiss} style={styles.topBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.storeNameHeader}>{params.storeName}</Text>
          <Text style={styles.amountHeader}>{formattedAmount}</Text>

          <View style={styles.qrContainer}>
            <QRCodeSVG value={paymentUrl} size={200} />
          </View>

          <Text style={styles.scanLabel}>{t('charge.scanToPay')}</Text>
          <Pressable onPress={handleShare}>
            <Text style={styles.linkText} numberOfLines={1}>
              {copied ? t('charge.linkCopied') : paymentUrl}
            </Text>
          </Pressable>
        </View>

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
              styles.generateButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleShare}
          >
            <Text style={styles.generateButtonText}>{t('charge.share')}</Text>
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
      justifyContent: 'flex-start',
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
    },
    topBackButton: {
      paddingVertical: spacing[2],
    },
    topBackArrow: {
      fontFamily: typography.fontFamily,
      color: t.colors.text,
      fontSize: 32,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing[4],
      justifyContent: 'center',
      alignItems: 'center',
    },
    storeLogo: {
      width: 96,
      height: 96,
      marginBottom: spacing[6],
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
    amountInput: {
      fontFamily: t.typography.fontFamily,
      fontSize: 72,
      fontWeight: t.typography.weights.bold,
      color: '#4ade80',
      padding: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
      textAlign: 'center',
      marginBottom: spacing[3],
    } as any,
    storeNameHeader: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.bold,
      color: t.colors.textSecondary,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: spacing[1],
    },
    amountHeader: {
      fontFamily: t.typography.fontFamily,
      fontSize: 48,
      fontWeight: t.typography.weights.bold,
      color: '#4ade80',
      marginBottom: spacing[6],
    },
    qrContainer: {
      backgroundColor: '#FFFFFF',
      padding: spacing[4],
      borderRadius: t.borderRadius.md,
      marginBottom: spacing[4],
    },
    scanLabel: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
      marginBottom: spacing[2],
    },
    linkText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.accent,
      textAlign: 'center',
      maxWidth: 280,
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
    generateButton: {
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
    generateButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
    newChargeButton: {
      backgroundColor: t.colors.backgroundSecondary,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.md,
    },
    newChargeButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.text,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
  }), [t.key]);
}
