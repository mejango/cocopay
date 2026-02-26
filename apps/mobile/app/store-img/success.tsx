import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { spacing, useTheme } from '../../src/theme';
import type { BrandTheme } from '../../src/theme';
import { PageContainer } from '../../src/components/PageContainer';

export default function MockPaymentSuccess() {
  const theme = useTheme();
  const styles = useStyles(theme);

  return (
    <PageContainer>
      <View style={[styles.container, styles.overlayCenter]}>
        <Text style={styles.checkmark}>&#10003;</Text>
        <Text style={styles.overlayText}>Pagamento completo</Text>
        <Text style={styles.confirmationCode}>847291</Text>
        <Text style={styles.overlaySubtext}>TX: 0x7a3f...c8e2</Text>

        <View style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Feito</Text>
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
    overlayCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[6],
    },
    checkmark: {
      fontSize: 64,
      color: t.colors.accent,
    },
    overlayText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
      marginTop: spacing[4],
      textAlign: 'center',
    },
    confirmationCode: {
      fontFamily: t.typography.fontFamily,
      fontSize: 48,
      fontWeight: t.typography.weights.bold,
      color: t.colors.accent,
      marginTop: spacing[4],
      letterSpacing: 8,
      textAlign: 'center',
    },
    overlaySubtext: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textMuted,
      marginTop: spacing[2],
      textAlign: 'center',
    },
    doneButton: {
      backgroundColor: t.colors.accent,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      borderRadius: t.borderRadius.md,
      marginTop: spacing[6],
    },
    doneButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
  }), [t.key]);
}
