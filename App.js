import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
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

import LoadingSpinner from './src/components/LoadingSpinner';
import { PointsToastProvider } from './src/components/PointsToast';
import NotificationManager from './src/components/NotificationManager';
import { CoupleDataProvider } from './src/components/CoupleDataProvider';
import { StreakManager } from './src/hooks/useStreakManager';
import { navigationRef, flushPendingNavigation, clearPendingNavigation } from './src/navigation/navigationRef';
import { COLORS } from './src/constants/colors';
import { FONTS } from './src/constants/fonts';
import { onAuthStateChanged, getUserProfile, auth } from './src/utils/firebase';
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

export const AuthContext = createContext({
  user: null,
  profile: null,
  profileLoading: false,
  refreshProfile: async () => null,
});

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
];

function MainNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      {gameScreens.map(({ name, component }) => (
        <RootStack.Screen key={name} name={name} component={component} />
      ))}
    </RootStack.Navigator>
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
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

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
    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isActive) return;

      setUser(firebaseUser);

      if (firebaseUser) {
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
      } else if (isActive) {
        setProfile(null);
        clearPendingNavigation();
      }

      if (isActive) {
        setAuthLoading(false);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const authContextValue = useMemo(
    () => ({ user, profile, profileLoading, refreshProfile }),
    [user, profile, profileLoading, refreshProfile]
  );

  const renderNavigator = () => {
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

  if ((!fontsLoaded && !fontError) || authLoading) {
    return (
      <View style={loadingStyles.container}>
        <LoadingSpinner size="large" />
        <Text style={loadingStyles.message}>Loading VowFinity...</Text>
      </View>
    );
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
            <NotificationManager />
            <StreakManager />
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
    gap: 16,
  },
  message: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.textMuted,
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
