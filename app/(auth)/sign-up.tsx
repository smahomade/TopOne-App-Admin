import { View, Text, ScrollView, Image } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../constants';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const SignUp = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
  });

  const [isSubmitting, setisSubmitting] = useState(false);

  // Function to generate admin code (this can be modified as needed)
  const generateAdminCode = () => {
    return Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit integer code
  };

  const submit = async () => {
    setisSubmitting(true);

    const { data: { user }, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) {
      alert(error.message);
    } else if (user) {
      const adminCode = generateAdminCode();

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: form.firstName,
          last_name: form.lastName,
          phone_number: form.phone,
          admin_code: adminCode, // Save the generated admin code
          updated_at: new Date(),
        });

      if (profileError) {
        alert(profileError.message);
      } else {
        alert('Signup successful! Welcome to Top One!');
        router.push('/profile');
      }
    }

    setisSubmitting(false);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center items-center px-4">
          <Image
            source={images.logoTopOneWhite}
            resizeMode="contain"
            className="w-[150px] h-[85px]"
          />
        </View>

        <View className="flex-1 justify-center items-center px-4 pb-8">
          <Text className="text-2xl text-white font-psemibold">
            Sign up to Top One
          </Text>

          <FormField
            title="First Name"
            value={form.firstName}
            handleChangeText={(e) => setForm({ ...form, firstName: e })}
            OtherStyles="mt-5"
          />

          <FormField
            title="Second Name"
            value={form.lastName}
            handleChangeText={(e) => setForm({ ...form, lastName: e })}
            OtherStyles="mt-5"
          />

          <FormField
            title="Phone Number"
            value={form.phone}
            handleChangeText={(e) => setForm({ ...form, phone: e })}
            OtherStyles="mt-5"
            keyboardType="numeric"
          />

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            OtherStyles="mt-5"
            keyboardType="email-address"
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            OtherStyles="mt-5"
          />

          <CustomButton
            title="Sign Up"
            handlePress={submit}
            containerStyles="mt-7 w-full"
            isLoading={isSubmitting}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Have an account already?
            </Text>
            <Link href="/sign-in" className="text-lg font-psemibold text-secondary underline">
              Sign in
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
