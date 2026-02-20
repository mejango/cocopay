import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRequireAuth } from '../../src/hooks/useRequireAuth';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';

export default function PayScreen() {
  const { requireAuth } = useRequireAuth();

  const handleScanQR = () => {
    if (!requireAuth({ type: 'action', action: 'scan_qr' })) {
      return;
    }
    // Navigate to QR scanner
  };

  const handleManualEntry = () => {
    if (!requireAuth({ type: 'action', action: 'manual_entry' })) {
      return;
    }
    // Navigate to manual entry
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pay</Text>
        <Text style={styles.headerSubtitle}>Scan a QR code to pay at any CocoPay store</Text>
      </View>

      <View style={styles.content}>
        <Pressable
          style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
          onPress={handleScanQR}
        >
          <View style={styles.scanIconContainer}>
            <Text style={styles.scanIcon}>📷</Text>
          </View>
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
          <Text style={styles.scanButtonHint}>Point your camera at a store's QR code</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.manualButton, pressed && styles.manualButtonPressed]}
          onPress={handleManualEntry}
        >
          <Text style={styles.manualButtonText}>Enter Store Code</Text>
        </Pressable>
      </View>
    </View>
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
  headerSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    marginTop: spacing[1],
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
  },
  scanButton: {
    backgroundColor: colors.juiceCyan,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.glow,
  },
  scanButtonPressed: {
    opacity: 0.9,
  },
  scanIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.juiceDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  scanIcon: {
    fontSize: 36,
  },
  scanButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  scanButtonHint: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xs,
    marginTop: spacing[1],
    opacity: 0.7,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.whiteAlpha10,
  },
  dividerText: {
    fontFamily: typography.fontFamily,
    color: colors.gray500,
    fontSize: typography.sizes.sm,
    marginHorizontal: spacing[4],
  },
  manualButton: {
    backgroundColor: colors.juiceDarkLighter,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
  },
  manualButtonPressed: {
    backgroundColor: colors.whiteAlpha10,
    borderColor: colors.whiteAlpha50,
  },
  manualButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
});
