// mobile/src/utils/tokenStorage.js
// Thin wrapper around expo-secure-store for JWT token management

import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY  = 'sw_access_token';
const REFRESH_KEY = 'sw_refresh_token';

export const setTokens = async (accessToken, refreshToken) => {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
  ]);
};

export const getAccessToken = async () => {
  return SecureStore.getItemAsync(ACCESS_KEY);
};

export const getRefreshToken = async () => {
  return SecureStore.getItemAsync(REFRESH_KEY);
};

export const clearTokens = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
};
