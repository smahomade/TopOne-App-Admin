import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { View, Alert, ScrollView, SafeAreaView, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import FormField from '../components/FormField';

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true);
  const [adminCode, setAdminCode] = useState<number | null>(null); // Ensure adminCode is a number
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (session) {
      console.log('Session:', session); // Debugging
      getProfile();
    }
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`admin_code, first_name, last_name, phone_number`)
        .eq('id', session?.user.id)
        .single();
      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setAdminCode(data.admin_code); // Treat as a number
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPhoneNumber(data.phone_number);
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile({
    admin_code,
    first_name,
    last_name,
    phone_number,
  }: {
    admin_code: number;
    first_name: string;
    last_name: string;
    phone_number: string;
  }) {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const updates = {
        id: session?.user.id,
        admin_code,
        first_name,
        last_name,
        phone_number,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View className="px-4 pt-6 pb-10">

        <Text className="text-white font-psemibold text-2xl mb-6">Profile</Text>

        <FormField
          title="Admin Code"
          value={adminCode?.toString() || ''}
          placeholder="Admin Code"
          titleColor="text-gray-100"
          editable={false}
          textColor="#CDCDE0"
        />

        <FormField
          title="Email"
          value={session?.user?.email || ''}
          placeholder="User email"
          titleColor="text-gray-100"
          editable={false}
          textColor="#CDCDE0"
          OtherStyles="mt-5"
        />

        <FormField
          title="First Name"
          value={firstName}
          handleChangeText={setFirstName}
          placeholder="Enter your first name"
          OtherStyles="mt-5"
          titleColor="text-gray-100"
        />
        <FormField
          title="Last Name"
          value={lastName}
          handleChangeText={setLastName}
          placeholder="Enter your last name"
          OtherStyles="mt-5"
          titleColor="text-gray-100"
        />
        <FormField
          title="Phone Number"
          value={phoneNumber}
          handleChangeText={setPhoneNumber}
          placeholder="Enter your phone number"
          OtherStyles="mt-5"
          keyboardType="phone-pad"
          titleColor="text-gray-100"
        />

        <TouchableOpacity
          onPress={() =>
            updateProfile({
              admin_code: adminCode || 0,
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
            })
          }
          disabled={loading}
          activeOpacity={0.8}
          className="bg-secondary rounded-2xl h-16 items-center justify-center mt-8 mb-3"
        >
          {loading ? (
            <ActivityIndicator color="#161622" />
          ) : (
            <Text className="text-primary font-psemibold text-base">Update Profile</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace('/');
          }}
          activeOpacity={0.8}
          className="rounded-2xl h-16 items-center justify-center border border-red-500"
        >
          <Text className="text-red-500 font-psemibold text-base">Sign Out</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  </SafeAreaView>
  );
}
