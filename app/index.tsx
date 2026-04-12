import { Link, router } from "expo-router";
import { Image,ScrollView,Text, View, ImageBackground } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../constants"; 
import CustomButton from "@/components/CustomButton";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from '@supabase/supabase-js'
import { useFocusEffect } from '@react-navigation/native';
import React from "react";


export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  

    useFocusEffect(
      React.useCallback(() => {
        const getSession = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
        };
        getSession();
      }, [])
    );

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      //console.log("Session data:", session); // Log session data
      setSession(session);
      setLoading(false); // Stop loading once session is checked
    };
    getSession();

 
  }, [session]);

  const handleBooking = () => {
    if (loading) return; // Prevent any navigation while loading
    if (session) {
      router.push('/home');  // Redirect to home if logged in
    } else {
      router.push('/sign-in');  // Redirect to sign-in if not logged in
    }
  };

  return (
    
    <SafeAreaView className="bg-primary h-full ">

      <ImageBackground 
        source={images.backgroundImage}  // Replace with your background image
        style={{ flex: 1 }} // Ensures the image covers the full screen
        >
      {/* Overlay or fade effect */}
      <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', flex: 1 }}>
      <ScrollView contentContainerStyle ={{ height: '100%'}}>

        {/* Top Logo Image - Positioned at the top */}
        <View className="w-full items-center justify-start pt-10">
          <Image 
            source={images.logoTopOneWhite}
            className="w-[200px] h-[85px]"
            resizeMode="contain"
          />
        </View>

        {/* Adjusting items inside, e.g. centering the images */}
        <View className="w-full items-center justify-center min-h-[85vh] px-4 mt-14">

          
          <View className="relative mt-5">
            <Text className="text-7xl text-white font-bold text-center">
              ADMIN 
            </Text>
            <Text className="text-5xl text-secondary-100 font-bold text-center">
              TOP ONE
            </Text>
        </View>

          
          {/* Under Components, we are using CustomerButton tsx file with components */}
          {/* the orange button with "continue with email"*/}
          <CustomButton 
            title ="LOG IN HERE"
            handlePress={handleBooking}
            containerStyles="w-full mt-7"
            textStyles=""
            isLoading={loading}
          />
      </View>
      </ScrollView>
      
      {/* Adds light to the status bar (top bar with battery, wifi and time) <StatusBar backgroundColor="#161622" style="light"/> */}
      </View>
      </ImageBackground>
      <StatusBar style='light'/>
    </SafeAreaView>
  );
}
