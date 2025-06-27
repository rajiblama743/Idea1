import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, Modal, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

  useFocusEffect(
    React.useCallback(() => {
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
    }, [])
  );

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
  const renderInputFields = (till: Till): React.ReactElement[] => {
    const fields: React.ReactElement[] = [];
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
                <View style={styles.inputLabelContainer}>
                  <Text style={styles.inputLabel}>{sub.name}</Text>
                  <Text style={styles.sessionLabel}>in {session.name}</Text>
                </View>
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

  // Helper to get the created date/time for the current calculation result
  const getCalcCreatedAt = () => {
    if (calcResult && (calcResult as any).createdAt) {
      const d = new Date((calcResult as any).createdAt);
      return d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    return '';
  };

  // Restore the original beautiful card-based, modern, and hierarchical result UI
  const renderResult = (result: CalculationResult, level = 0, key?: string): React.ReactElement => {
    const hasFormula = !!result.formula;
    const formulaString = hasFormula ? renderFormula(result.formula as Formula, result, selectedTill?.sessions || []) : null;
    // Find the session name for subsessions
    let sessionName = '';
    if (result.subSessionId && selectedTill) {
      const session = selectedTill.sessions.find(s => s.id === result.sessionId);
      sessionName = session?.name || '';
    }
    // Show date/time only for the top-level (till) result, below the name
    let createdAtString = '';
    if (level === 0) {
      let date: Date;
      if (calcResult && (calcResult as any).createdAt) {
        date = new Date((calcResult as any).createdAt);
      } else {
        date = new Date();
      }
      createdAtString = date.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    return (
      <View
        key={key || (result.sessionId + (result.subSessionId || ''))}
        style={[
          styles.resultCard,
          {
            marginLeft: level * 24,
            marginBottom: 16,
            backgroundColor: level === 0 ? '#f8f9fa' : '#fff',
            borderLeftWidth: level === 0 ? 6 : 0,
            borderLeftColor: '#007bff',
            shadowOpacity: 0.12,
          },
        ]}
      >
        <View style={styles.resultHeaderRowSimple}>
          <View style={styles.resultNameContainer}>
            <Text style={styles.resultName}>{result.name}</Text>
            {level === 0 && !!createdAtString && (
              <Text style={styles.resultCreatedAt}>{createdAtString}</Text>
            )}
            {sessionName ? (
              <Text style={styles.sessionName}>in {sessionName}</Text>
            ) : null}
          </View>
          <Text style={styles.resultValueSimple}>{result.calculatedValue}</Text>
        </View>
        {(result.inputValue !== undefined || (hasFormula && formulaString)) && (
          <View style={styles.resultDetailsBoxSmall}>
            {result.inputValue !== undefined && (
              <Text style={styles.resultDetailLabelSmall}>Input: <Text style={styles.resultDetailValueSmall}>{result.inputValue}</Text></Text>
            )}
            {hasFormula && formulaString && (
              <Text style={styles.resultDetailLabelSmall}>Formula: <Text style={styles.resultDetailValueSmall}>{formulaString}</Text></Text>
            )}
          </View>
        )}
        {result.subResults && result.subResults.length > 0 && (
          <View style={styles.subResultsContainer}>
            <View style={styles.resultDivider} />
            {result.subResults.map(sub => renderResult(sub, level + 1, sub.sessionId + (sub.subSessionId || '')))}
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
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCalcModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.modalTitle}>Calculate Till</Text>
              <Text style={styles.modalSubtitle}>{selectedTill?.name}</Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedTill && (
              <>
                {renderInputFields(selectedTill).length > 0 ? (
                  <View style={styles.inputsContainer}>
                    <Text style={styles.sectionTitle}>Input Values</Text>
                    {renderInputFields(selectedTill)}
                  </View>
                ) : (
                  <View style={styles.noInputsContainer}>
                    <Text style={styles.noInputsIcon}>🧮</Text>
                    <Text style={styles.noInputsTitle}>Formula-Based Calculation</Text>
                    <Text style={styles.noInputsText}>
                      This till uses formulas for all calculations. No manual input required.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowCalcModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.calculateButton}
              onPress={handleCalculate}
            >
              <Text style={styles.calculateButtonText}>Calculate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Result Modal */}
      <Modal visible={showResultModal} animationType="slide" onRequestClose={() => setShowResultModal(false)}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowResultModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.modalTitle}>Calculation Result</Text>
              <Text style={styles.modalSubtitle}>{selectedTill?.name}</Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.resultsContainer} showsVerticalScrollIndicator={false}>
            {calcResult && (
              <View style={styles.resultsContainer}>
                {renderResult(calcResult)}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowResultModal(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inputField: { 
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  inputLabel: { 
    fontWeight: '600', 
    marginBottom: 8,
    fontSize: 16,
    color: '#333'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#333'
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '90%', maxWidth: 400 },
  modalTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 15 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelButton: { backgroundColor: '#eee', padding: 12, borderRadius: 8, flex: 1, marginRight: 8 },
  confirmButton: { backgroundColor: '#007bff' },
  cancelButtonText: { color: '#333', fontWeight: 'bold', textAlign: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa'
  },
  closeButton: { 
    padding: 8, 
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  closeButtonText: { fontSize: 18, fontWeight: 'bold', color: '#666' },
  headerContent: { flex: 1 },
  modalSubtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  inputsContainer: { padding: 20 },
  sectionTitle: { 
    fontWeight: 'bold', 
    fontSize: 20, 
    marginBottom: 16, 
    color: '#333',
    textAlign: 'center'
  },
  noInputsContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  },
  noInputsIcon: { fontSize: 48, marginBottom: 16 },
  noInputsTitle: { 
    fontWeight: 'bold', 
    fontSize: 20, 
    marginBottom: 12, 
    color: '#333',
    textAlign: 'center'
  },
  noInputsText: { 
    color: '#666', 
    fontSize: 16, 
    textAlign: 'center',
    lineHeight: 22
  },
  modalFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f8f9fa'
  },
  calculateButton: { 
    backgroundColor: '#007bff', 
    padding: 16, 
    borderRadius: 10, 
    flex: 1,
    marginLeft: 8,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  calculateButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
    textAlign: 'center'
  },
  resultsContainer: {
    padding: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    width: '100%',
  },
  resultCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },
  resultHeaderRowSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  resultNameContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  resultName: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#333',
    marginBottom: 4,
  },
  sessionName: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  resultValueSimple: {
    fontSize: 22,
    color: '#2a2a6a',
    fontWeight: '600',
    marginLeft: 16,
    textAlign: 'right',
    minWidth: 60,
  },
  resultDetailsBoxSmall: {
    marginTop: 2,
    marginBottom: 6,
    backgroundColor: '#f3f6fa',
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignSelf: 'flex-start',
    minWidth: 0,
    maxWidth: '90%',
  },
  resultDetailLabelSmall: {
    fontWeight: '500',
    fontSize: 13,
    color: '#495057',
    marginBottom: 2,
  },
  resultDetailValueSmall: {
    fontWeight: '400',
    fontSize: 13,
    color: '#222',
  },
  resultDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
    borderRadius: 1,
  },
  subResultsContainer: {
    marginTop: 0,
    paddingTop: 0,
  },
  inputLabelContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionLabel: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  resultCreatedAt: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
    textAlign: 'right',
    fontStyle: 'italic',
  },
}); 