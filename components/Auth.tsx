import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState } from 'react-native'
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
  // State variables for login/signup fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');  // Full Name for signup
  const [lastName, setLastName] = useState('');  // Full Name for signup
  const [phoneNumber, setPhoneNumber] = useState('');  // Phone Number for signup
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false); // Toggle between login and signup

  // Login function
  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  // Signup function
  async function signUpWithEmail() {
    setLoading(true);
    
    const { data: { user }, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      
    });
  
    if (error) {
      Alert.alert(error.message);
    } else if (user) {
      // Insert full name and phone number into the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, updated_at: new Date(), first_name:firstName, last_name:lastName, phone_number:phoneNumber});
  
      if (profileError) {
        console.log('Profile Insert Error:', profileError);
      } else {
        console.log('Profile Insert Success');
      }
    }
  
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {isSignup ? (
        <>
          {/* Signup Form */}
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Input
              label="First Name"
              leftIcon={{ type: 'font-awesome', name: 'first_name' }}
              onChangeText={(text) => setFirstName(text)}
              value={firstName}
              placeholder="Enter your full name"
              autoCapitalize="words"
            />
          </View>
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Input
              label="Last Name"
              leftIcon={{ type: 'font-awesome', name: 'last_name' }}
              onChangeText={(text) => setLastName(text)}
              value={lastName}
              placeholder="Enter your full name"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.verticallySpaced}>
            <Input
              label="Phone Number"
              leftIcon={{ type: 'font-awesome', name: 'phone' }}
              onChangeText={(text) => setPhoneNumber(text)}
              value={phoneNumber}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.verticallySpaced}>
            <Input
              label="Email"
              leftIcon={{ type: 'font-awesome', name: 'envelope' }}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="email@address.com"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.verticallySpaced}>
            <Input
              label="Password"
              leftIcon={{ type: 'font-awesome', name: 'lock' }}
              onChangeText={(text) => setPassword(text)}
              value={password}
              secureTextEntry={true}
              placeholder="Password"
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Button title="Sign up" disabled={loading} onPress={signUpWithEmail} />
          </View>
        </>
      ) : (
        <>
          {/* Login Form */}
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Input
              label="Email"
              leftIcon={{ type: 'font-awesome', name: 'envelope' }}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="email@address.com"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.verticallySpaced}>
            <Input
              label="Password"
              leftIcon={{ type: 'font-awesome', name: 'lock' }}
              onChangeText={(text) => setPassword(text)}
              value={password}
              secureTextEntry={true}
              placeholder="Password"
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Button title="Sign in" disabled={loading} onPress={signInWithEmail} />
          </View>
        </>
      )}

      {/* Toggle between login and signup */}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={isSignup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          onPress={() => setIsSignup(!isSignup)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
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
