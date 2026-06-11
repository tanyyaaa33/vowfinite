import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';

import BrandLogo from './src/components/BrandLogo';
import LoadingSpinner from './src/components/LoadingSpinner';
import { PointsToastProvider } from './src/components/PointsToast';
import NotificationManager from './src/components/NotificationManager';
import { CoupleDataProvider } from './src/components/CoupleDataProvider';
import { StreakManager } from './src/hooks/useStreakManager';
import { navigationRef, flushPendingNavigation, clearPendingNavigation } from './src/navigation/navigationRef';
import { COLORS } from './src/constants/colors';
import { FONTS } from './src/constants/fonts';
import { onAuthStateChanged, getUserProfile, auth, isFirebaseConfigured } from './src/utils/firebase';
import FirebaseSetupScreen from './src/components/FirebaseSetupScreen';
import GuestPreviewBanner from './src/components/GuestPreviewBanner';
import { GUEST_PROFILE } from './src/constants/guestData';
import {
  initializePushNotifications,
  setupCoupleNotifications,
} from './src/utils/notifications';

import SplashScreen from './src/screens/auth/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import YourNameScreen from './src/screens/onboarding/YourNameScreen';
import PartnerNameScreen from './src/screens/onboarding/PartnerNameScreen';
import StartDateScreen from './src/screens/onboarding/StartDateScreen';
import AvatarScreen from './src/screens/onboarding/AvatarScreen';
import LoveLanguageScreen from './src/screens/onboarding/LoveLanguageScreen';
import InviteCodeScreen from './src/screens/onboarding/InviteCodeScreen';
import HomeScreen from './src/screens/main/HomeScreen';
import GamesHubScreen from './src/screens/main/GamesHubScreen';
import SurpriseScreen from './src/screens/main/SurpriseScreen';
import PartnerScreen from './src/screens/main/PartnerScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';
import DailyQuestionAnswer from './src/screens/games/DailyQuestionAnswer';
import DailyQuestionReveal from './src/screens/games/DailyQuestionReveal';
import WhoMoreLikelyQuestion from './src/screens/games/WhoMoreLikelyQuestion';
import WhoMoreLikelyReveal from './src/screens/games/WhoMoreLikelyReveal';
import Hesa10ButCreate from './src/screens/games/Hesa10ButCreate';
import Hesa10ButRate from './src/screens/games/Hesa10ButRate';
import Hesa10ButReveal from './src/screens/games/Hesa10ButReveal';
import DareDropDare from './src/screens/games/DareDropDare';
import DareDropComplete from './src/screens/games/DareDropComplete';
import DareDropReaction from './src/screens/games/DareDropReaction';
import VoiceBombRecord from './src/screens/games/VoiceBombRecord';
import VoiceBombListen from './src/screens/games/VoiceBombListen';
import VoiceBombReply from './src/screens/games/VoiceBombReply';
import DailyQuestionHistory from './src/screens/games/DailyQuestionHistory';
import VoiceBombInbox from './src/screens/games/VoiceBombInbox';
import Hes10History from './src/screens/games/Hes10History';
import MemoryLaneScreen from './src/screens/main/MemoryLaneScreen';
import { AuthContext } from './src/context/AuthContext';

const AuthStack = createStackNavigator();
const OnboardingStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

function TabIcon({ emoji, focused }) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>{emoji}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.pink,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.medium,
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Games"
        component={GamesHubScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎮" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Surprise"
        component={SurpriseScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="✨" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Partner"
        component={PartnerScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💑" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="YourName" component={YourNameScreen} />
      <OnboardingStack.Screen name="PartnerName" component={PartnerNameScreen} />
      <OnboardingStack.Screen name="StartDate" component={StartDateScreen} />
      <OnboardingStack.Screen name="Avatar" component={AvatarScreen} />
      <OnboardingStack.Screen name="LoveLanguage" component={LoveLanguageScreen} />
      <OnboardingStack.Screen name="InviteCode" component={InviteCodeScreen} />
    </OnboardingStack.Navigator>
  );
}

function InviteOnlyNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="InviteCode" component={InviteCodeScreen} />
    </OnboardingStack.Navigator>
  );
}

const gameScreens = [
  { name: 'DailyQuestionAnswer', component: DailyQuestionAnswer },
  { name: 'DailyQuestionReveal', component: DailyQuestionReveal },
  { name: 'WhoMoreLikelyQuestion', component: WhoMoreLikelyQuestion },
  { name: 'WhoMoreLikelyReveal', component: WhoMoreLikelyReveal },
  { name: 'Hesa10ButCreate', component: Hesa10ButCreate },
  { name: 'Hesa10ButRate', component: Hesa10ButRate },
  { name: 'Hesa10ButReveal', component: Hesa10ButReveal },
  { name: 'DareDropDare', component: DareDropDare },
  { name: 'DareDropComplete', component: DareDropComplete },
  { name: 'DareDropReaction', component: DareDropReaction },
  { name: 'VoiceBombRecord', component: VoiceBombRecord },
  { name: 'VoiceBombListen', component: VoiceBombListen },
  { name: 'VoiceBombReply', component: VoiceBombReply },
  { name: 'DailyQuestionHistory', component: DailyQuestionHistory },
  { name: 'VoiceBombInbox', component: VoiceBombInbox },
  { name: 'Hes10History', component: Hes10History },
  { name: 'MemoryLane', component: MemoryLaneScreen },
];

function MainNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <GuestPreviewBanner />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        {gameScreens.map(({ name, component }) => (
          <RootStack.Screen key={name} name={name} component={component} />
        ))}
      </RootStack.Navigator>
    </View>
  );
}

function getOnboardingInitialRoute(profile) {
  if (!profile?.name) return 'YourName';
  if (!profile?.partnerName) return 'PartnerName';
  if (!profile?.startDate) return 'StartDate';
  if (!profile?.avatarUrl && !profile?.avatarEmoji) return 'Avatar';
  if (!profile?.loveLanguage) return 'LoveLanguage';
  return 'InviteCode';
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
    setProfile(GUEST_PROFILE);
    setUser(null);
    clearPendingNavigation();
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
    setProfile(null);
    clearPendingNavigation();
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_400Regular_Italic,
  });

  const refreshProfile = useCallback(async () => {
    if (!user?.uid) {
      setProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const data = await getUserProfile(user.uid);
      const nextProfile = data
        ? { ...data, uid: user.uid, email: user.email }
        : { uid: user.uid, email: user.email };
      setProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      console.warn('refreshProfile failed:', error.message);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setFontsReady(true);
      return undefined;
    }

    const fontTimeout = setTimeout(() => setFontsReady(true), 8000);
    return () => clearTimeout(fontTimeout);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return undefined;
    }

    let isActive = true;

    const authTimeout = setTimeout(() => {
      if (isActive) {
        console.warn('Auth check timed out — continuing without blocking startup.');
        setAuthLoading(false);
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isActive) return;

      setUser(firebaseUser);
      setAuthLoading(false);

      if (!firebaseUser) {
        if (!isGuest) {
          setProfile(null);
          clearPendingNavigation();
        }
        return;
      }

      setIsGuest(false);

      void (async () => {
        try {
          const data = await getUserProfile(firebaseUser.uid);
          if (!isActive) return;
          setProfile(
            data
              ? { ...data, uid: firebaseUser.uid, email: firebaseUser.email }
              : { uid: firebaseUser.uid, email: firebaseUser.email }
          );
        } catch (error) {
          console.warn('Auth profile load failed:', error.message);
          if (isActive) {
            setProfile({ uid: firebaseUser.uid, email: firebaseUser.email });
          }
        }

        try {
          if (!isActive) return;
          await initializePushNotifications(firebaseUser.uid);
          if (!isActive) return;
          await setupCoupleNotifications({});
        } catch (error) {
          console.warn('Push registration failed:', error.message);
        }
      })();
    });

    return () => {
      isActive = false;
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, [isGuest]);

  const authContextValue = useMemo(
    () => ({
      user,
      profile,
      profileLoading,
      refreshProfile,
      isGuest,
      enterGuestMode,
      exitGuestMode,
    }),
    [user, profile, profileLoading, refreshProfile, isGuest, enterGuestMode, exitGuestMode]
  );

  const renderNavigator = () => {
    if (isGuest) return <MainNavigator />;
    if (!user) return <AuthNavigator />;
    if (!profile?.coupleId) {
      if (!profile?.name) {
        const initialRoute = getOnboardingInitialRoute(profile);
        return (
          <OnboardingStack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
          >
            <OnboardingStack.Screen name="YourName" component={YourNameScreen} />
            <OnboardingStack.Screen name="PartnerName" component={PartnerNameScreen} />
            <OnboardingStack.Screen name="StartDate" component={StartDateScreen} />
            <OnboardingStack.Screen name="Avatar" component={AvatarScreen} />
            <OnboardingStack.Screen name="LoveLanguage" component={LoveLanguageScreen} />
            <OnboardingStack.Screen name="InviteCode" component={InviteCodeScreen} />
          </OnboardingStack.Navigator>
        );
      }
      return <InviteOnlyNavigator />;
    }
    return <MainNavigator />;
  };

  if (!fontsReady || authLoading) {
    return (
      <View style={loadingStyles.container}>
        <BrandLogo size="compact" />
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (!isFirebaseConfigured) {
    return <FirebaseSetupScreen />;
  }

  return (
    <SafeAreaProvider>
      <PointsToastProvider>
        <AuthContext.Provider value={authContextValue}>
          <CoupleDataProvider>
            <NavigationContainer
              ref={navigationRef}
              onReady={flushPendingNavigation}
              onStateChange={() => {
                if (navigationRef.isReady()) {
                  flushPendingNavigation();
                }
              }}
            >
              <StatusBar style="dark" />
              {renderNavigator()}
            </NavigationContainer>
            {!isGuest && <NotificationManager />}
            {!isGuest && <StreakManager />}
          </CoupleDataProvider>
        </AuthContext.Provider>
      </PointsToastProvider>
    </SafeAreaProvider>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
});

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 28,
  },
  iconWrapActive: {
    transform: [{ scale: 1.1 }],
  },
  icon: {
    fontSize: 22,
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
});
