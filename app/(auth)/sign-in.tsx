import { View, Text, ScrollView, Image, AppState } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from '../../constants'
import FormField from '../../components/FormField'
import CustomButton from '../../components/CustomButton'
import { Link, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import Account from '../../components/Account'


const SignIn = () => {
  const [form, setForm] = useState({
    email:'',
    password:'',
    adminCode:''
  })

  const [isSubmitting, setisSubmitting] = useState(false);
  

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };
  
    const subscription = AppState.addEventListener('change', handleAppStateChange);
  
    // Cleanup listener on component unmount
    return () => {
      subscription.remove();  // Proper cleanup
    };
  }, []);


  const submit = async () => {
    setisSubmitting(true);
  
    const adminCodeInt = parseInt(form.adminCode, 10); // Convert to integer
    
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
  
    if (error) {
      alert(error.message);
    } else if (session) {
      const { data, error: adminError } = await supabase
        .from('profiles')
        .select('admin_code')
        .eq('id', session.user.id)
        .single();
  
      if (adminError || data.admin_code !== adminCodeInt) {
        alert('Admin code mismatch!');
      } else {
        alert('Login successful!');
        router.push('/profile');
      }
    }
    setisSubmitting(false);
};

  return (
    //Whole Background becomes faded black
    <SafeAreaView className="bg-primary h-full">
        
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center items-center px-4">
          <Image 
            source={images.logoTopOneWhite}
            resizeMode='contain' 
            className="w-[150px] h-[85px]"
          />
        </View>
        {/* All items inside view get adjusted by CSS */}
        <View className="flex-1 justify-center items-center px-4 pb-14">

          {/* Text under the logo */}
          <Text className="text-2xl text-white font-psemibold mt-4">
            Log in to Top One
          </Text>

          <FormField
            title="Auth ID"
            value={form.adminCode}
            handleChangeText={(e) => setForm({ ...form, adminCode: e })}
            OtherStyles="mt-7"
            keyboardType="default"
          />

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({...form, email:e})}
            OtherStyles='mt-7'
            keyboardType="email-address"
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({...form, password:e})}
            OtherStyles='mt-7'
          />

          <CustomButton 
            title='Sign In'
            handlePress={submit}
            containerStyles="mt-7 w-full"
            isLoading={isSubmitting}
          />

          {/* Admin Text - Positioned at the bottom */}
          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Dont have an Account?
            </Text>
            <Link href={"/sign-up"} className="text-lg font-psemibold text-secondary underline">Sign up</Link>
          </View>

          {/* Admin Text - Positioned at the bottom */}
          <View className=" justify-center pt-20 flex-row gap-2">
              <Text className="text-lg text-gray-100 font-pregular">
                Forgot Password?
              </Text>
              <Link href="/sign-in" className="text-lg font-psemibold text-secondary underline">
                Click Here
              </Link>
            </View>
        </View>
      </ScrollView>
      
    </SafeAreaView>
  )
}

export default SignIn