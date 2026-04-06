import React, { useState } from 'react'
import { Alert, View, Text, TextInput, TouchableOpacity, ActivityIndicator, AppState } from 'react-native'
import { supabase } from '../lib/supabase'

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
      await supabase
        .from('profiles')
        .update({ admin_code: Number(authCode.trim()) })
        .eq('id', data.user.id);
    }
    setLoading(false);
  }

  const inputClass = "bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-1";

  return (
    <View className="px-5 pt-6">
      <Text className="text-white font-psemibold text-2xl mb-8 text-center">Log In</Text>

      <Text className="text-gray-100 font-pregular text-sm mb-1">Auth Code</Text>
      <TextInput
        value={authCode}
        onChangeText={setAuthCode}
        placeholder="Enter auth code"
        placeholderTextColor="#7B7B8B"
        keyboardType="numeric"
        autoCapitalize="none"
        className={inputClass}
        style={{ color: '#fff' }}
      />

      <Text className="text-gray-100 font-pregular text-sm mb-1 mt-4">Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="email@address.com"
        placeholderTextColor="#7B7B8B"
        autoCapitalize="none"
        keyboardType="email-address"
        className={inputClass}
        style={{ color: '#fff' }}
      />

      <Text className="text-gray-100 font-pregular text-sm mb-1 mt-4">Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#7B7B8B"
        secureTextEntry
        autoCapitalize="none"
        className={inputClass}
        style={{ color: '#fff' }}
      />

      <TouchableOpacity
        onPress={signInWithEmail}
        disabled={loading}
        activeOpacity={0.8}
        className="bg-secondary rounded-2xl h-16 items-center justify-center mt-8"
      >
        {loading ? (
          <ActivityIndicator color="#161622" />
        ) : (
          <Text className="text-primary font-psemibold text-base">Sign In</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
