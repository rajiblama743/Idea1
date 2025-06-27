import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Session, Formula, FormulaOperand } from '@/types';
import { Ionicons } from '@expo/vector-icons';

// Define navigation param type
// (You may need to adjust this based on your navigation setup)
type SessionDetailScreenRouteProp = RouteProp<{ params: { session: Session; tillId?: string; tillSessions?: Session[]; onSessionUpdate?: (updatedSession: Session) => void } }, 'params'>;

// Helper to flatten all sub-sessions in a session
function getAllSubSessions(subSessions: any[], parentName = ''): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  function recurse(subSessions: any[], parentName: string) {
    subSessions.forEach((sub: any) => {
      result.push({ id: sub.id, name: parentName ? `${parentName} > ${sub.name}` : sub.name });
      if (sub.subSessions && sub.subSessions.length > 0) {
        recurse(sub.subSessions, parentName ? `${parentName} > ${sub.name}` : sub.name);
      }
    });
  }
  recurse(subSessions, parentName);
  return result;
}

// Helper to get operand display name
function getOperandDisplayName(operand, tillSessions, session) {
  if (operand.type === 'input') return operand.value;
  if (operand.type === 'session') {
    return tillSessions?.find((s: any) => s.id === operand.value)?.name || operand.value;
  }
  if (operand.type === 'subsession') {
    const allSubs = getAllSubSessions(session.subSessions);
    return allSubs.find(sub => sub.id === operand.value)?.name || operand.value;
  }
  return operand.value;
}

const SessionDetailScreen: React.FC = () => {
  const route = useRoute<SessionDetailScreenRouteProp>();
  const { session: initialSession, tillId, tillSessions = [], onSessionUpdate } = route.params;
  const [session, setSession] = useState<Session>(initialSession);
  const [showSubSessionModal, setShowSubSessionModal] = useState(false);
  const [subSessionName, setSubSessionName] = useState('');
  const [subSessionDescription, setSubSessionDescription] = useState('');
  const [showEditSubSessionModal, setShowEditSubSessionModal] = useState(false);
  const [editSubSessionId, setEditSubSessionId] = useState<string | null>(null);
  const [editSubSessionName, setEditSubSessionName] = useState('');
  const [editSubSessionDescription, setEditSubSessionDescription] = useState('');
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [formulaSubSessionId, setFormulaSubSessionId] = useState<string | null>(null);
  const [formulaOperands, setFormulaOperands] = useState<FormulaOperand[]>([]);
  const [showOperandTypeSelector, setShowOperandTypeSelector] = useState<{index: number, visible: boolean}>({index: -1, visible: false});
  const [showOperatorSelector, setShowOperatorSelector] = useState<{index: number, visible: boolean}>({index: -1, visible: false});
  const [showSessionDropdown, setShowSessionDropdown] = useState<number | null>(null);
  const [showSubSessionDropdown, setShowSubSessionDropdown] = useState<number | null>(null);

  const handleCreateSubSession = () => {
    if (!subSessionName.trim()) {
      alert('Please enter a sub-session name');
      return;
    }
    const newSubSession = {
      id: `subsession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: subSessionName.trim(),
      description: subSessionDescription.trim() || undefined,
      order: session.subSessions.length,
      subSessions: [],
    };
    const updatedSession = { ...session, subSessions: [...session.subSessions, newSubSession] };
    setSession(updatedSession);
    onSessionUpdate && onSessionUpdate(updatedSession);
    setShowSubSessionModal(false);
    setSubSessionName('');
    setSubSessionDescription('');
  };

  const handleEditSubSession = (sub: any) => {
    setEditSubSessionId(sub.id);
    setEditSubSessionName(sub.name);
    setEditSubSessionDescription(sub.description || '');
    setShowEditSubSessionModal(true);
  };

  const handleSaveEditSubSession = () => {
    if (!editSubSessionId) return;
    const updatedSession = {
      ...session,
      subSessions: session.subSessions.map(sub =>
        sub.id === editSubSessionId ? {
          ...sub,
          name: editSubSessionName,
          description: editSubSessionDescription,
        } : sub
      ),
    };
    setSession(updatedSession);
    onSessionUpdate && onSessionUpdate(updatedSession);
    setShowEditSubSessionModal(false);
    setEditSubSessionId(null);
    setEditSubSessionName('');
    setEditSubSessionDescription('');
  };

  const handleDeleteSubSession = (subSessionId: string) => {
    if (!subSessionId) return;
    if (window.confirm) {
      if (!window.confirm('Are you sure you want to delete this sub-session?')) return;
    } else if (!confirm('Are you sure you want to delete this sub-session?')) return;
    const updatedSession = {
      ...session,
      subSessions: session.subSessions.filter(sub => sub.id !== subSessionId),
    };
    setSession(updatedSession);
    onSessionUpdate && onSessionUpdate(updatedSession);
  };

  const handleOpenFormulaModal = (subSessionId: string, existingFormula?: Formula) => {
    setFormulaSubSessionId(subSessionId);
    setFormulaOperands(existingFormula ? [...existingFormula.operands] : []);
    setShowFormulaModal(true);
  };

  const handleSaveFormula = () => {
    if (!formulaSubSessionId) return;
    const formulaId = 'formula_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const updatedSession = {
      ...session,
      subSessions: session.subSessions.map(sub =>
        sub.id === formulaSubSessionId
          ? { ...sub, formula: { id: sub.formula?.id || formulaId, operands: formulaOperands } }
          : sub
      ),
    };
    setSession(updatedSession);
    onSessionUpdate && onSessionUpdate(updatedSession);
    setShowFormulaModal(false);
    setFormulaSubSessionId(null);
    setFormulaOperands([]);
  };

  const handleAddOperand = () => {
    setFormulaOperands(prev => [
      ...prev,
      { type: 'input', value: '', operation: 'add' as const }
    ]);
  };

  const handleOperandChange = (index: number, field: keyof FormulaOperand, value: any) => {
    setFormulaOperands(prev => prev.map((op, i) =>
      i === index ? { ...op, [field]: value } : op
    ));
  };

  const handleRemoveOperand = (index: number) => {
    setFormulaOperands(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{session?.name}</Text>
        {session?.description ? <Text style={styles.description}>{session.description}</Text> : null}
        <Text style={styles.sectionTitle}>Sub-sessions</Text>
        {session?.subSessions.length === 0 ? (
          <Text style={styles.emptyText}>No sub-sessions yet. Use the button below to add one.</Text>
        ) : (
          session.subSessions.map(sub => (
            <View key={sub.id} style={[styles.subSessionItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View>
                <Text style={styles.subSessionName}>{sub.name}</Text>
                {sub.description ? <Text style={styles.subSessionDescription}>{sub.description}</Text> : null}
                {sub.formula && (
                  <Text style={{ color: '#4F8EF7', marginTop: 4, fontSize: 13 }}>
                    Formula: {sub.formula.operands.map((op, i) =>
                      `${i > 0 ? ` ${op.operation === 'add' ? '+' : op.operation === 'subtract' ? '-' : op.operation === 'multiply' ? '\u00d7' : '\u00f7'} ` : ''}${getOperandDisplayName(op, tillSessions, session)}`
                    ).join('')}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => handleEditSubSession(sub)}>
                  <Ionicons name="create-outline" size={18} color="#4F8EF7" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSubSession(sub.id)}>
                  <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleOpenFormulaModal(sub.id, sub.formula)}>
                  <Ionicons name="calculator-outline" size={18} color="#2a2a6a" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <TouchableOpacity style={styles.createButton} onPress={() => setShowSubSessionModal(true)}>
          <Text style={styles.createButtonText}>+ Create Sub-session</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Sub-session Creation Modal */}
      <Modal visible={showSubSessionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Sub-session</Text>
            <TextInput
              style={styles.input}
              placeholder="Sub-session Name"
              value={subSessionName}
              onChangeText={setSubSessionName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={subSessionDescription}
              onChangeText={setSubSessionDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSubSessionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateSubSession}
              >
                <Text style={styles.confirmButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Edit Sub-session Modal */}
      <Modal visible={showEditSubSessionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Sub-session</Text>
            <TextInput
              style={styles.input}
              placeholder="Sub-session Name"
              value={editSubSessionName}
              onChangeText={setEditSubSessionName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={editSubSessionDescription}
              onChangeText={setEditSubSessionDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditSubSessionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveEditSubSession}
              >
                <Text style={styles.confirmButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Formula Modal */}
      <Modal visible={showFormulaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create/Edit Formula</Text>
            {formulaOperands.map((op, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ marginRight: 6 }}>{i + 1}.</Text>
                {i > 0 && (
                  <TouchableOpacity
                    style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 4, marginRight: 6 }}
                    onPress={() => setShowOperatorSelector({index: i, visible: true})}
                  >
                    <Text>{op.operation === 'add' ? '+' : op.operation === 'subtract' ? '-' : op.operation === 'multiply' ? '\u00d7' : '\u00f7'}</Text>
                  </TouchableOpacity>
                )}
                {showOperatorSelector.visible && showOperatorSelector.index === i && i > 0 && (
                  <View style={{ position: 'absolute', top: 30, left: 40, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, zIndex: 10 }}>
                    {[
                      { op: 'add', label: '+ Add' },
                      { op: 'subtract', label: '- Subtract' },
                      { op: 'multiply', label: '\u00d7 Multiply' },
                      { op: 'divide', label: '\u00f7 Divide' },
                    ].map(option => (
                      <TouchableOpacity
                        key={option.op}
                        style={{ padding: 8 }}
                        onPress={() => {
                          handleOperandChange(i, 'operation', option.op);
                          setShowOperatorSelector({index: -1, visible: false});
                        }}
                      >
                        <Text>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 4, marginRight: 6 }}
                  onPress={() => setShowOperandTypeSelector({index: i, visible: true})}
                >
                  <Text>{op.type ? op.type.charAt(0).toUpperCase() + op.type.slice(1) : 'Select Type'}</Text>
                </TouchableOpacity>
                {showOperandTypeSelector.visible && showOperandTypeSelector.index === i && (
                  <View style={{ position: 'absolute', top: 30, left: 100, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, zIndex: 10 }}>
                    {['input', 'session', 'subsession'].map(typeOption => (
                      <TouchableOpacity
                        key={typeOption}
                        style={{ padding: 8 }}
                        onPress={() => {
                          handleOperandChange(i, 'type', typeOption);
                          handleOperandChange(i, 'value', '');
                          setShowOperandTypeSelector({index: -1, visible: false});
                        }}
                      >
                        <Text>{typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {op.type === 'input' && (
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 4, width: 80, marginRight: 6 }}
                    placeholder="Input Value"
                    value={op.value}
                    keyboardType="numeric"
                    onChangeText={text => handleOperandChange(i, 'value', text)}
                  />
                )}
                {op.type === 'session' && tillSessions.length > 0 && (
                  <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 6 }}>
                    <TouchableOpacity onPress={() => setShowSessionDropdown(i)} style={{ padding: 4, minWidth: 100 }}>
                      <Text>{tillSessions.find((s: any) => s.id === op.value)?.name || 'Select Session'}</Text>
                    </TouchableOpacity>
                    {showSessionDropdown === i && (
                      <View style={{ position: 'absolute', top: 30, left: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, zIndex: 20 }}>
                        {tillSessions.map((session: any) => (
                          <TouchableOpacity key={session.id} style={{ padding: 8 }} onPress={() => { handleOperandChange(i, 'value', session.id); setShowSessionDropdown(-1); }}>
                            <Text>{session.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
                {op.type === 'subsession' && (
                  <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 6 }}>
                    <TouchableOpacity onPress={() => setShowSubSessionDropdown(i)} style={{ padding: 4, minWidth: 120 }}>
                      <Text>{getAllSubSessions(session.subSessions).find(sub => sub.id === op.value)?.name || 'Select Sub-session'}</Text>
                    </TouchableOpacity>
                    {showSubSessionDropdown === i && (
                      <View style={{ position: 'absolute', top: 30, left: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, zIndex: 20 }}>
                        {getAllSubSessions(session.subSessions).map(sub => (
                          <TouchableOpacity key={sub.id} style={{ padding: 8 }} onPress={() => { handleOperandChange(i, 'value', sub.id); setShowSubSessionDropdown(-1); }}>
                            <Text>{sub.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
                <TouchableOpacity onPress={() => handleRemoveOperand(i)}>
                  <Ionicons name="close" size={18} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={{ marginVertical: 10 }} onPress={handleAddOperand}>
              <Text style={{ color: '#2a2a6a', fontWeight: 'bold' }}>+ Add Operand</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowFormulaModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveFormula}
              >
                <Text style={styles.confirmButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2a2a6a',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    color: '#444',
  },
  emptyText: {
    color: '#aaa',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  subSessionItem: {
    backgroundColor: '#f0f0fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  subSessionName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#222',
  },
  subSessionDescription: {
    color: '#888',
    fontSize: 13,
  },
  createButton: {
    backgroundColor: '#2a2a6a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2a2a6a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  textArea: {
    height: 100,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 4,
    backgroundColor: '#2a2a6a',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  confirmButton: {
    backgroundColor: '#2a2a6a',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a2a6a',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default SessionDetailScreen; 