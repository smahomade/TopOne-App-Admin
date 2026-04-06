import React, { useState } from 'react'
import { Alert, StyleSheet, View, Text, AppState } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from '@rneui/themed'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
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

  const inputStyle = { color: '#FFFFFF' };
  const labelStyle = { color: '#CDCDE0' };
  const iconColor = '#8ED1FC';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Auth Code"
          leftIcon={{ type: 'font-awesome', name: 'key', color: iconColor }}
          onChangeText={(text) => setAuthCode(text)}
          value={authCode}
          placeholder="Enter auth code"
          placeholderTextColor="#7B7B8B"
          autoCapitalize="none"
          keyboardType="numeric"
          inputStyle={inputStyle}
          labelStyle={labelStyle}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Email"
          leftIcon={{ type: 'font-awesome', name: 'envelope', color: iconColor }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          placeholderTextColor="#7B7B8B"
          autoCapitalize="none"
          inputStyle={inputStyle}
          labelStyle={labelStyle}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          leftIcon={{ type: 'font-awesome', name: 'lock', color: iconColor }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          placeholderTextColor="#7B7B8B"
          autoCapitalize="none"
          inputStyle={inputStyle}
          labelStyle={labelStyle}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button title="Sign in" disabled={loading} onPress={signInWithEmail} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
});
