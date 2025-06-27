import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Till, Formula, FormulaOperand } from '@/types';
import { Ionicons } from '@expo/vector-icons';

// Define navigation param type
// (You may need to adjust this based on your navigation setup)
type TillDetailScreenRouteProp = RouteProp<{ params: { till: Till, onTillUpdate?: (till: Till) => void } }, 'params'>;

// Helper to flatten all sub-sessions in all sessions
function getAllSubSessions(sessions) {
  const result = [];
  function recurse(subSessions, parentName = '') {
    subSessions.forEach(sub => {
      result.push({ id: sub.id, name: parentName ? `${parentName} > ${sub.name}` : sub.name });
      if (sub.subSessions && sub.subSessions.length > 0) {
        recurse(sub.subSessions, parentName ? `${parentName} > ${sub.name}` : sub.name);
      }
    });
  }
  sessions.forEach(session => {
    recurse(session.subSessions, session.name);
  });
  return result;
}

// Helper to get operand display name
function getOperandDisplayName(operand, till) {
  if (operand.type === 'input') return operand.value;
  if (operand.type === 'session') {
    return till.sessions.find(s => s.id === operand.value)?.name || operand.value;
  }
  if (operand.type === 'subsession') {
    const allSubs = getAllSubSessions(till.sessions);
    return allSubs.find(sub => sub.id === operand.value)?.name || operand.value;
  }
  return operand.value;
}

const TillDetailScreen: React.FC = () => {
  const route = useRoute<TillDetailScreenRouteProp>();
  const { till: initialTill, onTillUpdate } = route.params;
  const [till, setTill] = useState<Till>(initialTill);
  const tillId = initialTill.id;
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [showSubSessionModal, setShowSubSessionModal] = useState(false);
  const [subSessionName, setSubSessionName] = useState('');
  const [subSessionDescription, setSubSessionDescription] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [editSessionDescription, setEditSessionDescription] = useState('');
  const [showEditSubSessionModal, setShowEditSubSessionModal] = useState(false);
  const [editSubSessionId, setEditSubSessionId] = useState<string | null>(null);
  const [editSubSessionName, setEditSubSessionName] = useState('');
  const [editSubSessionDescription, setEditSubSessionDescription] = useState('');
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [formulaSessionId, setFormulaSessionId] = useState<string | null>(null);
  const [formulaOperands, setFormulaOperands] = useState<FormulaOperand[]>([]);
  const [showOperandTypeSelector, setShowOperandTypeSelector] = useState<{index: number, visible: boolean}>({index: -1, visible: false});
  const [showOperatorSelector, setShowOperatorSelector] = useState<{index: number, visible: boolean}>({index: -1, visible: false});
  const [showSessionDropdown, setShowSessionDropdown] = useState<number | -1>(-1);
  const [showSubSessionDropdown, setShowSubSessionDropdown] = useState<number | -1>(-1);

  const navigation = useNavigation();

  const handleCreateSession = () => {
    if (!sessionName.trim()) {
      Alert.alert('Error', 'Please enter a session name');
      return;
    }
    const newSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'guest',
      name: sessionName.trim(),
      description: sessionDescription.trim() || undefined,
      order: till.sessions.length,
      subSessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isSynced: false,
    };
    const updatedTill = { ...till, sessions: [...till.sessions, newSession] };
    setTill(updatedTill);
    onTillUpdate && onTillUpdate(updatedTill);
    setSessionName('');
    setSessionDescription('');
    setShowSessionModal(false);
    Alert.alert('Success', 'Session created successfully!');
  };

  const handleOpenSubSessionModal = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSubSessionName('');
    setSubSessionDescription('');
    setShowSubSessionModal(true);
  };

  const handleCreateSubSession = () => {
    if (!subSessionName.trim() || !selectedSessionId) {
      Alert.alert('Error', 'Please enter a sub-session name');
      return;
    }
    const newSubSession = {
      id: `subsession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: subSessionName.trim(),
      description: subSessionDescription.trim() || undefined,
      order: till.sessions.find(s => s.id === selectedSessionId)?.subSessions.length || 0,
      subSessions: [],
    };
    const updatedTill = {
      ...till,
      sessions: till.sessions.map(session =>
        session.id === selectedSessionId
          ? { ...session, subSessions: [...(session.subSessions || []), newSubSession] }
          : session
      ),
    };
    setTill(updatedTill);
    onTillUpdate && onTillUpdate(updatedTill);
    setShowSubSessionModal(false);
    setSubSessionName('');
    setSubSessionDescription('');
    setSelectedSessionId(null);
    Alert.alert('Success', 'Sub-session created successfully!');
  };

  const handleEditSession = (session: any) => {
    setEditSessionId(session.id);
    setEditSessionName(session.name);
    setEditSessionDescription(session.description || '');
    setShowEditSessionModal(true);
  };

  const handleSaveEditSession = () => {
    if (!editSessionId) return;
    const updatedTill = {
      ...till,
      sessions: till.sessions.map(session =>
        session.id === editSessionId
          ? { ...session, name: editSessionName, description: editSessionDescription }
          : session
      ),
    };
    setTill(updatedTill);
    onTillUpdate && onTillUpdate(updatedTill);
    setShowEditSessionModal(false);
    setEditSessionId(null);
    setEditSessionName('');
    setEditSessionDescription('');
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this session and all its sub-sessions?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        const updatedTill = {
          ...till,
          sessions: till.sessions.map(session =>
            session.id === sessionId
              ? { ...session, subSessions: [] }
              : session
          ),
        };
        setTill(updatedTill);
        onTillUpdate && onTillUpdate(updatedTill);
      }},
    ]);
  };

  const handleEditSubSession = (sessionId: string, sub: any) => {
    setSelectedSessionId(sessionId);
    setEditSubSessionId(sub.id);
    setEditSubSessionName(sub.name);
    setEditSubSessionDescription(sub.description || '');
    setShowEditSubSessionModal(true);
  };

  const handleSaveEditSubSession = () => {
    if (!selectedSessionId || !editSubSessionId) return;
    const updatedTill = {
      ...till,
      sessions: till.sessions.map(session =>
        session.id === selectedSessionId
          ? {
              ...session,
              subSessions: session.subSessions.map(sub =>
                sub.id === editSubSessionId
                  ? { ...sub, name: editSubSessionName, description: editSubSessionDescription }
                  : sub
              ),
            }
          : session
      ),
    };
    setTill(updatedTill);
    onTillUpdate && onTillUpdate(updatedTill);
    setShowEditSubSessionModal(false);
    setEditSubSessionId(null);
    setEditSubSessionName('');
    setEditSubSessionDescription('');
    setSelectedSessionId(null);
  };

  const handleDeleteSubSession = (sessionId: string, subSessionId: string) => {
    Alert.alert('Delete Sub-session', 'Are you sure you want to delete this sub-session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        const updatedTill = {
          ...till,
          sessions: till.sessions.map(session =>
            session.id === sessionId
              ? {
                  ...session,
                  subSessions: session.subSessions.filter(sub => sub.id !== subSessionId),
                }
              : session
          ),
        };
        setTill(updatedTill);
        onTillUpdate && onTillUpdate(updatedTill);
      }},
    ]);
  };

  const handleOpenFormulaModal = (sessionId: string, existingFormula?: Formula) => {
    setFormulaSessionId(sessionId);
    setFormulaOperands(existingFormula ? [...existingFormula.operands] : []);
    setShowFormulaModal(true);
  };

  const handleSaveFormula = () => {
    if (!formulaSessionId) return;
    const formulaId = 'formula_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const updatedTill = {
      ...till,
      sessions: till.sessions.map(session =>
        session.id === formulaSessionId
          ? { ...session, formula: { id: session.formula?.id || formulaId, operands: formulaOperands } }
          : session
      ),
    };
    setTill(updatedTill);
    onTillUpdate && onTillUpdate(updatedTill);
    setShowFormulaModal(false);
    setFormulaSessionId(null);
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
        <Text style={styles.title}>{till?.name}</Text>
        {till?.description ? <Text style={styles.description}>{till.description}</Text> : null}
        <Text style={styles.sectionTitle}>Sessions</Text>
        {till?.sessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions yet. Use the button below to add one.</Text>
        ) : (
          till.sessions.map(session => (
            <View key={session.id} style={styles.sessionItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SessionDetail', {
                    session,
                    tillId: till.id,
                    tillSessions: till.sessions,
                    onSessionUpdate: (updatedSession: Session) => {
                      const updatedTill = {
                        ...till,
                        sessions: till.sessions.map(s => s.id === updatedSession.id ? updatedSession : s),
                      };
                      setTill(updatedTill);
                      onTillUpdate && onTillUpdate(updatedTill);
                    }
                  })}
                  style={{ flex: 1 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sessionName}>{session.name}</Text>
                  {session.description ? <Text style={styles.sessionDescription}>{session.description}</Text> : null}
                  {session.formula && (
                    <Text style={{ color: '#4F8EF7', marginTop: 4, fontSize: 13 }}>
                      Formula: {session.formula.operands.map((op, i) =>
                        `${i > 0 ? ` ${op.operation === 'add' ? '+' : op.operation === 'subtract' ? '-' : op.operation === 'multiply' ? '\u00d7' : '\u00f7'} ` : ''}${getOperandDisplayName(op, till)}`
                      ).join('')}
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => handleEditSession(session)}>
                    <Ionicons name="create-outline" size={20} color="#4F8EF7" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleOpenFormulaModal(session.id, session.formula)}>
                    <Ionicons name="calculator-outline" size={20} color="#2a2a6a" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteSession(session.id)}>
                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
        <TouchableOpacity style={styles.createButton} onPress={() => setShowSessionModal(true)}>
          <Text style={styles.createButtonText}>+ Create New Session</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Session Creation Modal */}
      <Modal visible={showSessionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Session</Text>
            <TextInput
              style={styles.input}
              placeholder="Session Name"
              value={sessionName}
              onChangeText={setSessionName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={sessionDescription}
              onChangeText={setSessionDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSessionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateSession}
              >
                <Text style={styles.confirmButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      {/* Edit Session Modal */}
      <Modal visible={showEditSessionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Session</Text>
            <TextInput
              style={styles.input}
              placeholder="Session Name"
              value={editSessionName}
              onChangeText={setEditSessionName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={editSessionDescription}
              onChangeText={setEditSessionDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditSessionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveEditSession}
              >
                <Text style={styles.confirmButtonText}>Save</Text>
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
                {op.type === 'session' && till ? (
                  <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 6 }}>
                    <TouchableOpacity onPress={() => setShowSessionDropdown(i)} style={{ padding: 4, minWidth: 100 }}>
                      <Text>{till.sessions.find(s => s.id === op.value)?.name || 'Select Session'}</Text>
                    </TouchableOpacity>
                    {showSessionDropdown === i && (
                      <View style={{ position: 'absolute', top: 30, left: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, zIndex: 20 }}>
                        {till.sessions.map(session => (
                          <TouchableOpacity key={session.id} style={{ padding: 8 }} onPress={() => { handleOperandChange(i, 'value', session.id); setShowSessionDropdown(-1); }}>
                            <Text>{session.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ) : null}
                {op.type === 'subsession' && till ? (
                  <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 6 }}>
                    <TouchableOpacity onPress={() => setShowSubSessionDropdown(i)} style={{ padding: 4, minWidth: 120 }}>
                      <Text>{getAllSubSessions(till.sessions).find(sub => sub.id === op.value)?.name || 'Select Sub-session'}</Text>
                    </TouchableOpacity>
                    {showSubSessionDropdown === i && (
                      <View style={{ position: 'absolute', top: 30, left: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, zIndex: 20 }}>
                        {getAllSubSessions(till.sessions).map(sub => (
                          <TouchableOpacity key={sub.id} style={{ padding: 8 }} onPress={() => { handleOperandChange(i, 'value', sub.id); setShowSubSessionDropdown(-1); }}>
                            <Text>{sub.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ) : null}
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
  sessionItem: {
    backgroundColor: '#f8f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  sessionName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#222',
  },
  sessionDescription: {
    color: '#888',
    fontSize: 13,
  },
  createButton: {
    backgroundColor: '#2a2a6a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2a2a6a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#eee',
  },
  confirmButton: {
    backgroundColor: '#2a2a6a',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default TillDetailScreen; 