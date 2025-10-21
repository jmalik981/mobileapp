import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
// Magic-link removed; using email/password auth

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [lastRedirectUsed, setLastRedirectUsed] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    try {
      setIsLoading(true);
      const hostUri = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.manifest?.hostUri;
      const redirectTo = hostUri ? `exp://${hostUri}` : Linking.createURL('/')
      setLastRedirectUsed(redirectTo);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        Alert.alert('Registration error', `${error.message}\nRedirect: ${redirectTo}`);
        throw error;
      }
      // Depending on Supabase email confirmation setting:
      if (!data.session) {
        // No session => confirmation required
        setPendingVerification(true);
        // Immediately attempt to resend to surface any resend error to the user
        try {
          const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email });
          if (resendErr) {
            Alert.alert('Verify your email', `We attempted to send the confirmation but got: ${resendErr.message}\nRedirect: ${redirectTo}`);
          } else {
            Alert.alert('Verify your email', `We sent a confirmation email.\nRedirect: ${redirectTo}`);
          }
        } catch (_) {
          Alert.alert('Verify your email', `We sent a confirmation email.\nRedirect: ${redirectTo}`);
        }
      } else {
        // Session exists immediately => upsert profile display_name if provided
        try {
          const uid = data.user?.id;
          if (uid && firstName.trim().length > 0) {
            await supabase.from('profiles').upsert({ id: uid, display_name: firstName.trim() });
          }
        } catch (_) {}
        Alert.alert('Welcome!', 'Account created. You are now signed in.');
      }
      // onAuthStateChange in App.tsx will navigate after session exists
    } catch (err: any) {
      const msg = String(err?.message || 'Something went wrong.');
      // Common cases: user already exists, signup disabled
      if (msg.toLowerCase().includes('user already registered')) {
        setPendingVerification(true);
        Alert.alert('Account exists', 'This email is already registered. If you did not receive a confirmation, tap Resend verification.');
      } else if (msg.toLowerCase().includes('signups not allowed') || msg.toLowerCase().includes('signup disabled')) {
        Alert.alert('Signups disabled', 'New registrations are disabled in Supabase Auth settings. Enable signups to proceed.');
      } else {
        Alert.alert('Registration error', msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // App.tsx will navigate via auth state listener
    } catch (err: any) {
      Alert.alert('Login error', err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestaurantLogin = () => {
    // Navigate to restaurant dashboard
    navigation.replace('RestaurantDashboard');
  };

  const handleDeveloperLogin = () => {
    // Skip authentication and go directly to main app
    navigation.replace('MainTabs');
  };

  const handleSignUp = () => {
    handleRegister();
  };

  const handleResendVerification = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Enter your email to resend the verification.');
      return;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        Alert.alert('Resend failed', `${error.message}${lastRedirectUsed ? `\nRedirect: ${lastRedirectUsed}` : ''}`);
        throw error;
      }
      Alert.alert('Email sent', `We resent the verification email.${lastRedirectUsed ? `\nRedirect: ${lastRedirectUsed}` : ''}`);
    } catch (err: any) {
      Alert.alert('Resend failed', err.message || 'Could not resend verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Coming Soon', 'Password reset will be implemented with Supabase');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* Logo and Title */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="wine" size={60} color="#4169E1" />
              </View>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#111', fontSize: 18, fontWeight: '600' }}>Join the vibe.</Text>
                <Text style={{ color: '#666', fontSize: 14, marginTop: 6 }}>Unlock exclusive happy hour deals in seconds.</Text>
              </View>
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* First Name (Register only) */}
            {mode === 'register' && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="First name (optional)"
                  placeholderTextColor="#999"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Login and Register CTAs */}
            {mode === 'login' ? (
              <>
                <TouchableOpacity 
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Signing In...' : 'Login'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('register')} style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: '#4169E1', fontWeight: '600' }}>Create an account</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Creating Account...' : 'Register'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('login')} style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: '#4169E1', fontWeight: '600' }}>I already have an account</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Pending verification helper */}
            {pendingVerification && (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Verify your email</Text>
                <Text style={styles.infoText}>We sent a confirmation email to {email}. Open it on this device and tap the link to activate your account.</Text>
                {lastRedirectUsed && (
                  <Text style={[styles.infoText, { fontStyle: 'italic' }]}>Redirect: {lastRedirectUsed}</Text>
                )}
                <TouchableOpacity 
                  style={[styles.secondaryButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleResendVerification}
                  disabled={isLoading}
                >
                  <Text style={styles.secondaryButtonText}>Resend verification email</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: '#666', fontSize: 12 }}>
                By continuing you agree to our Terms and Privacy Policy.
              </Text>
            </View>

            {/* Restaurant Login Button */}
            <TouchableOpacity 
              style={styles.restaurantButton}
              onPress={handleRestaurantLogin}
            >
              <Ionicons name="storefront-outline" size={20} color="#4169E1" />
              <Text style={styles.restaurantButtonText}>Restaurant Login</Text>
            </TouchableOpacity>

            {/* Developer Login Button */}
            <TouchableOpacity 
              style={styles.developerButton}
              onPress={handleDeveloperLogin}
            >
              <Ionicons name="code-outline" size={20} color="#4169E1" />
              <Text style={styles.developerButtonText}>Developer Login</Text>
            </TouchableOpacity>

            {/* Removed Google/Apple buttons as requested */}

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4169E1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  
  loginButton: {
    backgroundColor: '#4169E1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4169E1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  secondaryButtonText: {
    color: '#4169E1',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#F0F6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D6E4FF',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F3A93',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#1F3A93',
    marginBottom: 10,
  },
  
  restaurantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4169E1',
  },
  restaurantButtonText: {
    color: '#4169E1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  developerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
  },
  developerButtonText: {
    color: '#4169E1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  signUpText: {
    color: '#4169E1',
    fontSize: 14,
    fontWeight: '600',
  },
});
