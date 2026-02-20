import { View, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { colors, layout } from '../theme';

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.inner}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.juiceDark,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: layout.contentWidth,
    maxWidth: layout.maxWidth,
  },
});
