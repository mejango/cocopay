import { View, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { layout, useTheme } from '../theme';
import type { BrandTheme } from '../theme';

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  const theme = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={styles.outer}>
      <View style={styles.inner}>
        {children}
      </View>
    </View>
  );
}

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    outer: {
      flex: 1,
      backgroundColor: t.colors.background,
      alignItems: 'center',
    },
    inner: {
      flex: 1,
      width: layout.contentWidth,
      maxWidth: layout.maxWidth,
    },
  }), [t.key]);
}
