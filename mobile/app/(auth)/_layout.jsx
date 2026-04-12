// mobile/app/(auth)/_layout.jsx — Auth stack (no tabs)
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
