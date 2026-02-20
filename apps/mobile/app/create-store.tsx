import { View, Text, StyleSheet, Pressable, TextInput, Alert, useWindowDimensions, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { colors, typography, spacing } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';

export default function CreateStoreScreen() {
  const { requireAuth } = useRequireAuth();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const [storeName, setStoreName] = useState('');
  const [shortName, setShortName] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  const handleCreate = async () => {
    if (!requireAuth({ type: 'action', action: 'create_store' })) {
      return;
    }

    if (!storeName.trim()) {
      Alert.alert(t('createStore.errorTitle'), t('createStore.errorEmptyName'));
      return;
    }

    setIsLoading(true);
    try {
      // TODO: API call to create store
      Alert.alert(t('createStore.comingSoonTitle'), t('createStore.comingSoonMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <View style={styles.container}>
        {/* Top Bar - back button (desktop only) */}
        {!isMobile && (
          <View style={styles.topBar}>
            <Pressable onPress={handleDismiss} style={styles.topBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </Pressable>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={[styles.content, isMobile && styles.contentMobile]}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.title}>{t('createStore.title')}</Text>

          <Text style={styles.tagline}>{t('createStore.tagline')}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoNumber}>1.</Text>
            <Text style={styles.infoText}>{t('createStore.benefit1')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoNumber}>2.</Text>
            <Text style={styles.infoText}>{t('createStore.benefit2')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoNumber}>3.</Text>
            <Text style={styles.infoText}>{t('createStore.benefit3')}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoNumber}>4.</Text>
            <Text style={styles.infoText}>{t('createStore.benefit4')}</Text>
          </View>

          <Text style={styles.label}>{t('createStore.logoLabel')}</Text>
          <Pressable style={styles.logoPicker} onPress={pickLogo}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>+</Text>
              </View>
            )}
            <Text style={styles.logoHint}>{t('createStore.logoHint')}</Text>
          </Pressable>

          <Text style={styles.label}>{t('createStore.storeNameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={storeName}
            onChangeText={setStoreName}
            placeholder={t('createStore.storeNamePlaceholder')}
            placeholderTextColor={colors.gray500}
            autoCapitalize="words"
            editable={!isLoading}
          />

          <Text style={styles.label}>{t('createStore.shortNameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={shortName}
            onChangeText={(text) => setShortName(text.toUpperCase().slice(0, 7))}
            placeholder={t('createStore.shortNamePlaceholder')}
            placeholderTextColor={colors.gray500}
            autoCapitalize="characters"
            maxLength={7}
            editable={!isLoading}
          />

          <Text style={styles.label}>{t('createStore.websiteLabel')}</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder={t('createStore.websitePlaceholder')}
            placeholderTextColor={colors.gray500}
            autoCapitalize="none"
            keyboardType="url"
            editable={!isLoading}
          />
        </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <View style={styles.dockLeft}>
          {isMobile && (
            <Pressable onPress={handleDismiss} style={styles.bottomBackButton}>
              <Text style={styles.topBackArrow}>←</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.dockSpacer} />

        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleCreate}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? t('createStore.creating') : t('createStore.create')}
          </Text>
        </Pressable>
      </View>
    </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.juiceDark,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  topBackButton: {
    paddingVertical: spacing[2],
  },
  topBackArrow: {
    fontFamily: typography.fontFamily,
    color: colors.juiceCyan,
    fontSize: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  contentMobile: {
    paddingTop: spacing[16],
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginBottom: spacing[6],
  },
  tagline: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
    marginBottom: spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  infoRowLast: {
    marginBottom: spacing[8],
  },
  logoPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[6],
    gap: spacing[4],
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 0,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 0,
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 2,
    borderColor: colors.whiteAlpha20,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontFamily: typography.fontFamily,
    fontSize: 32,
    color: colors.gray500,
  },
  logoHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray500,
    flex: 1,
  },
  infoNumber: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    lineHeight: 20,
    width: 20,
  },
  infoText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.gray400,
    lineHeight: 20,
    flex: 1,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.gray400,
    marginBottom: spacing[2],
    letterSpacing: 1,
  },
  input: {
    fontFamily: typography.fontFamily,
    backgroundColor: colors.juiceDarkLighter,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.lg,
    color: colors.white,
    marginBottom: spacing[6],
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    paddingBottom: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.whiteAlpha10,
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
  createButton: {
    backgroundColor: colors.juiceCyan,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontFamily: typography.fontFamily,
    color: colors.juiceDark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
});
