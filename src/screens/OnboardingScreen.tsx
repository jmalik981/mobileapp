import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function OnboardingScreen({ navigation }: any) {
  const [firstName, setFirstName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!firstName.trim()) {
      Alert.alert('Add your name', 'Please enter your first name to personalize your experience.');
      return;
    }
    try {
      setIsSaving(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        Alert.alert('Not signed in', 'Please sign in again.');
        navigation.replace('Login');
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName.trim() })
        .eq('id', uid);
      if (error) throw error;
      // Navigate to main app
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      Alert.alert('Save failed', e.message || 'Could not save your name.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="sparkles-outline" size={40} color="#4169E1" />
          <Text style={styles.title}>Welcome to That Happy Hour</Text>
          <Text style={styles.subtitle}>Let’s personalize your experience</Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="First name"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoFocus
          />
        </View>

        <TouchableOpacity style={[styles.ctaButton, isSaving && styles.ctaButtonDisabled]} onPress={handleContinue} disabled={isSaving}>
          <Text style={styles.ctaText}>{isSaving ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.helpText}>You can change this later in Profile</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#222', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 16,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, color: '#222' },
  ctaButton: {
    backgroundColor: '#4169E1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaButtonDisabled: { opacity: 0.7 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { alignItems: 'center' },
  helpText: { color: '#888', fontSize: 12 },
});
