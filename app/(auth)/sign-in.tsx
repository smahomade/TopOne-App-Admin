import { View, Text, ScrollView, Image, AppState, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from '../../constants'
import FormField from '../../components/FormField'
import CustomButton from '../../components/CustomButton'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import SalonLogo from '../../components/SalonLogo';


const SignIn = () => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    adminCode: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const submit = async () => {
    if (!form.adminCode.trim()) {
      Alert.alert('Auth Code required', 'Please enter your admin auth code.');
      return;
    }
    if (!form.email.trim() || !form.password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const adminCodeInt = parseInt(form.adminCode, 10);

      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) {
        Alert.alert('Sign in failed', error.message);
        return;
      }

      if (session) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('admin_code')
          .eq('id', session.user.id)
          .single();

        if (profileError || !data || data.admin_code !== adminCodeInt) {
          await supabase.auth.signOut();
          Alert.alert('Access denied', 'Invalid admin code. Please try again.');
          return;
        }

        router.replace('/(tabs)/home');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-cream flex-1">
      {/* Shrinks the form to the space above the keyboard, so the password
          field and Sign In button can be scrolled to instead of hiding
          behind it. Same setup as the chat in book.tsx. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">

          {/* Logo */}
          <View className="items-center mb-10">
            <SalonLogo
              resizeMode="contain"
              style={{ width: 160, height: 64 }}
            />
          </View>

          {/* Title */}
          <Text className="text-3xl text-ink font-display text-center mb-2">
            Admin Login
          </Text>
          <Text className="text-muted font-pregular text-center mb-10">
            TopOne Salon — Richmond
          </Text>

          {/* Fields */}
          <FormField
            title="Auth Code"
            value={form.adminCode}
            handleChangeText={(e: string) => setForm({ ...form, adminCode: e })}
            OtherStyles="mb-5"
            keyboardType="numeric"
            placeholder="Enter your auth code"
            secureTextEntry
          />

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e: string) => setForm({ ...form, email: e })}
            OtherStyles="mb-5"
            keyboardType="email-address"
            placeholder="email@address.com"
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e: string) => setForm({ ...form, password: e })}
            OtherStyles="mb-8"
            secureTextEntry
            placeholder="Password"
          />

          <CustomButton
            title="Sign In"
            handlePress={submit}
            containerStyles="w-full"
            textStyles=""
            isLoading={isSubmitting}
          />

        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default SignIn