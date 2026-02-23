import { View, Text, TextInput, StyleSheet, Pressable, Alert, Platform, ActivityIndicator, Keyboard, useWindowDimensions } from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useConnect, useAccount, useSignMessage, useDisconnect, useEnsName } from 'wagmi';
import { useAuthPopoverStore } from '../stores/authPopover';
import { useAuthStore } from '../stores/auth';
import { usePendingActionStore } from '../stores/pendingAction';
import { authApi } from '../api/auth';
import { generateSiweMessage } from '../services/siwe';
import { spacing, useTheme } from '../theme';
import type { BrandTheme } from '../theme';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

function ChooseStep() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { setStep, close } = useAuthPopoverStore();

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.connect')}</Text>
        <Pressable onPress={close} hitSlop={8}>
          <Text style={styles.closeButton}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>{t('auth.chooseMethod')}</Text>
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          onPress={() => setStep('email')}
        >
          <Text style={styles.primaryButtonText}>{t('auth.email')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          onPress={() => setStep('wallet')}
        >
          <Text style={styles.secondaryButtonText}>{t('auth.wallet')}</Text>
        </Pressable>
      </View>
    </>
  );
}

function EmailStep() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { setStep, setEmail, setVerificationId, close } = useAuthPopoverStore();
  const login = useAuthStore((state) => state.login);
  const [emailInput, setEmailInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      showAlert(t('auth.errorTitle'), t('auth.errorEmptyEmail'));
      return;
    }

    setIsLoading(true);
    try {
      const { verificationId } = await login(trimmed);
      setEmail(trimmed);
      setVerificationId(verificationId);
      setStep('verify');
    } catch (error) {
      showAlert(t('auth.errorTitle'), error instanceof Error ? error.message : t('auth.errorSendFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <Pressable onPress={() => setStep('choose')} hitSlop={8}>
          <Text style={styles.backText}>{t('auth.back')}</Text>
        </Pressable>
        <Pressable onPress={close} hitSlop={8}>
          <Text style={styles.closeButton}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>{t('auth.enterEmail')}</Text>
      <TextInput
        style={styles.input}
        value={emailInput}
        onChangeText={setEmailInput}
        placeholder={t('auth.emailPlaceholder')}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
      />
      <Pressable
        style={({ pressed }) => [styles.primaryButton, styles.fullWidth, pressed && styles.buttonPressed, isLoading && styles.buttonDisabled]}
        onPress={handleSendCode}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.colors.accent} size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('auth.sendCode')}</Text>
        )}
      </Pressable>
    </>
  );
}

function VerifyStep() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { email, verificationId, setStep, close } = useAuthPopoverStore();
  const verifyMagicLink = useAuthStore((state) => state.verifyMagicLink);
  const pendingAction = usePendingActionStore((state) => state.pendingAction);
  const clearPendingAction = usePendingActionStore((state) => state.clearPendingAction);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const executePendingAction = () => {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;
    clearPendingAction();

    if (action.type === 'action' && action.action) {
      switch (action.action) {
        case 'view_profile':
          router.replace('/profile');
          break;
        case 'scan_qr':
        case 'manual_entry':
          router.replace('/pay');
          break;
        case 'cash_out':
        case 'spend':
        case 'create_store':
        default:
          break;
      }
    }
  };

  const handleVerify = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      showAlert(t('verify.errorTitle'), t('verify.errorEmpty'));
      return;
    }

    setIsLoading(true);
    try {
      await verifyMagicLink(verificationId, trimmed);
      close();
      executePendingAction();
    } catch (error) {
      showAlert(t('verify.errorTitle'), error instanceof Error ? error.message : t('verify.errorInvalid'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <Pressable onPress={() => setStep('email')} hitSlop={8}>
          <Text style={styles.backText}>{t('auth.back')}</Text>
        </Pressable>
        <Pressable onPress={close} hitSlop={8}>
          <Text style={styles.closeButton}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        {t('verify.subtitle')}{email}
      </Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={setToken}
        placeholder={t('verify.placeholder')}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
      />
      <Pressable
        style={({ pressed }) => [styles.primaryButton, styles.fullWidth, pressed && styles.buttonPressed, isLoading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.colors.accent} size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('verify.verify')}</Text>
        )}
      </Pressable>
    </>
  );
}

function WalletStep() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { setStep, close } = useAuthPopoverStore();
  const loginWithSiwe = useAuthStore((state) => state.loginWithSiwe);
  const pendingAction = usePendingActionStore((state) => state.pendingAction);
  const clearPendingAction = usePendingActionStore((state) => state.clearPendingAction);
  const { connectAsync, connectors: rawConnectors } = useConnect();
  const { address, chainId, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const displayName = ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Filter out generic "Injected" when named providers (via EIP-6963) are available
  const connectors = useMemo(() => {
    const named = rawConnectors.filter((c) => c.id !== 'injected');
    return named.length > 0 ? named : rawConnectors;
  }, [rawConnectors]);

  const executePendingAction = useCallback(() => {
    if (!pendingAction) return;
    const action = pendingAction;
    clearPendingAction();
    if (action.type === 'action' && action.action) {
      switch (action.action) {
        case 'view_profile':
          router.replace('/profile');
          break;
        case 'scan_qr':
        case 'manual_entry':
          router.replace('/pay');
          break;
      }
    }
  }, [pendingAction, clearPendingAction]);

  const handleConnect = useCallback(async (connector: (typeof connectors)[number]) => {
    try {
      await connectAsync({ connector });
    } catch (error) {
      showAlert(
        t('auth.errorTitle'),
        error instanceof Error ? error.message : t('auth.walletVerifyFailed')
      );
    }
  }, [connectAsync, t]);

  const handleSign = useCallback(async () => {
    if (!address || !chainId) return;

    setIsLoading(true);
    try {
      setStatus(t('auth.walletFetchingNonce'));
      const nonce = await authApi.getSiweNonce(address);

      setStatus(t('auth.walletSigning'));
      const message = generateSiweMessage(address, nonce, chainId);
      const signature = await signMessageAsync({ message });

      setStatus(t('auth.walletVerifying'));
      await loginWithSiwe(address, message, signature);

      close();
      executePendingAction();
    } catch (error) {
      disconnect();
      showAlert(
        t('auth.errorTitle'),
        error instanceof Error ? error.message : t('auth.walletVerifyFailed')
      );
    } finally {
      setIsLoading(false);
      setStatus('');
    }
  }, [address, chainId, signMessageAsync, loginWithSiwe, close, executePendingAction, disconnect, t]);

  return (
    <>
      {!isConnected && (
        <View style={styles.header}>
          <Pressable onPress={() => setStep('choose')} hitSlop={8}>
            <Text style={styles.backText}>{t('auth.back')}</Text>
          </Pressable>
          <Pressable onPress={close} hitSlop={8}>
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
        </View>
      )}
      {isConnected && (
        <View style={styles.header}>
          <Text style={styles.walletConnectedAs} numberOfLines={1}>
            {t('auth.walletConnectedAs')} {displayName}
          </Text>
          <Pressable onPress={close} hitSlop={8}>
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
        </View>
      )}
      {!isConnected ? (
        <>
        <Text style={styles.subtitle}>{t('auth.walletSubtitle')}</Text>
        <View style={styles.connectorList}>
          {connectors.map((connector) => (
            <Pressable
              key={connector.uid}
              style={({ pressed }) => [styles.connectorButton, pressed && styles.buttonPressed]}
              onPress={() => handleConnect(connector)}
            >
              <Text style={styles.connectorButtonText}>{connector.name}</Text>
            </Pressable>
          ))}
        </View>
        </>
      ) : (
        <>
          <View style={styles.hintRow}>
            <Text style={styles.walletSignHint}>{t('auth.walletSignHint')}</Text>
            <Pressable onPress={() => disconnect()} hitSlop={8}>
              <Text style={styles.disconnectLink}>{t('auth.walletDisconnect')}</Text>
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, styles.fullWidth, pressed && styles.buttonPressed, isLoading && styles.buttonDisabled]}
            onPress={handleSign}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.colors.accent} size="small" />
                {status ? <Text style={styles.statusText}>{status}</Text> : null}
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>{t('auth.walletSign')}</Text>
            )}
          </Pressable>
        </>
      )}
    </>
  );
}

function ConnectedStep() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles(theme);
  const { close } = useAuthPopoverStore();
  const { address } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { disconnect } = useDisconnect();
  const logout = useAuthStore((state) => state.logout);

  const displayName = ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '');

  const handleDisconnect = async () => {
    disconnect();
    await logout();
    close();
  };

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.walletConnectedAs} numberOfLines={1}>
          {t('auth.connectedSignedIn')} {displayName}
        </Text>
        <Pressable onPress={close} hitSlop={8}>
          <Text style={styles.closeButton}>✕</Text>
        </Pressable>
      </View>
      <Pressable onPress={handleDisconnect} hitSlop={8}>
        <Text style={styles.disconnectLink}>{t('auth.walletDisconnect')}</Text>
      </Pressable>
    </>
  );
}

const POPOVER_WIDTH = 280;
const POPOVER_MARGIN = spacing[4];

export function AuthPopover() {
  const step = useAuthPopoverStore((state) => state.step);
  const anchor = useAuthPopoverStore((state) => state.anchor);
  const close = useAuthPopoverStore((state) => state.close);
  const theme = useTheme();
  const styles = useStyles(theme);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const positionStyle = useMemo(() => {
    if (keyboardHeight > 0) {
      return {
        bottom: keyboardHeight + spacing[2],
        left: (screenWidth - POPOVER_WIDTH) / 2,
      };
    }

    if (!anchor) {
      return {
        top: screenHeight * 0.3,
        left: (screenWidth - POPOVER_WIDTH) / 2,
      };
    }
    // Button center determines alignment direction
    const buttonCenter = anchor.x + anchor.width / 2;
    const onRightSide = buttonCenter > screenWidth / 2;

    let left: number;
    if (onRightSide) {
      // Right-align: popover's right edge meets button's right edge
      left = anchor.x + anchor.width - POPOVER_WIDTH;
    } else {
      // Left-align: popover's left edge meets button's left edge
      left = anchor.x;
    }
    // Clamp to screen bounds
    left = Math.max(POPOVER_MARGIN, Math.min(left, screenWidth - POPOVER_WIDTH - POPOVER_MARGIN));

    return {
      bottom: screenHeight - anchor.y + spacing[2],
      left,
    };
  }, [anchor, screenWidth, screenHeight, keyboardHeight]);

  if (step === 'closed') return null;

  return (
    <>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.popoverBox, positionStyle]}>
        {step === 'choose' && <ChooseStep />}
        {step === 'email' && <EmailStep />}
        {step === 'verify' && <VerifyStep />}
        {step === 'wallet' && <WalletStep />}
        {step === 'connected' && <ConnectedStep />}
      </View>
    </>
  );
}

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    popoverBox: {
      position: 'absolute',
      width: POPOVER_WIDTH,
      padding: spacing[4],
      backgroundColor: t.colors.background,
      borderWidth: 1,
      borderColor: t.colors.borderHover,
      borderRadius: t.borderRadius.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing[2],
    },
    title: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.text,
    },
    closeButton: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
    },
    closeOnly: {
      alignSelf: 'flex-end',
      marginBottom: spacing[1],
    },
    backText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
    },
    subtitle: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textSecondary,
      marginBottom: spacing[4],
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing[3],
    },
    primaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: t.colors.accent,
      backgroundColor: 'transparent',
      paddingVertical: spacing[1.5],
      paddingHorizontal: spacing[3],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 36,
      borderRadius: t.borderRadius.sm,
    },
    primaryButtonText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.accent,
      fontWeight: t.typography.weights.medium,
    },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: t.colors.borderHover,
      backgroundColor: 'transparent',
      paddingVertical: spacing[1.5],
      paddingHorizontal: spacing[3],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 36,
      borderRadius: t.borderRadius.sm,
    },
    secondaryButtonText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
      fontWeight: t.typography.weights.medium,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    fullWidth: {
      flex: undefined,
      width: '100%',
    },
    input: {
      fontFamily: t.typography.fontFamily,
      backgroundColor: t.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: t.colors.borderHover,
      borderRadius: t.borderRadius.sm,
      paddingVertical: spacing[2.5],
      paddingHorizontal: spacing[3],
      fontSize: t.typography.sizes.sm,
      color: t.colors.text,
      marginBottom: spacing[3],
    },
    connectorList: {
      gap: spacing[2],
    },
    connectorButton: {
      borderWidth: 1,
      borderColor: t.colors.borderHover,
      backgroundColor: 'transparent',
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[3],
      alignItems: 'center',
      borderRadius: t.borderRadius.sm,
    },
    connectorButtonText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.text,
      fontWeight: t.typography.weights.medium,
    },
    walletConnectedAs: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.text,
      flex: 1,
    },
    hintRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing[3],
    },
    walletSignHint: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
    },
    disconnectLink: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
      textDecorationLine: 'underline',
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    statusText: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.accent,
    },
  }), [t.key]);
}
