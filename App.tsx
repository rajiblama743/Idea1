import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Navigation from '@/navigation';
import { sqliteService } from '@/services/sqlite';
import { tillService } from '@/services/tillService';
import { colors } from '@/constants/colors';

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading...</Text>
  </View>
);

const ErrorScreen = ({ error }: { error: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <Text style={{ fontSize: 18, color: colors.error, textAlign: 'center', marginBottom: 16 }}>
      Initialization Error
    </Text>
    <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 }}>
      {error}
    </Text>
  </View>
);

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('App: Component mounted');
    
    // Initialize SQLite database
    const initializeApp = async () => {
      try {
        // Initialize SQLite database
        await sqliteService.initDatabase();
        await tillService.clearAllData();
        setDbInitialized(true);
      } catch (error: any) {
        console.error('App: Failed to initialize app:', error);
        setError(`Initialization failed: ${error.message}`);
        // Continue anyway but log the error
        setDbInitialized(true);
      }
    };

    initializeApp();
  }, []);

  console.log('App: Render state', { dbInitialized, error });

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (!dbInitialized) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Navigation />
    </SafeAreaProvider>
  );
} 