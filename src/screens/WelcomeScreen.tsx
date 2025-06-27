import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/navigation/index';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

export default function WelcomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>👋 Welcome to I1</Text>
      <Text style={styles.slogan}>Formulate. Calculate. Visualize. Your ideas, empowered.</Text>
      <View style={styles.featuresContainer}>
        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('TillFormulation')}>
          <Ionicons name="construct" size={40} color={colors.primary} style={styles.icon} />
          <Text style={styles.featureTitle}>Till Formulation</Text>
          <Text style={styles.featureDesc}>Design, organize, and structure your till sessions and formulas.</Text>
          <View style={styles.featureButton}>
            <Text style={styles.featureButtonText}>Go to Formulation</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('TillCalculation')}>
          <Ionicons name="calculator" size={40} color={colors.secondary} style={styles.icon} />
          <Text style={styles.featureTitle}>Till Calculation</Text>
          <Text style={styles.featureDesc}>Input values and perform calculations based on your formulations.</Text>
          <View style={[styles.featureButton, { backgroundColor: colors.secondary }] }>
            <Text style={styles.featureButtonText}>Go to Calculation</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  slogan: {
    fontSize: 16,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 28,
    textAlign: 'center',
  },
  featuresContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 24,
  },
  featureCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 18,
    textAlign: 'center',
  },
  featureButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  featureButtonText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 