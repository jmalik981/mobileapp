import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from './src/lib/supabase';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RestaurantDashboardScreen from './src/screens/RestaurantDashboardScreen';
import EditRestaurantScreen from './src/screens/EditRestaurantScreen';
import ManageImagesScreen from './src/screens/ManageImagesScreen';
import HappyHourScreen from './src/screens/HappyHourScreen';
import HomeScreen from './src/screens/HomeScreen';
import NearbyMapWebView from './src/screens/NearbyMapWebView';
import FollowingScreen from './src/screens/FollowingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import RestaurantDetailScreen from './src/screens/RestaurantDetailScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import NearbyMapScreen from './src/screens/NearbyMapScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator({ welcomeName }: { welcomeName?: string | null }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'locate' : 'locate-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Following') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#171717',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#171717',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => (
          welcomeName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
              <Ionicons name="hand-right-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: '600' }}>Welcome back, {welcomeName}</Text>
            </View>
          ) : null
        ),
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Happy Hour Deals' }}
      />
      <Tab.Screen 
        name="Map" 
        component={NearbyMapScreen} 
        options={{ title: 'Nearby Restaurants' }}
      />
      <Tab.Screen 
        name="Following" 
        component={FollowingScreen} 
        options={{ title: 'Following' }}
      />
       <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen} 
        options={{ title: 'Favorites' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<'Login' | 'MainTabs' | 'Onboarding'>('Login');
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);

  // Fetch or create profile for the current user
  const ensureProfile = async (userId: string, email?: string | null): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // ignore not found
      if (!data) {
        // Create a profile with no display_name to trigger onboarding
        await supabase
          .from('profiles')
          .insert({ id: userId, role: 'user', display_name: null, vendor_verified: false });
        setWelcomeName(null);
        return false;
      }
      setWelcomeName(data.display_name ?? null);
      return !!data.display_name;
    } catch (e) {
      // Fail softly; keep navigation working
      setWelcomeName(null);
      return false;
    }
  };

  useEffect(() => {
    const handleDeeplink = async (url: string | null) => {
      try {
        if (!url) return;
        const parsed = Linking.parse(url);
        // Supabase may send token as 'token_hash' or 'token'
        const token_hash =
          (parsed.queryParams?.token_hash as string) ||
          (parsed.queryParams?.token as string) ||
          null;
        const typeParam = (parsed.queryParams?.type as string) || null;
        // Supabase uses type=magiclink or signup; both validate with 'magiclink'
        if (token_hash && (typeParam === 'magiclink' || typeParam === 'signup')) {
          const { data, error } = await supabase.auth.verifyOtp({
            type: 'magiclink',
            token_hash,
          });
          if (error) {
            // eslint-disable-next-line no-console
            console.warn('verifyOtp error', error);
            return;
          }
          // Session established; ensure profile
          const session = (await supabase.auth.getSession()).data.session;
          if (session?.user) {
            const hasName = await ensureProfile(session.user.id, session.user.email);
            setNeedsOnboarding(!hasName);
            setInitialRoute(hasName ? 'MainTabs' : 'Onboarding');
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Deeplink handling failed', e);
      }
    };

    // Check current session on app start
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const hasName = await ensureProfile(session.user.id, session.user.email);
        setNeedsOnboarding(!hasName);
        setInitialRoute(hasName ? 'MainTabs' : 'Onboarding');
      } else {
        setInitialRoute('Login');
      }
    });

    // Listen to auth changes (magic link, logout, etc.)
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const hasName = await ensureProfile(session.user.id, session.user.email);
        setNeedsOnboarding(!hasName);
        setInitialRoute(hasName ? 'MainTabs' : 'Onboarding');
      } else {
        setInitialRoute('Login');
        setWelcomeName(null);
        setNeedsOnboarding(false);
      }
    });

    // Handle initial URL (cold start) and subsequent URL events
    Linking.getInitialURL().then((url) => handleDeeplink(url));
    const urlSub = Linking.addEventListener('url', ({ url }) => handleDeeplink(url));
    return () => {
      sub.subscription.unsubscribe();
      urlSub.remove();
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} key={initialRoute}>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
          options={{ 
            title: 'Welcome',
            headerStyle: { backgroundColor: '#171717' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <Stack.Screen 
          name="MainTabs" 
          children={() => <TabNavigator welcomeName={welcomeName} />} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="RestaurantDashboard" 
          component={RestaurantDashboardScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="EditRestaurant" 
          component={EditRestaurantScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ManageImages" 
          component={ManageImagesScreen} 
          options={{ headerShown: false }}
        />
    
    <Stack.Screen 
          name="HappyHour" 
          component={HappyHourScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="QRScanner" 
          component={QRScannerScreen}
          options={{
            title: 'Scan QR Code',
            headerStyle: { backgroundColor: '#171717' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <Stack.Screen 
          name="RestaurantDetail" 
          component={RestaurantDetailScreen}
          options={{
            title: 'Restaurant Details',
            headerStyle: { backgroundColor: '#171717' },
            headerTintColor: '#FFFFFF',     
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}