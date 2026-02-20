import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { useAuthStore } from '../src/stores/auth';
import { colors } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function AuthCheck({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return null; // Or a loading screen
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={queryClient}>
      <AuthCheck>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.juiceDark },
          }}
        >
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

          {/* Auth flow */}
          <Stack.Screen
            name="auth"
            options={{
              presentation: 'fullScreenModal',
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </AuthCheck>
    </QueryClientProvider>
    </I18nextProvider>
  );
}
