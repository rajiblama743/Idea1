import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, Modal, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tillService } from '@/services/tillService';
import { Till, Session, SubSession, CalculationInput, CalculationResult, Formula } from '@/types';

export default function TillCalculationScreen() {
  const navigation = useNavigation();
  const [tills, setTills] = useState<Till[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [selectedTill, setSelectedTill] = useState<Till | null>(null);
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const userTills = await tillService.getTills();
      console.log('TillCalculationScreen: Loaded tills from service:', userTills.length);
      userTills.forEach(till => {
        console.log('Till:', till.name, 'sessions:', till.sessions.length);
        till.sessions.forEach(session => {
          console.log('  Session:', session.name, 'subsessions:', session.subSessions?.length || 0);
        });
      });
      setTills(userTills);
      setLoading(false);
    };
    load();
  }, []);

  const handleStartCalculation = (till: Till) => {
    setSelectedTill(till);
    setInputValues({});
    setShowCalcModal(true);
  };

  const handleInputChange = (key: string, value: string) => {
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  // Collect inputs for all sessions and sub-sessions in a till
  const collectInputs = (till: Till): CalculationInput[] => {
    const inputs: CalculationInput[] = [];
    till.sessions.forEach((session: Session) => {
      if (inputValues[session.id]) {
        inputs.push({ sessionId: session.id, value: parseFloat(inputValues[session.id]) || 0 });
      }
      const addSubInputs = (subs: SubSession[], parentId: string) => {
        subs.forEach((sub: SubSession) => {
          const key = `${parentId}_${sub.id}`;
          if (inputValues[key]) {
            inputs.push({ sessionId: parentId, subSessionId: sub.id, value: parseFloat(inputValues[key]) || 0 });
          }
          if (sub.subSessions && sub.subSessions.length > 0) {
            addSubInputs(sub.subSessions, parentId);
          }
        });
      };
      addSubInputs(session.subSessions, session.id);
    });
    return inputs;
  };

  const handleCalculate = async () => {
    if (!selectedTill) return;
    try {
      const inputs = collectInputs(selectedTill);
      const result = tillService.calculateTill(selectedTill, inputs);
      setCalcResult(result);
      setShowCalcModal(false);
      setShowResultModal(true);
      // Save calculation to history (use tillId and tillName for compatibility)
      await tillService.createCalculation({
        userId: 'guest',
        sessionId: selectedTill.id,
        sessionName: selectedTill.name,
        inputs,
        results: [result],
        totalResult: result.calculatedValue,
      });
      setResultSaved(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to calculate.');
    }
  };

  // Render input fields for all sessions and sub-sessions in a till
  const renderInputFields = (till: Till): JSX.Element[] => {
    const fields: JSX.Element[] = [];
    console.log('Rendering input fields for till:', till.name, 'with sessions:', till.sessions.length);
    
    till.sessions.forEach((session: Session) => {
      console.log('Processing session:', session.name, 'has formula:', !!session.formula);
      if (!session.formula) {
        fields.push(
          <View key={session.id} style={styles.inputField}>
            <Text style={styles.inputLabel}>{session.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter value"
              value={inputValues[session.id] || ''}
              onChangeText={v => handleInputChange(session.id, v)}
              keyboardType="numeric"
            />
          </View>
        );
      }
      const addSubFields = (subs: SubSession[], parentId: string, level: number) => {
        subs.forEach((sub: SubSession) => {
          console.log('Processing subsession:', sub.name, 'has formula:', !!sub.formula);
          const key = `${parentId}_${sub.id}`;
          if (!sub.formula) {
            fields.push(
              <View key={key} style={[styles.inputField, { marginLeft: level * 20 }] }>
                <Text style={styles.inputLabel}>{sub.name}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter value"
                  value={inputValues[key] || ''}
                  onChangeText={v => handleInputChange(key, v)}
                  keyboardType="numeric"
                />
              </View>
            );
          }
          if (sub.subSessions && sub.subSessions.length > 0) {
            addSubFields(sub.subSessions, parentId, level + 1);
          }
        });
      };
      addSubFields(session.subSessions, session.id, 1);
    });
    
    console.log('Total input fields rendered:', fields.length);
    return fields;
  };

  // Helper to find a subsession name by id recursively
  const findSubSessionName = (sessions: Session[], subSessionId: string): string => {
    for (const session of sessions) {
      const stack = [...(session.subSessions || [])];
      while (stack.length) {
        const sub = stack.pop() as SubSession;
        if (sub.id === subSessionId) return sub.name;
        if (sub.subSessions && sub.subSessions.length > 0) {
          stack.push(...sub.subSessions);
        }
      }
    }
    return subSessionId;
  };

  // Helper to render a human-readable formula string
  const renderFormula = (formula: Formula, result: CalculationResult, allSessions: Session[]): string => {
    if (!formula) return '';
    if (!formula.operands || formula.operands.length === 0) return 'No operands';
    const opSymbol = (op: string) => {
      switch (op) {
        case 'add': return '+';
        case 'subtract': return '-';
        case 'multiply': return '\u00d7';
        case 'divide': return '\u00f7';
        default: return '?';
      }
    };
    const parts = formula.operands.map((operand: any, idx: number) => {
      let label = '';
      if (operand.type === 'input') {
        label = 'input';
      }
      if (operand.type === 'session') {
        const s = allSessions?.find((s: Session) => s.id === operand.value);
        label = s && s.name ? s.name : operand.value;
      }
      if (operand.type === 'subsession') {
        label = findSubSessionName(allSessions, operand.value);
      }
      return `${idx > 0 ? ' ' + opSymbol(operand.operation) + ' ' : ''}${label}`;
    });
    return parts.join('');
  };

  const renderResult = (result: CalculationResult, level = 0): JSX.Element => {
    const hasFormula = !!result.formula;
    const formulaString = hasFormula ? renderFormula(result.formula as Formula, result, selectedTill?.sessions || []) : null;
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
        {hasFormula && formulaString && (
          <Text style={{ color: '#888', fontSize: 13, marginBottom: 2 }}>
            Formula: {formulaString}
          </Text>
        )}
        <Text style={{ color: '#333', fontSize: 15, marginBottom: 2 }}>
          Result: {result.calculatedValue}
        </Text>
        {result.subResults && result.subResults.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {result.subResults.map(sub => renderResult(sub, level + 1))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Loading tills...</Text>
      </View>
    );
  }

  if (tills.length === 0) {
    return (
      <View style={{ padding: 20 }}>
        <Text>No tills found. Create a till first in Till Formulation.</Text>
        <Button title="Go to Till Formulation" onPress={() => navigation.navigate('TillFormulation' as never)} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', margin: 16 }}>Till Calculation</Text>
      {loading ? (
        <Text style={{ margin: 16 }}>Loading...</Text>
      ) : tills.length === 0 ? (
        <View style={{ margin: 16 }}>
          <Text>No tills found. Create a till first in Till Formulation.</Text>
          <Button title="Go to Till Formulation" onPress={() => navigation.navigate('TillFormulation' as never)} />
        </View>
      ) : (
        <View style={{ margin: 16 }}>
          {tills.map(till => (
            <TouchableOpacity
              key={till.id}
              style={{
                backgroundColor: '#f8f9fa',
                borderRadius: 10,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}
              onPress={() => handleStartCalculation(till)}
            >
              <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{till.name}</Text>
              {till.description ? (
                <Text style={{ color: '#888', fontSize: 14 }}>{till.description}</Text>
              ) : null}
              <Text style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                {till.sessions.length} Sessions
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* Calculation Modal */}
      <Modal visible={showCalcModal} animationType="slide" onRequestClose={() => setShowCalcModal(false)}>
        <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', margin: 16 }}>Calculate Till: {selectedTill?.name}</Text>
          {selectedTill && (
            <>
              {renderInputFields(selectedTill).length > 0 ? (
                renderInputFields(selectedTill)
              ) : (
                <View style={{ margin: 16, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
                  <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
                    No input fields available. This till only contains formulas.
                  </Text>
                  <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8 }}>
                    You can still calculate using the formulas defined in the sessions.
                  </Text>
                </View>
              )}
            </>
          )}
          <View style={{ margin: 16 }}>
            <Button title="Calculate" onPress={handleCalculate} />
            <Button title="Cancel" color="#888" onPress={() => setShowCalcModal(false)} />
          </View>
        </ScrollView>
      </Modal>
      {/* Result Modal */}
      <Modal visible={showResultModal} animationType="slide" onRequestClose={() => setShowResultModal(false)}>
        <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', margin: 16 }}>Calculation Result</Text>
          {calcResult && renderResult(calcResult)}
          <View style={{ margin: 16 }}>
            <Button title="Close" onPress={() => setShowResultModal(false)} />
          </View>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inputField: { marginBottom: 15 },
  inputLabel: { fontWeight: 'bold', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '90%', maxWidth: 400 },
  modalTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 15 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelButton: { backgroundColor: '#eee' },
  confirmButton: { backgroundColor: '#007bff' },
  cancelButtonText: { color: '#333', fontWeight: 'bold' },
  confirmButtonText: { color: '#fff', fontWeight: 'bold' },
}); 