import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { spacing, useTheme } from '../src/theme';
import type { BrandTheme } from '../src/theme';
import { PageContainer } from '../src/components/PageContainer';

const LAST_UPDATED = 'February 26, 2026';

export default function PrivacyScreen() {
  const theme = useTheme();
  const styles = useStyles(theme);

  return (
    <PageContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.dismissButton}>
            <Text style={styles.dismissText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

          <Section title="1. Information We Collect" theme={theme}>
            <Text style={styles.body}>
              When you use CocoPay, we collect the following information:
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Email address (for account authentication)
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Blockchain wallet addresses (for processing payments)
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Transaction data (payment amounts, store interactions)
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Device information (operating system, browser type)
            </Text>
          </Section>

          <Section title="2. How We Use Your Information" theme={theme}>
            <Text style={styles.body}>We use your information to:</Text>
            <Text style={styles.bullet}>
              {'\u2022'} Authenticate your account and verify your identity
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Process payments and display transaction history
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Communicate important service updates
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Improve and maintain our services
            </Text>
          </Section>

          <Section title="3. Blockchain Data" theme={theme}>
            <Text style={styles.body}>
              CocoPay interacts with public blockchains. Transactions submitted through CocoPay are recorded on-chain and are publicly visible. We do not control and cannot delete on-chain data.
            </Text>
          </Section>

          <Section title="4. Data Sharing" theme={theme}>
            <Text style={styles.body}>
              We do not sell your personal information. We may share data with:
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Infrastructure providers necessary to operate the service
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Law enforcement when required by applicable law
            </Text>
          </Section>

          <Section title="5. Data Security" theme={theme}>
            <Text style={styles.body}>
              We implement industry-standard security measures to protect your data, including encrypted communications and secure authentication. However, no system is 100% secure.
            </Text>
          </Section>

          <Section title="6. Your Rights" theme={theme}>
            <Text style={styles.body}>You have the right to:</Text>
            <Text style={styles.bullet}>
              {'\u2022'} Access your personal data
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Request deletion of your account and associated data
            </Text>
            <Text style={styles.bullet}>
              {'\u2022'} Opt out of non-essential communications
            </Text>
          </Section>

          <Section title="7. Cookies and Local Storage" theme={theme}>
            <Text style={styles.body}>
              We use local storage to maintain your session and preferences. We do not use third-party tracking cookies.
            </Text>
          </Section>

          <Section title="8. Changes to This Policy" theme={theme}>
            <Text style={styles.body}>
              We may update this privacy policy from time to time. We will notify you of significant changes via the app or email.
            </Text>
          </Section>

          <Section title="9. Contact" theme={theme}>
            <Text style={styles.body}>
              For privacy-related questions, contact us at privacy@cocopay.biz.
            </Text>
          </Section>
        </ScrollView>
      </View>
    </PageContainer>
  );
}

function Section({ title, theme, children }: { title: string; theme: BrandTheme; children: React.ReactNode }) {
  const styles = useStyles(theme);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function useStyles(t: BrandTheme) {
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[2],
    },
    dismissButton: {
      padding: spacing[2],
    },
    dismissText: {
      fontFamily: t.typography.fontFamily,
      color: t.colors.accent,
      fontSize: t.typography.sizes.base,
      fontWeight: t.typography.weights.semibold,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: spacing[5],
      paddingBottom: spacing[10],
    },
    title: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes['2xl'],
      fontWeight: t.typography.weights.bold,
      color: t.colors.text,
      marginBottom: spacing[1],
    },
    updated: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.xs,
      color: t.colors.textMuted,
      marginBottom: spacing[6],
    },
    section: {
      marginBottom: spacing[5],
    },
    sectionTitle: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.base,
      fontWeight: t.typography.weights.semibold,
      color: t.colors.text,
      marginBottom: spacing[2],
    },
    body: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
      lineHeight: 22,
      marginBottom: spacing[2],
    },
    bullet: {
      fontFamily: t.typography.fontFamily,
      fontSize: t.typography.sizes.sm,
      color: t.colors.textSecondary,
      lineHeight: 22,
      paddingLeft: spacing[4],
    },
  }), [t.key]);
}
