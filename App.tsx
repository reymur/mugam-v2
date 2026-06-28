import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_800ExtraBold } from '@expo-google-fonts/playfair-display';
import { Nunito_300Light, Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, AppState } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import ToastOverlay  from './src/components/common/Toast';
import { useAppStore } from './src/store/useAppStore';
import { setUserOnlineStatus } from './src/firebase/firestore';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const initApp = useAppStore(s => s.initApp);
  const user    = useAppStore(s => s.user);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
      initApp();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!user?.uid) return;

    setUserOnlineStatus(user.uid, true).catch(() => {});

    const sub = AppState.addEventListener('change', nextState => {
      if (!user?.uid) return;
      setUserOnlineStatus(user.uid, nextState === 'active').catch(() => {});
    });

    return () => {
      sub.remove();
    };
  }, [user?.uid]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0c0a06" />
        <View style={{ flex: 1 }}>
          <RootNavigator />
          <ToastOverlay />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
