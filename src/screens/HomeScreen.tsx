import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/constants/colors';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Redirect to Till Calculation screen since that's the main feature
    navigation.navigate('TillCalculation' as never);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting to Till Calculation...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    fontSize: 16,
    color: colors.text,
  },
});

export default HomeScreen; 