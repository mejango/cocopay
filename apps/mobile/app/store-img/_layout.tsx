import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme';

export default function StoreImgLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
