import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRef, useMemo } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../src/stores/auth';
import { usePendingActionStore } from '../src/stores/pendingAction';
import { useAuthPopoverStore } from '../src/stores/authPopover';
import { spacing, useTheme } from '../src/theme';
import type { BrandTheme } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';

// Mock data for demo mode
const MOCK_USER = {
  name: 'Demo User',
  email: 'demo@cocopay.app',
};

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const setPendingAction = usePendingActionStore((state) => state.setPendingAction);
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const signInRef = useRef<View>(null);

  const handleDismiss = () => {
    router.back();
  };

  const handleSignIn = () => {
    setPendingAction({ type: 'action', action: 'view_profile' });
    signInRef.current?.measureInWindow((x, y, w, h) => {
      useAuthPopoverStore.getState().open({ x, y, width: w, height: h });
    });
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
              ref={signInRef}
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
              <Text style={styles.email}>{displayUser?.email || t('profile.noEmail')}</Text>
            </View>

            <View style={styles.menuSection}>
              <MenuItem label={t('profile.editProfile')} theme={theme} />
              <MenuItem label={t('profile.transactionHistory')} theme={theme} />
              <MenuItem label={t('profile.paymentMethods')} theme={theme} />
              <MenuItem label={t('profile.notifications')} theme={theme} />
              <MenuItem label={t('profile.settings')} theme={theme} />
              <MenuItem label={t('profile.helpSupport')} theme={theme} />
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

function MenuItem({ label, theme }: { label: string; theme: BrandTheme }) {
  const styles = useMenuStyles(theme);
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
      <Text style={styles.menuText}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

function useMenuStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    menuItemPressed: {
      backgroundColor: t.colors.border,
    },
    menuText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.text,
    },
    menuArrow: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      color: t.colors.textMuted,
    },
  }), [t.key]);
}

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
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
      fontFamily: t.typography.fontFamily,
      color: t.colors.accent,
      fontSize: t.typography.sizes.base,
      fontWeight: t.typography.weights.semibold,
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
      borderRadius: t.borderRadius.full,
      backgroundColor: t.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[6],
    },
    iconText: {
      fontSize: 48,
    },
    signInTitle: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.lg,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.text,
      marginBottom: spacing[2],
      textAlign: 'center',
    },
    signInSubtitle: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing[6],
    },
    primaryButton: {
      backgroundColor: t.colors.accent,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[8],
      borderRadius: t.borderRadius.lg,
    },
    primaryButtonPressed: {
      opacity: 0.8,
    },
    primaryButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.semibold,
    },
    profileHeader: {
      alignItems: 'center',
      paddingTop: spacing[4],
      paddingBottom: spacing[8],
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: t.borderRadius.full,
      backgroundColor: t.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[4],
    },
    avatarText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes['3xl'],
      fontWeight: t.typography.weights.bold,
    },
    name: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
    },
    email: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
      marginTop: spacing[1],
    },
    menuSection: {
      backgroundColor: t.colors.backgroundSecondary,
      marginHorizontal: spacing[4],
      marginTop: spacing[4],
      borderRadius: t.borderRadius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      overflow: 'hidden',
    },
    logoutButton: {
      marginHorizontal: spacing[4],
      marginTop: spacing[4],
      backgroundColor: t.colors.backgroundSecondary,
      paddingVertical: spacing[4],
      borderRadius: t.borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.colors.danger,
    },
    logoutButtonPressed: {
      backgroundColor: t.colors.danger,
    },
    logoutText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.danger,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.semibold,
    },
    version: {
      fontFamily: t.typography.fontFamily,
      textAlign: 'center',
      color: t.colors.textMuted,
      fontSize: t.typography.sizes.xs,
      marginVertical: spacing[6],
    },
  }), [t.key]);
}
