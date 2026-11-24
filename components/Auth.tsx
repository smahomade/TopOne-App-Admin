import React, { useState } from 'react'
import { Alert, View, Text, TextInput, TouchableOpacity, ActivityIndicator, AppState } from 'react-native'
import { supabase } from '../lib/supabase'
import { getStaffCode } from '../lib/staff'

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!authCode.trim()) {
      Alert.alert('Auth Code required', 'Please enter your auth code to continue.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert(error.message);
    } else if (data.user) {
      // Check the code against the profile; never write it. Staff codes are
      // set in the Supabase dashboard and the database blocks app changes.
      try {
        const staffCode = await getStaffCode(data.user.id);
        if (staffCode === null || staffCode !== Number(authCode.trim())) {
          await supabase.auth.signOut();
          Alert.alert('Access denied', 'Invalid admin code. Please try again.');
        }
      } catch {
        await supabase.auth.signOut();
        Alert.alert('Sign in failed', 'Could not check your admin code. Please try again.');
      }
    }
    setLoading(false);
  }

  const inputClass = "bg-field text-ink font-pregular rounded-xl px-4 py-3 mb-1";

  return (
    <View className="px-5 pt-6">
      <Text className="text-ink font-display text-[28px] mb-8 text-center">Log In</Text>

      <Text className="text-muted font-pregular text-sm mb-1">Auth Code</Text>
      <TextInput
        value={authCode}
        onChangeText={setAuthCode}
        placeholder="Enter auth code"
        placeholderTextColor="#8A8178"
        keyboardType="numeric"
        autoCapitalize="none"
        className={inputClass}
        style={{ color: '#1A1817' }}
      />

      <Text className="text-muted font-pregular text-sm mb-1 mt-4">Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="email@address.com"
        placeholderTextColor="#8A8178"
        autoCapitalize="none"
        keyboardType="email-address"
        className={inputClass}
        style={{ color: '#1A1817' }}
      />

      <Text className="text-muted font-pregular text-sm mb-1 mt-4">Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#8A8178"
        secureTextEntry
        autoCapitalize="none"
        className={inputClass}
        style={{ color: '#1A1817' }}
      />

      <TouchableOpacity
        onPress={signInWithEmail}
        disabled={loading}
        activeOpacity={0.8}
        className="bg-ink rounded-2xl h-16 items-center justify-center mt-8"
      >
        {loading ? (
          <ActivityIndicator color="#F4F1EC" />
        ) : (
          <Text className="text-cream font-psemibold text-base">Sign In</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
