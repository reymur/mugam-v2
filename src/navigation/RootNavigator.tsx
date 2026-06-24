import React, { useCallback, useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { useT } from '../i18n';
import { useAppStore } from '../store/useAppStore';

import HomeScreen       from '../screens/Home';
import SearchScreen     from '../screens/Search';
import BoardScreen      from '../screens/Board';
import GigsScreen       from '../screens/Gigs';
import MarketScreen     from '../screens/Market';
import StoriesScreen    from '../screens/Stories';
import VideoScreen      from '../screens/Video';
import ChatsScreen      from '../screens/Chat';
import ProfileScreen    from '../screens/Profile';
import AgreementsScreen from '../screens/Agreements';
import AuthNavigator    from '../screens/Auth/AuthNavigator';

const Tab = createBottomTabNavigator();

const TabIcon = React.memo(function TabIcon({ emoji, label, focused, badge }: {
  emoji: string; label: string; focused: boolean; badge?: number;
}) {
  return (
    <View style={styles.tabItem}>
      <View>
        <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
        {(badge && badge > 0) ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

// ── Loading splash ────────────────────────────────────────
function LoadingScreen() {
  return (
    <SafeAreaView style={styles.loadingScreen}>
      <View style={styles.loadingInner}>
        <Text style={{ fontSize: 52, marginBottom: 20 }}>🎵</Text>
        <Text style={styles.loadingTitle}>Muğam Club</Text>
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 24 }} />
      </View>
    </SafeAreaView>
  );
}

export default function RootNavigator() {
  const { t } = useT();
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const authLoading     = useAppStore(s => s.authLoading);
  const pendingGroupChatId = useAppStore(s => s.pendingGroupChatId);
  const totalUnread     = useAppStore(
    s => s.chats.reduce((acc, c) => acc + (c.unread ?? 0), 0)
  );
  const navRef = useRef<any>(null);

  useEffect(() => {
    if (pendingGroupChatId && navRef.current) {
      navRef.current.navigate('Chats');
    }
  }, [pendingGroupChatId]);

  const agreementsCount = useAppStore(s => {
    const ids = s.readAgreementIds ?? [];
    return s.agreements.filter(a => !ids.includes(a.id)).length;
  });

  const homeIcon    = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="🏠" label={t('navKlub')}    focused={focused} />, [t]);
  const searchIcon  = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="🔍" label={t('navAxtar')}   focused={focused} />, [t]);
  const boardIcon   = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="📢" label={t('navElanlar')} focused={focused} />, [t]);
  const gigsIcon    = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="🎼" label={t('navSifaris')} focused={focused} />, [t]);
  const marketIcon  = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="🛍" label={t('navBazar')}   focused={focused} />, [t]);
  const storiesIcon = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="😄" label={t('navHekaye')}  focused={focused} />, [t]);
  const videoIcon   = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="🎬" label={t('navVideo')}   focused={focused} />, [t]);
  const chatsIcon      = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="💬" label={t('navMesaj')}      focused={focused} badge={totalUnread} />, [t, totalUnread]);
  const agreementsIcon = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="📅" label="Kalendar"           focused={focused} badge={agreementsCount} />, [agreementsCount]);
  const profileIcon    = useCallback(({ focused }: { focused: boolean }) =>
    <TabIcon emoji="👤" label="Profil"             focused={focused} />, []);

  return (
    <NavigationContainer ref={navRef}>
      {/* Loading state — Firebase auth check */}
      {authLoading ? (
        <LoadingScreen />
      ) : !isAuthenticated ? (
        /* Not logged in — show Auth screens */
        <AuthNavigator />
      ) : (
        /* Logged in — show main app */
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarShowLabel: false,
          }}
        >
          <Tab.Screen name="Home"       component={HomeScreen}       options={{ tabBarIcon: homeIcon }} />
          <Tab.Screen name="Agreements" component={AgreementsScreen} options={{ tabBarIcon: agreementsIcon }} />
          <Tab.Screen name="Search"     component={SearchScreen}     options={{ tabBarIcon: searchIcon }} />
          <Tab.Screen name="Board"      component={BoardScreen}      options={{ tabBarIcon: boardIcon }} />
          <Tab.Screen name="Gigs"       component={GigsScreen}       options={{ tabBarIcon: gigsIcon }} />
          <Tab.Screen name="Market"     component={MarketScreen}     options={{ tabBarIcon: marketIcon }} />
          <Tab.Screen name="Stories"    component={StoriesScreen}    options={{ tabBarIcon: storiesIcon }} />
          <Tab.Screen name="Video"      component={VideoScreen}      options={{ tabBarIcon: videoIcon }} />
          <Tab.Screen name="Chats"      component={ChatsScreen}      options={{ tabBarIcon: chatsIcon }} />
          <Tab.Screen name="Profile"    component={ProfileScreen}    options={{ tabBarIcon: profileIcon }} />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(12,10,6,0.97)',
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Colors.navH,
    paddingBottom: 0,
    paddingTop: 0,
  },
  tabItem: {
    alignItems: 'center', justifyContent: 'center',
    gap: 3, minWidth: 44, paddingTop: 6,
  },
  tabEmoji: { fontSize: 20, opacity: 0.45 },
  tabEmojiActive: { opacity: 1, transform: [{ scale: 1.15 }] },
  tabLabel: {
    fontSize: 9, fontFamily: Typography.nunito700,
    color: Colors.muted, letterSpacing: 0.5,
    textTransform: 'uppercase', maxWidth: 52,
  },
  tabLabelActive: { color: Colors.gold },
  badge: {
    position: 'absolute', top: -4, right: -9,
    backgroundColor: Colors.red, borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 1,
    minWidth: 16, alignItems: 'center',
  },
  badgeText: { color: 'white', fontSize: 9, fontFamily: Typography.nunito700 },
  loadingScreen: { flex: 1, backgroundColor: Colors.bg },
  loadingInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: {
    fontFamily: Typography.playfair800,
    fontSize: 28, color: Colors.gold2, letterSpacing: 0.5,
  },
});
