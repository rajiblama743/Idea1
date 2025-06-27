import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/constants/colors';

const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Redirect to Till Formulation screen since that's the main feature
    navigation.navigate('TillFormulation' as never);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting to Till Formulation...</Text>
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

export default CreatePostScreen; 