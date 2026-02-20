import { View, Text, TextInput, StyleSheet, Pressable, Alert, Platform, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/stores/auth';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { PageContainer } from '../../src/components/PageContainer';

const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

export default function AuthScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      showAlert(t('auth.errorTitle'), t('auth.errorEmptyEmail'));
      return;
    }

    setIsLoading(true);
    try {
      const { verificationId } = await login(email.trim().toLowerCase());
      showAlert(
        t('auth.checkEmailTitle'),
        t('auth.checkEmailMessage'),
        () => {
          router.push({
            pathname: '/auth/verify',
            params: { verificationId, email },
          });
        }
      );
    } catch (error) {
      showAlert(t('auth.errorTitle'), error instanceof Error ? error.message : t('auth.errorSendFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <PageContainer>
      <View style={styles.container}>
        {/* Top Bar - back button (desktop only) */}
        {!isMobile && (
          <View style={styles.topBar}>
            <Pressable onPress={handleBack} style={styles.topBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </Pressable>
          </View>
        )}

        {/* Content */}
        <KeyboardAvoidingView style={styles.content} behavior="padding">
          <View style={styles.brandSection}>
            <Text style={styles.logo}>🥥</Text>
            <Text style={styles.title}>CocoPay</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>{t('auth.emailLabel')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colors.gray500}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>
        </KeyboardAvoidingView>

        {/* Bottom Buttons */}
        <View style={styles.bottomContainer}>
          <View style={styles.dockLeft}>
            {isMobile && (
              <Pressable onPress={handleBack} style={styles.bottomBackButton}>
                <Text style={styles.topBackArrow}>←</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.dockSpacer} />

          <View style={styles.dockRight}>
            <Text style={styles.footer}>
              {t('auth.footer')}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSendMagicLink}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? t('auth.connecting') : t('auth.connect')}
              </Text>
            </Pressable>
          </View>
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
    paddingHorizontal: spacing[4],
  },
  brandSection: {
    alignItems: 'center',
    marginTop: spacing[8],
    marginBottom: spacing[12],
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  formSection: {
    marginTop: spacing[8],
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.gray400,
    marginBottom: spacing[2],
    letterSpacing: 2,
  },
  input: {
    fontFamily: typography.fontFamily,
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.xl,
    color: colors.white,
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    paddingBottom: spacing[8],
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
  dockRight: {
    alignItems: 'flex-end',
  },
  bottomBackButton: {
    paddingVertical: spacing[2],
    paddingRight: spacing[2],
  },
  footer: {
    fontFamily: typography.fontFamily,
    textAlign: 'right',
    color: colors.gray500,
    fontSize: typography.sizes.xs,
    marginBottom: spacing[3],
    maxWidth: 400,
  },
  button: {
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
  buttonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
});
