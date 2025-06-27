import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calculation, CalculationResult } from '@/types';

// Helper to render the result tree (copy from TillCalculationScreen)
const renderResult = (result: CalculationResult, level = 0) => {
  const hasFormula = !!result.formula;
  return (
    <View
      key={result.sessionId + (result.subSessionId || '')}
      style={{
        marginLeft: level * 20,
        marginBottom: 12,
        backgroundColor: level === 0 ? '#f8f9fa' : '#fff',
        borderRadius: 10,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: level === 0 ? 1 : 0,
        borderColor: '#e0e0e0',
      }}
    >
      <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 4 }}>
        {result.name}
      </Text>
      {result.inputValue !== undefined && (
        <Text style={{ color: '#888', fontSize: 14, marginBottom: 2 }}>
          Input: {result.inputValue}
        </Text>
      )}
      {hasFormula && (
        <Text style={{ color: '#007bff', fontWeight: 'bold', fontSize: 15, marginBottom: 2 }}>
          Result: {result.calculatedValue}
        </Text>
      )}
      {hasFormula && (
        <Text style={{ color: '#888', fontSize: 13, fontStyle: 'italic', marginBottom: 2 }}>
          Formula used: {/* You can add formula string here if needed */}
        </Text>
      )}
      {result.subResults && result.subResults.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {result.subResults.map(sub => renderResult(sub, level + 1))}
        </View>
      )}
      {level === 0 && <View style={{ height: 1, backgroundColor: '#e0e0e0', marginTop: 10 }} />}
    </View>
  );
};

export default function CalculationResultDetailScreen() {
  const route = useRoute<RouteProp<any, any>>();
  const navigation = useNavigation();
  const calculation: Calculation = route.params?.calculation;

  if (!calculation) {
    return <View style={styles.center}><Text>No calculation found.</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => navigation.navigate('CalculationHistory' as never)}
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, backgroundColor: '#eee', borderRadius: 16, padding: 4 }}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{calculation.sessionName}</Text>
        <Text style={styles.date}>{new Date(calculation.createdAt).toLocaleString()}</Text>
        <Text style={styles.result}>Result: {calculation.totalResult}</Text>
      </View>
      <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8, marginLeft: 8 }}>Calculation Details</Text>
      {calculation.results && calculation.results.map(res => renderResult(res))}
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
    position: 'relative',
  },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  date: { color: '#888', fontSize: 13, marginBottom: 6 },
  result: { color: '#007bff', fontWeight: 'bold', fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
}); 