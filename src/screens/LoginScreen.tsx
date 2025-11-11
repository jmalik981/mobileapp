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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userType, setUserType] = useState<'consumer' | 'restaurant_owner'>('consumer');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [lastRedirectUsed, setLastRedirectUsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    
    if (!email || !password || !firstName || !lastName) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      const hostUri = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.manifest?.hostUri;
      const redirectTo = hostUri ? `exp://${hostUri}` : Linking.createURL('/');
      setLastRedirectUsed(redirectTo);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: redirectTo,
          data: {
            user_type: userType,
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      
      if (error) {
        setError(error.message);
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
        // Session exists immediately => create profile with proper role
        try {
          const uid = data.user?.id;
          if (uid) {
            const displayName = `${firstName.trim()} ${lastName.trim()}`;
            const role = userType === 'restaurant_owner' ? 'vendor' : 'user';
            
            await supabase.from('profiles').upsert({ 
              id: uid, 
              display_name: displayName,
              role: role,
              vendor_verified: userType === 'restaurant_owner'
            });
          }
        } catch (_) {}
        
        if (userType === 'restaurant_owner') {
          Alert.alert('Welcome!', 'Account created. Let\'s set up your restaurant!');
        } else {
          Alert.alert('Welcome!', 'Account created. You are now signed in.');
        }
      }
      // onAuthStateChange in App.tsx will navigate after session exists
    } catch (err: any) {
      const msg = String(err?.message || 'Something went wrong.');
      // Common cases: user already exists, signup disabled
      if (msg.toLowerCase().includes('user already registered')) {
        setPendingVerification(true);
        setError('This email is already registered. If you did not receive a confirmation, tap Resend verification.');
      } else if (msg.toLowerCase().includes('signups not allowed') || msg.toLowerCase().includes('signup disabled')) {
        setError('New registrations are disabled. Please contact support.');
      } else {
        setError(msg);
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

  // Removed bypass login methods for security

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
                <Ionicons name="wine" size={60} color="#171717" />
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

            {/* Register Form Fields */}
            {mode === 'register' && (
              <>
                {/* Name Fields */}
                <View style={styles.nameRow}>
                  <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                    <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="First name"
                      placeholderTextColor="#999"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                    <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Last name"
                      placeholderTextColor="#999"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                {/* User Type Selection */}
                <View style={styles.userTypeContainer}>
                  <Text style={styles.userTypeLabel}>Account Type</Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.userTypeOption,
                      userType === 'consumer' && styles.userTypeOptionSelected
                    ]}
                    onPress={() => setUserType('consumer')}
                  >
                    <View style={styles.userTypeContent}>
                      <View style={[
                        styles.radioButton,
                        userType === 'consumer' && styles.radioButtonSelected
                      ]}>
                        {userType === 'consumer' && <View style={styles.radioButtonInner} />}
                      </View>
                      <View style={styles.userTypeText}>
                        <Text style={styles.userTypeTitle}>Food Lover</Text>
                        <Text style={styles.userTypeDescription}>Find great deals</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.userTypeOption,
                      userType === 'restaurant_owner' && styles.userTypeOptionSelected
                    ]}
                    onPress={() => setUserType('restaurant_owner')}
                  >
                    <View style={styles.userTypeContent}>
                      <View style={[
                        styles.radioButton,
                        userType === 'restaurant_owner' && styles.radioButtonSelected
                      ]}>
                        {userType === 'restaurant_owner' && <View style={styles.radioButtonInner} />}
                      </View>
                      <View style={styles.userTypeText}>
                        <Text style={styles.userTypeTitle}>Restaurant Owner</Text>
                        <Text style={styles.userTypeDescription}>Promote my business</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </>
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
                  <Text style={{ color: '#171717', fontWeight: '600' }}>Create an account</Text>
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
                  <Text style={{ color: '#171717', fontWeight: '600' }}>I already have an account</Text>
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

            {/* Removed bypass login buttons for security */}

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
    shadowColor: '#171717',
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
    backgroundColor: '#171717',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#171717',
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
    color: '#171717',
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
    borderColor: '#171717',
  },
  restaurantButtonText: {
    color: '#171717',
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
    borderColor: '#171717',
    borderStyle: 'dashed',
  },
  developerButtonText: {
    color: '#171717',
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
    color: '#171717',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // New styles for signup form
  nameRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  userTypeContainer: {
    marginBottom: 20,
  },
  userTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
  },
  userTypeOption: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  userTypeOptionSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#171717',
  },
  userTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: '#171717',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#171717',
  },
  userTypeText: {
    flex: 1,
  },
  userTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 2,
  },
  userTypeDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
});
