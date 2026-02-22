import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth';
import { router } from 'expo-router';
import { usePendingActionStore } from '../../src/stores/pendingAction';
import { useAuthPopoverStore } from '../../src/stores/authPopover';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';

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
  const [showDemoPreview, setShowDemoPreview] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated && !showDemoPreview) {
        setPendingAction({ type: 'navigate_tab', tab: 'profile' });
        useAuthPopoverStore.getState().open();
      }
    }, [isAuthenticated, showDemoPreview, setPendingAction])
  );

  const handleLogout = () => {
    if (showDemoPreview) {
      setShowDemoPreview(false);
      return;
    }

    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleSignIn = () => {
    setPendingAction({ type: 'navigate_tab', tab: 'profile' });
    useAuthPopoverStore.getState().open();
  };

  if (!isAuthenticated && !showDemoPreview) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.signInContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>👤</Text>
          </View>
          <Text style={styles.signInTitle}>Sign in to view your profile</Text>
          <Text style={styles.signInSubtitle}>
            Manage your account, view history, and update settings
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={handleSignIn}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>
          <Pressable style={styles.ghostButton} onPress={() => setShowDemoPreview(true)}>
            <Text style={styles.ghostButtonText}>Preview Demo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const displayUser = isAuthenticated ? user : MOCK_USER;

  return (
    <ScrollView style={styles.container}>
      {showDemoPreview && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>Demo Mode</Text>
          <Pressable onPress={() => setShowDemoPreview(false)}>
            <Text style={styles.exitDemoText}>Exit</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayUser?.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{displayUser?.name || 'No name set'}</Text>
        <Text style={styles.email}>{displayUser?.email || 'No email set'}</Text>
      </View>

      <View style={styles.menuSection}>
        <MenuItem label="Edit Profile" />
        <MenuItem label="Transaction History" />
        <MenuItem label="Payment Methods" />
        <MenuItem label="Notifications" />
        <MenuItem label="Settings" />
        <MenuItem label="Help & Support" />
      </View>

      <Pressable
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>{showDemoPreview ? 'Exit Demo' : 'Log Out'}</Text>
      </Pressable>

      {showDemoPreview && (
        <View style={styles.signInPrompt}>
          <Text style={styles.signInPromptText}>Ready to create your account?</Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={handleSignIn}
          >
            <Text style={styles.primaryButtonText}>Sign In Now</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.version}>CocoPay v1.0.0</Text>
    </ScrollView>
  );
}

function MenuItem({ label }: { label: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
      <Text style={styles.menuText}>{label}</Text>
      <Text style={styles.menuArrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.juiceDark,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[16],
    paddingBottom: spacing[4],
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[10],
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
  ghostButton: {
    marginTop: spacing[4],
    paddingVertical: spacing[2],
  },
  ghostButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    fontSize: typography.sizes.sm,
  },
  demoBanner: {
    backgroundColor: colors.juiceOrange,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demoBannerText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exitDemoText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textDecorationLine: 'underline',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing[16],
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
    ...shadows.glow,
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
    fontSize: typography.sizes.sm,
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
  signInPrompt: {
    backgroundColor: colors.juiceDarkLighter,
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
  },
  signInPromptText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    marginBottom: spacing[4],
  },
  version: {
    fontFamily: typography.fontFamily,
    textAlign: 'center',
    color: colors.gray600,
    fontSize: typography.sizes.xs,
    marginVertical: spacing[6],
  },
});
