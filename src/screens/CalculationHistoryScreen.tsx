import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { tillService } from '@/services/tillService';
import { Calculation } from '@/types';

export default function CalculationHistoryScreen() {
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const load = async () => {
        setLoading(true);
        let data = await tillService.getCalculations('guest');
        // Sort by createdAt descending
        data = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (isActive) {
          setCalculations(data);
          setLoading(false);
        }
      };
      load();
      return () => { isActive = false; };
    }, [])
  );

  if (loading) {
    return <View style={styles.center}><Text>Loading...</Text></View>;
  }

  if (calculations.length === 0) {
    return <View style={styles.center}><Text>No calculation history found.</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      {calculations.map(calc => (
        <TouchableOpacity
          key={calc.id}
          style={styles.card}
          onPress={() => navigation.navigate('CalculationResultDetail', { calculation: calc })}
        >
          <Text style={styles.title}>{calc.sessionName}</Text>
          <Text style={styles.date}>{new Date(calc.createdAt).toLocaleString()}</Text>
          <Text style={styles.result}>Result: {calc.totalResult}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  date: { color: '#888', fontSize: 13, marginBottom: 6 },
  result: { color: '#007bff', fontWeight: 'bold', fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
}); 