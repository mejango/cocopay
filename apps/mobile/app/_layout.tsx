import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { useAuthStore } from '../src/stores/auth';
import { useBrandStore } from '../src/stores/brand';
import { AuthPopover } from '../src/components/AuthPopover';
import { CashOutPopover } from '../src/components/CashOutPopover';
import { useTheme } from '../src/theme';
import { wagmiConfig } from '../src/config/wagmi';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function AuthCheck({ children }: { children: React.ReactNode }) {
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    useAuthStore.getState().checkAuth();
    useBrandStore.getState().loadStored();
  }, []);

  if (isLoading) {
    return null; // Or a loading screen
  }

  return <>{children}</>;
}

function ThemedStack() {
  const theme = useTheme();
  const background = theme.colors.background;

  // Sync theme-color meta tag and body background for mobile browsers (notch area)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', background);
    document.body.style.backgroundColor = background;
  }, [background]);

  const screenOptions = useMemo(() => ({
    headerShown: false,
    contentStyle: { backgroundColor: background },
  }), [background]);

  return (
    <>
      <Stack screenOptions={screenOptions}>
        {/* Main landing screen */}
        <Stack.Screen name="index" />

        {/* Modal screens */}
        <Stack.Screen
          name="store"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="pay"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="create-store"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="cash-out"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="payment"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="charge"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            presentation: 'modal',
          }}
        />

      </Stack>
      <AuthPopover />
      <CashOutPopover />
      <StatusBar style={theme.statusBarStyle} />
    </>
  );
}

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
    <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <AuthCheck>
        <ThemedStack />
      </AuthCheck>
    </QueryClientProvider>
    </WagmiProvider>
    </I18nextProvider>
  );
}
