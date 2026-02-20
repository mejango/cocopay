import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../src/stores/auth';
import { usePendingActionStore } from '../src/stores/pendingAction';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';

// Mock data for demo mode
const MOCK_USER = {
  name: 'Demo User',
  email: 'demo@cocopay.app',
  phone: null as string | null,
};

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const setPendingAction = usePendingActionStore((state) => state.setPendingAction);
  const { t } = useTranslation();

  const handleDismiss = () => {
    router.back();
  };

  const handleSignIn = () => {
    setPendingAction({ type: 'action', action: 'view_profile' });
    router.push('/auth');
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logOutConfirmTitle'),
      t('profile.logOutConfirmMessage'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.logOut'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.back();
          },
        },
      ]
    );
  };

  const displayUser = isAuthenticated ? user : MOCK_USER;

  return (
    <PageContainer>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>{t('profile.done')}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Not authenticated - show sign in prompt */}
        {!isAuthenticated && (
          <View style={styles.signInContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>👤</Text>
            </View>
            <Text style={styles.signInTitle}>{t('profile.signInPrompt')}</Text>
            <Text style={styles.signInSubtitle}>
              {t('profile.signInSubtitle')}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
              onPress={handleSignIn}
            >
              <Text style={styles.primaryButtonText}>{t('profile.signIn')}</Text>
            </Pressable>
          </View>
        )}

        {/* Authenticated - show profile */}
        {isAuthenticated && (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {displayUser?.name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.name}>{displayUser?.name || t('profile.noName')}</Text>
              <Text style={styles.email}>{displayUser?.email || displayUser?.phone || t('profile.noEmail')}</Text>
            </View>

            <View style={styles.menuSection}>
              <MenuItem label={t('profile.editProfile')} />
              <MenuItem label={t('profile.transactionHistory')} />
              <MenuItem label={t('profile.paymentMethods')} />
              <MenuItem label={t('profile.notifications')} />
              <MenuItem label={t('profile.settings')} />
              <MenuItem label={t('profile.helpSupport')} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>{t('profile.logOut')}</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.version}>CocoPay v1.0.0</Text>
      </ScrollView>
    </View>
    </PageContainer>
  );
}

function MenuItem({ label }: { label: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
      <Text style={styles.menuText}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.juiceDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  dismissButton: {
    padding: spacing[2],
  },
  dismissText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceCyan,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  content: {
    flex: 1,
  },
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[10],
    paddingTop: spacing[20],
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  iconText: {
    fontSize: 48,
  },
  signInTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.white,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  signInSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  primaryButton: {
    backgroundColor: colors.juiceCyan,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius.lg,
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.juiceCyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  avatarText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  email: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    marginTop: spacing[1],
  },
  menuSection: {
    backgroundColor: colors.juiceDarkLighter,
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.whiteAlpha10,
  },
  menuItemPressed: {
    backgroundColor: colors.whiteAlpha10,
  },
  menuText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.white,
  },
  menuArrow: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    color: colors.gray500,
  },
  logoutButton: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    backgroundColor: colors.juiceDarkLighter,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutButtonPressed: {
    backgroundColor: colors.danger,
  },
  logoutText: {
    fontFamily: typography.fontFamily,
    color: colors.danger,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  version: {
    fontFamily: typography.fontFamily,
    textAlign: 'center',
    color: colors.gray600,
    fontSize: typography.sizes.xs,
    marginVertical: spacing[6],
  },
});
