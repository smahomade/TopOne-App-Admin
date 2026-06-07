import { Stack } from 'expo-router';

export default function ExtrasLayout() {
  return (
    <Stack>
      <Stack.Screen name="location" options={{ headerShown: false }} />
    </Stack>
  );
}
