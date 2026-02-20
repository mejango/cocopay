import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.juiceCyan,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: {
          backgroundColor: colors.juiceDark,
          borderTopColor: colors.whiteAlpha10,
          borderTopWidth: 1,
          paddingTop: spacing[2],
          paddingBottom: spacing[2],
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.xs,
          fontWeight: typography.weights.medium,
          marginTop: spacing[0.5],
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="🔍" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="🏠" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          title: 'Pay',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="💳" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="👤" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, color, focused }: { icon: string; color: string; focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <Text style={[styles.icon, { opacity: focused ? 1 : 0.6 }]}>{icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconContainerFocused: {
    backgroundColor: colors.whiteAlpha10,
  },
  icon: {
    fontSize: 18,
  },
});
