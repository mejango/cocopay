import { View, Text, StyleSheet, Image } from 'react-native';
import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { spacing, typography, useTheme } from '../../src/theme';
import type { BrandTheme } from '../../src/theme';
import { PageContainer } from '../../src/components/PageContainer';

const cafeLogo = require('../../assets/store-img/cafe.png');

export default function MockCharge() {
  const theme = useTheme();
  const styles = useStyles(theme);

  const mockUrl = 'https://cocopay.biz/payment?storeId=cafe-campeche&amount=8.50';

  return (
    <PageContainer>
      <View style={styles.container}>
        <View style={styles.content}>
          <Image source={cafeLogo} style={styles.storeLogo} />
          <Text style={styles.storeNameHeader}>CAFÉ DO CAMPECHE</Text>
          <Text style={styles.amountHeader}>$8,50</Text>

          <View style={styles.qrContainer}>
            <QRCodeSVG value={mockUrl} size={200} />
          </View>

          <Text style={styles.scanLabel}>Escaneie para pagar</Text>
          <Text style={styles.linkText} numberOfLines={1}>
            cocopay.biz/payment?storeId=cafe...
          </Text>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomContainer}>
          <View style={styles.dockLeft}>
            <View style={styles.bottomBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </View>
          </View>
          <View style={styles.dockSpacer} />
          <View style={styles.generateButton}>
            <Text style={styles.generateButtonText}>COMPARTILHAR</Text>
          </View>
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
    storeLogo: {
      width: 96,
      height: 96,
      borderRadius: t.borderRadius.md,
      marginBottom: spacing[6],
    },
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
    topBackArrow: {
      fontFamily: typography.fontFamily,
      color: t.colors.text,
      fontSize: 32,
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
    generateButtonText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accentText,
      fontSize: t.typography.sizes.xl,
      fontWeight: t.typography.weights.bold,
    },
  }), [t.key]);
}
