import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/stores/auth';
import { usePendingActionStore } from '../../src/stores/pendingAction';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { PageContainer } from '../../src/components/PageContainer';

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ verificationId: string; email: string }>();
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const verifyMagicLink = useAuthStore((state) => state.verifyMagicLink);
  const pendingAction = usePendingActionStore((state) => state.pendingAction);
  const clearPendingAction = usePendingActionStore((state) => state.clearPendingAction);

  const executePendingAction = () => {
    if (!pendingAction) {
      router.replace('/');
      return;
    }

    const action = pendingAction;
    clearPendingAction();

    if (action.type === 'action' && action.action) {
      switch (action.action) {
        case 'view_profile':
          router.replace('/profile');
          break;
        case 'scan_qr':
        case 'manual_entry':
          router.replace('/pay');
          break;
        case 'cash_out':
        case 'spend':
        case 'create_store':
        default:
          router.replace('/');
      }
    } else {
      router.replace('/');
    }
  };

  const handleVerify = async () => {
    if (!token.trim()) {
      Alert.alert(t('verify.errorTitle'), t('verify.errorEmpty'));
      return;
    }

    setIsLoading(true);
    try {
      await verifyMagicLink(params.verificationId, token.trim());
      executePendingAction();
    } catch (error) {
      Alert.alert(
        t('verify.errorTitle'),
        error instanceof Error ? error.message : t('verify.errorInvalid')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{t('verify.back')}</Text>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('verify.title')}</Text>
          <Text style={styles.subtitle}>
            {t('verify.subtitle')}
            <Text style={styles.emailHighlight}>{params.email}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('verify.label')}</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder={t('verify.placeholder')}
            placeholderTextColor={colors.gray500}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? t('verify.verifying') : t('verify.verify')}
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
    padding: spacing[6],
  },
  backButton: {
    paddingVertical: spacing[2],
  },
  backText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceCyan,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing[8],
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
  },
  emailHighlight: {
    color: colors.juiceCyan,
  },
  form: {},
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.gray400,
    marginBottom: spacing[2],
    letterSpacing: 1,
  },
  input: {
    fontFamily: typography.fontFamily,
    backgroundColor: colors.juiceDarkLighter,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.base,
    color: colors.white,
    marginBottom: spacing[4],
  },
  button: {
    backgroundColor: colors.juiceCyan,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
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
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
