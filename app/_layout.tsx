import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import FlashMessage from 'react-native-flash-message';
import { theme } from './constants/theme';

export default function Layout() {
  return (
    <PaperProvider theme={theme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <FlashMessage position="top" />
    </PaperProvider>
  );
}