import { SplashScreen, Stack } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display";
import { LocationProvider } from "../context/LocationContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {

  // The website's fonts: DM Sans for text, Playfair Display for headings.
  const [fontsLoaded, error] = useFonts({
    "DMSans-Regular": DMSans_400Regular,
    "DMSans-Medium": DMSans_500Medium,
    "DMSans-SemiBold": DMSans_600SemiBold,
    "DMSans-Bold": DMSans_700Bold,
    "PlayfairDisplay-Medium": PlayfairDisplay_500Medium,
    "PlayfairDisplay-SemiBold": PlayfairDisplay_600SemiBold,
  });

  useEffect(() => {
    if (error) throw error;
  
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);
  
  if (!fontsLoaded && !error) {
    return null;
  }
  

  return (
    <LocationProvider>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#F4F1EC' } }}>
        <Stack.Screen name="index" options ={{ headerShown: false}} />
        <Stack.Screen name="(auth)" options ={{ headerShown: false}} />
        <Stack.Screen name="(tabs)" options ={{ headerShown: false}} />
        <Stack.Screen name="(extras)" options ={{ headerShown: false}} />
      </Stack>
    </LocationProvider>
  );
}
