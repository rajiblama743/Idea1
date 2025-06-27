import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tillService } from '@/services/tillService';
import { Till, Session, SubSession, Formula, FormulaOperand } from '@/types';
import { colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteText?: string;
  onSwipeChange?: (isSwiped: boolean) => void;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ children, onDelete, deleteText = 'Delete', onSwipeChange }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteButtonWidth = 50;
  const [isSwiped, setIsSwiped] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow swiping left (negative dx)
        if (gestureState.dx < 0) {
          const newValue = Math.max(gestureState.dx, -deleteButtonWidth);
          translateX.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swipe distance is enough, open delete button
        if (gestureState.dx < -40) {
          Animated.spring(translateX, {
            toValue: -deleteButtonWidth,
            useNativeDriver: false,
          }).start();
          setIsSwiped(true);
        } else {
          // Return to original position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
          setIsSwiped(false);
        }
      },
    })
  ).current;

  const animatedStyle = {
    transform: [{ translateX }],
  };

  const deleteButtonStyle = {
    transform: [
      {
        translateX: translateX.interpolate({
          inputRange: [-deleteButtonWidth, 0],
          outputRange: [0, deleteButtonWidth],
          extrapolate: 'clamp',
        }),
      },
    ],
    opacity: translateX.interpolate({
      inputRange: [-deleteButtonWidth, -10, 0],
      outputRange: [1, 0.5, 0],
      extrapolate: 'clamp',
    }),
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const handleTapToClose = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    const listener = translateX.addListener(({ value }) => {
      const isSwiped = value < -20;
      setIsSwiped(isSwiped);
      onSwipeChange?.(isSwiped);
    });
    return () => translateX.removeListener(listener);
  }, [translateX, onSwipeChange]);

  return (
    <View style={styles.swipeableContainer} {...panResponder.panHandlers}>
      <TouchableOpacity
        style={styles.contentTouchable}
        onPress={handleTapToClose}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
      
      <Animated.View style={[styles.deleteButton, deleteButtonStyle]}>
        <TouchableOpacity
          style={styles.deleteButtonTouchable}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText} numberOfLines={1}>{deleteText}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const TillFormulationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tills, setTills] = useState<Till[]>([]);
  const mockUser = { id: 'guest', email: '', displayName: 'Guest', createdAt: new Date(), updatedAt: new Date() };
  const [currentUser, setCurrentUser] = useState(mockUser);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSubSessionModal, setShowSubSessionModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  
  // Form states
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [subSessionName, setSubSessionName] = useState('');
  const [subSessionDescription, setSubSessionDescription] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedSubSessionId, setSelectedSubSessionId] = useState<string>('');
  
  // Formula states
  const [formulaOperation, setFormulaOperation] = useState<'add' | 'subtract' | 'multiply' | 'divide'>('add');
  const [formulaOperands, setFormulaOperands] = useState<FormulaOperand[]>([]);
  const [showOperandModal, setShowOperandModal] = useState(false);
  const [editingOperandIndex, setEditingOperandIndex] = useState<number>(-1);
  const [operandType, setOperandType] = useState<'input' | 'session' | 'subsession'>('input');
  const [operandValue, setOperandValue] = useState('');
  const [selectedOperandOption, setSelectedOperandOption] = useState<string>('');
  const [operandOperation, setOperandOperation] = useState<'add' | 'subtract' | 'multiply' | 'divide'>('add');
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [expandedSubSessions, setExpandedSubSessions] = useState<{ [id: string]: boolean }>({});

  // Add state for Till creation modal
  const [showTillModal, setShowTillModal] = useState(false);
  const [tillName, setTillName] = useState('');
  const [tillDescription, setTillDescription] = useState('');

  // Add state for Edit Till modal
  const [showEditTillModal, setShowEditTillModal] = useState(false);
  const [editTillId, setEditTillId] = useState<string | null>(null);
  const [editTillName, setEditTillName] = useState('');
  const [editTillDescription, setEditTillDescription] = useState('');

  const [formulaTillId, setFormulaTillId] = useState<string | null>(null);

  // Add state for operand type selector
  const [showOperandTypeSelector, setShowOperandTypeSelector] = useState<{index: number, visible: boolean}>({index: -1, visible: false});

  // Add state for operator selector
  const [showOperatorSelector, setShowOperatorSelector] = useState<{index: number, visible: boolean}>({index: -1, visible: false});

  // Add state for session dropdown
  const [showSessionDropdown, setShowSessionDropdown] = useState<number | -1>(-1);

  // Add state for sub-session dropdown
  const [showSubSessionDropdown, setShowSubSessionDropdown] = useState<number | -1>(-1);

  const loadTills = async () => {
    console.log('TillFormulationScreen.loadTills(): starting to load tills');
    if (!currentUser) {
      // For guest users, load tills from service
      try {
        const userTills = await tillService.getTills();
        console.log('TillFormulationScreen.loadTills(): loaded tills for guest:', userTills.length);
        console.log('TillFormulationScreen.loadTills(): loaded tills:', userTills.map(t => ({ id: t.id, name: t.name })));
        
        // Remove duplicates based on ID
        const uniqueTills = userTills.filter((till, index, self) => 
          index === self.findIndex(t => t.id === till.id)
        );
        
        if (uniqueTills.length !== userTills.length) {
          console.log('TillFormulationScreen.loadTills(): removed duplicates, original:', userTills.length, 'unique:', uniqueTills.length);
        }
        
        setTills(uniqueTills);
      } catch (error) {
        console.error('Error loading tills:', error);
        setTills([]);
      }
    } else {
      // For signed-in users, load tills from service
      try {
        const userTills = await tillService.getTills();
        console.log('TillFormulationScreen.loadTills(): loaded tills for user:', userTills.length);
        setTills(userTills);
      } catch (error) {
        console.error('Error loading tills:', error);
        setTills([]);
      }
    }
    setLoading(false);
  };

  const createTemporarySession = (name: string, description?: string): Session => {
    return {
      id: `temp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'guest',
      name: name.trim(),
      description: description?.trim() || undefined,
      order: tills.length,
      subSessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isSynced: false,
    };
  };

  const createTemporarySubSession = (name: string, description?: string): SubSession => {
    return {
      id: `temp_subsession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description?.trim() || undefined,
      order: 0,
      subSessions: [],
    };
  };

  const resetOperandForm = () => {
    setOperandType('input');
    setOperandValue('');
    setSelectedOperandOption('');
    setOperandOperation('add');
  };

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      Alert.alert('Error', 'Please enter a session name');
      return;
    }

    if (currentUser) {
      // Signed-in user: save permanently
      try {
        const newSession: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'> = {
          userId: currentUser.id,
          name: sessionName.trim(),
          description: sessionDescription.trim() || undefined,
          order: tills.length,
          subSessions: [],
        };

        await tillService.createSession(newSession);
        setSessionName('');
        setSessionDescription('');
        setShowSessionModal(false);
        loadTills();
        Alert.alert('Success', 'Session created and saved successfully!');
      } catch (error) {
        console.error('Error creating session:', error);
        Alert.alert('Error', 'Failed to create session');
      }
    } else {
      // Guest user: create temporary session
      const tempSession = createTemporarySession(sessionName, sessionDescription);
      setTills(prev => [...prev, tempSession]);
      setSessionName('');
      setSessionDescription('');
      setShowSessionModal(false);
      Alert.alert(
        'Session Created (Temporary)', 
        'Your session has been created but will not be saved. Sign in to save your work permanently.',
        [
          { text: 'Continue', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => navigation.navigate('Login' as never)
          }
        ]
      );
    }
  };

  const handleCreateSubSession = async () => {
    if (!subSessionName.trim()) {
      Alert.alert('Error', 'Please enter a sub-session name');
      return;
    }

    if (currentUser) {
      // Signed-in user: save permanently
      try {
        const newSubSession: Omit<SubSession, 'id' | 'parentId'> = {
          name: subSessionName.trim(),
          description: subSessionDescription.trim() || undefined,
          order: 0,
          subSessions: [],
        };

        await tillService.addSubSession(selectedParentId, newSubSession);
        setSubSessionName('');
        setSubSessionDescription('');
        setShowSubSessionModal(false);
        loadTills();
        Alert.alert('Success', 'Sub-session created and saved successfully!');
      } catch (error) {
        console.error('Error creating sub-session:', error);
        Alert.alert('Error', 'Failed to create sub-session');
      }
    } else {
      // Guest user: create temporary sub-session
      const tempSubSession = createTemporarySubSession(subSessionName, subSessionDescription);
      // Recursively add to the correct parent (session or subsession)
      function addSubSessionRecursive(sessions: any[], parentId: string, newSub: any): any[] {
        return sessions.map(item => {
          if (item.id === parentId) {
            return { ...item, subSessions: [...item.subSessions, newSub] };
          }
          return { ...item, subSessions: addSubSessionRecursive(item.subSessions || [], parentId, newSub) };
        });
      }
      setTills(prev => addSubSessionRecursive(prev, selectedParentId, tempSubSession));
      setSubSessionName('');
      setSubSessionDescription('');
      setShowSubSessionModal(false);
      Alert.alert(
        'Sub-Session Created (Temporary)', 
        'Your sub-session has been created but will not be saved. Sign in to save your work permanently.',
        [
          { text: 'Continue', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => navigation.navigate('Login' as never)
          }
        ]
      );
    }
  };

  const getOperandDisplayName = (operand: FormulaOperand, currentTill: Till): string => {
    if (operand.type === 'input') {
      return operand.value;
    }
    
    if (operand.type === 'session') {
      return currentTill?.sessions.find(s => s.id === operand.value)?.name || operand.value;
    }
    
    if (operand.type === 'subsession') {
      const allSubs = getAllSubSessions(currentTill?.sessions || []);
      return allSubs.find(sub => sub.id === operand.value)?.name || operand.value;
    }
    
    return operand.value;
  };

  const getAvailableOperands = (): Array<{ id: string; name: string; type: 'session' | 'subsession' }> => {
    const options: Array<{ id: string; name: string; type: 'session' | 'subsession' }> = [];
    
    // Add all sessions
    tills.forEach(session => {
      options.push({ id: session.id, name: session.name, type: 'session' });
    });
    
    // Add all sub-sessions
    const addSubSessions = (subSessions: SubSession[], parentName: string) => {
      subSessions.forEach(subSession => {
        options.push({ 
          id: subSession.id, 
          name: `${parentName} > ${subSession.name}`, 
          type: 'subsession' 
        });
        if (subSession.subSessions && subSession.subSessions.length > 0) {
          addSubSessions(subSession.subSessions, `${parentName} > ${subSession.name}`);
        }
      });
    };
    
    tills.forEach(session => {
      if (session.subSessions && session.subSessions.length > 0) {
        addSubSessions(session.subSessions, session.name);
      }
    });
    
    return options;
  };

  const handleCreateFormula = async () => {
    try {
      const formula: Omit<Formula, 'id'> = {
        operands: formulaOperands,
      };

      await tillService.setFormula(selectedSessionId, selectedSubSessionId || null, formula);
      setShowFormulaModal(false);
      loadTills();
      Alert.alert('Success', 'Formula created successfully!');
    } catch (error) {
      console.error('Error creating formula:', error);
      Alert.alert('Error', 'Failed to create formula');
    }
  };

  // Helper to get breadcrumbs path for a sub-session
  function getBreadcrumbs(sessions: Session[], parentId: string): string[] {
    let path: string[] = [];
    function findPath(nodes: SubSession[], targetId: string, acc: string[]): boolean {
      for (const node of nodes) {
        if (node.id === targetId) {
          path = [...acc, node.name];
          return true;
        }
        if (node.subSessions && node.subSessions.length > 0) {
          if (findPath(node.subSessions, targetId, [...acc, node.name])) return true;
        }
      }
      return false;
    }
    findPath(sessions as unknown as SubSession[], parentId, []);
    return path;
  }

  const renderSubSessions = (subSessions: SubSession[], parentSessionId: string, level: number = 0) => {
    return subSessions.map((subSession) => {
      const isExpanded = expandedSubSessions[subSession.id] !== false;
      const hasChildren = subSession.subSessions && subSession.subSessions.length > 0;
      return (
        <SwipeableItem
          key={subSession.id}
          onDelete={() => {
            setTills(prev => prev.map(till => ({
              ...till,
              sessions: till.sessions.map(session => ({
                ...session,
                subSessions: session.subSessions.filter(s => s.id !== subSession.id)
              }))
            })));
          }}
          deleteText="Delete"
          onSwipeChange={(isSwiped) => {
            setSwipedItemId(isSwiped ? subSession.id : null);
          }}
        >
          <View style={[styles.subSessionItem, { marginLeft: level * 20, flexDirection: 'row', alignItems: 'flex-start' }]}> 
            {/* Visual tree line */}
            {level > 0 && <View style={{ width: 8, alignItems: 'center' }}><View style={{ width: 2, height: '100%', backgroundColor: '#e0e0e0' }} /></View>}
            <View style={{ flex: 1 }}>
              <View style={[styles.subSessionHeader, { flexDirection: 'row', alignItems: 'center' }]}> 
                {hasChildren && (
                  <TouchableOpacity
                    onPress={() => setExpandedSubSessions(prev => ({ ...prev, [subSession.id]: !isExpanded }))}
                    style={{ marginRight: 6 }}
                  >
                    <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={18} color="#888" />
                  </TouchableOpacity>
                )}
                <Text style={styles.subSessionName}>{subSession.name}</Text>
                {/* Always show sub-session actions */}
                <View style={[styles.subSessionActions, { backgroundColor: '#f5f5fa', borderRadius: 6, marginLeft: 8, flexDirection: 'row' }]}> 
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedParentId(subSession.id);
                      setSubSessionName('');
                      setSubSessionDescription('');
                      setShowSubSessionModal(true);
                    }}
                  >
                    <Text style={styles.actionButtonText}>+ Sub</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedSessionId(parentSessionId);
                      setSelectedSubSessionId(subSession.id);
                      setShowFormulaModal(true);
                    }}
                  >
                    <Text style={styles.actionButtonText}>Formula</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {subSession.description && (
                <Text style={styles.subSessionDescription}>{subSession.description}</Text>
              )}
              {subSession.formula && (
                <View style={styles.formulaDisplay}>
                  <Text style={styles.formulaText}>
                    Formula: {subSession.formula.operands.map((op, index) => 
                      `${index > 0 ? ` ${op.operation === 'add' ? '+' : op.operation === 'subtract' ? '-' : op.operation === 'multiply' ? '×' : '÷'} ` : ''}${getOperandDisplayName(op, tills.find(t => t.id === op.value) || ({} as Till))}`
                    ).join('')}
                  </Text>
                </View>
              )}
              {hasChildren && isExpanded && (
                renderSubSessions(subSession.subSessions, subSession.id, level + 1)
              )}
            </View>
          </View>
        </SwipeableItem>
      );
    });
  };

  const renderSession = (session: Session) => (
    <SwipeableItem
      key={session.id}
      onDelete={() => {
        setTills(prev => prev.filter(till => till.id !== session.id));
      }}
      deleteText="Delete"
      onSwipeChange={(isSwiped) => {
        setSwipedItemId(isSwiped ? session.id : null);
      }}
    >
      <View style={styles.sessionItem}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionName}>{session.name}</Text>
          {swipedItemId !== session.id && (
            <View style={styles.sessionActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedParentId(session.id);
                  setSubSessionName('');
                  setSubSessionDescription('');
                  setShowSubSessionModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>+ Sub</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedSessionId(session.id);
                  setSelectedSubSessionId('');
                  setShowFormulaModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>Formula</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {session.description && (
          <Text style={styles.sessionDescription}>{session.description}</Text>
        )}
        {session.formula && (
          <View style={styles.formulaDisplay}>
            <Text style={styles.formulaText}>
              Formula: {session.formula.operands.map((op, index) => 
                `${index > 0 ? ` ${op.operation === 'add' ? '+' : op.operation === 'subtract' ? '-' : op.operation === 'multiply' ? '×' : '÷'} ` : ''}${getOperandDisplayName(op, tills.find(t => t.id === op.value) || ({} as Till))}`
              ).join('')}
            </Text>
          </View>
        )}
        {session.subSessions && session.subSessions.length > 0 && (
          renderSubSessions(session.subSessions, session.id)
        )}
      </View>
    </SwipeableItem>
  );

  const handleCreateTill = async () => {
    if (!tillName.trim()) {
      Alert.alert('Error', 'Please enter a till name');
      return;
    }
    
    // Check if a till with this name already exists
    const existingTill = tills.find(till => till.name.toLowerCase() === tillName.trim().toLowerCase());
    if (existingTill) {
      Alert.alert('Error', 'A till with this name already exists');
      return;
    }
    
    console.log('TillFormulationScreen.handleCreateTill(): creating till with name:', tillName.trim());
    console.log('TillFormulationScreen.handleCreateTill(): current tills count before:', tills.length);
    
    const newTillData = {
      name: tillName.trim(),
      description: tillDescription.trim() || undefined,
      sessions: [],
    };
    
    try {
      // Save the till to the service (let service generate the ID)
      const newTill = await tillService.createTill(newTillData);
      console.log('TillFormulationScreen.handleCreateTill(): service returned till with id:', newTill.id);
      
      // Update local state with the till returned from service
      setTills(prev => {
        console.log('TillFormulationScreen.handleCreateTill(): updating local state, prev count:', prev.length);
        console.log('TillFormulationScreen.handleCreateTill(): prev tills:', prev.map(t => ({ id: t.id, name: t.name })));
        
        // Check if this till already exists in the array
        const existingTill = prev.find(t => t.id === newTill.id);
        if (existingTill) {
          console.log('TillFormulationScreen.handleCreateTill(): till already exists, not adding duplicate');
          return prev;
        }
        
        const updated = [...prev, newTill];
        console.log('TillFormulationScreen.handleCreateTill(): new count:', updated.length);
        console.log('TillFormulationScreen.handleCreateTill(): new tills:', updated.map(t => ({ id: t.id, name: t.name })));
        return updated;
      });
      
      setTillName('');
      setTillDescription('');
      setShowTillModal(false);
      Alert.alert('Success', 'Till created successfully!');
    } catch (error) {
      console.error('Error creating till:', error);
      Alert.alert('Error', 'Failed to create till');
    }
  };

  const handleTillUpdate = async (updatedTill: Till) => {
    try {
      // Save the updated till to the service
      await tillService.updateTill(updatedTill.id, updatedTill);
      // Update local state
      setTills(prev => prev.map(till => till.id === updatedTill.id ? updatedTill : till));
    } catch (error) {
      console.error('Error updating till:', error);
      Alert.alert('Error', 'Failed to update till');
    }
  };

  const handleEditTill = (till: Till) => {
    setEditTillId(till.id);
    setEditTillName(till.name);
    setEditTillDescription(till.description || '');
    setShowEditTillModal(true);
  };

  const handleSaveEditTill = () => {
    if (!editTillId) return;
    setTills(prev => prev.map(till =>
      till.id === editTillId ? { ...till, name: editTillName, description: editTillDescription } : till
    ));
    setShowEditTillModal(false);
    setEditTillId(null);
    setEditTillName('');
    setEditTillDescription('');
  };

  const handleDeleteTill = async (tillId: string) => {
    Alert.alert('Delete Till', 'Are you sure you want to delete this till and all its sessions?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          // Delete the till from the service
          await tillService.deleteTill(tillId);
          // Update local state
          setTills(prev => prev.filter(till => till.id !== tillId));
        } catch (error) {
          console.error('Error deleting till:', error);
          Alert.alert('Error', 'Failed to delete till');
        }
      }},
    ]);
  };

  const handleOpenFormulaModal = (tillId: string, existingFormula?: Formula) => {
    setFormulaTillId(tillId);
    setFormulaOperands(existingFormula ? [...existingFormula.operands] : []);
    setShowFormulaModal(true);
  };

  const handleSaveFormula = async () => {
    if (!formulaTillId) return;
    
    try {
      // Create the formula object with an id
      const formula: Formula = {
        id: `formula_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operands: formulaOperands
      };
      
      // Update the till in the service with the formula
      await tillService.updateTill(formulaTillId, { formula });
      
      // Update local state
      setTills(prev => prev.map(till =>
        till.id === formulaTillId ? { ...till, formula } : till
      ));
      
      setShowFormulaModal(false);
      setFormulaTillId(null);
      setFormulaOperands([]);
    } catch (error) {
      console.error('Error saving formula:', error);
      Alert.alert('Error', 'Failed to save formula');
    }
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

  // Helper to flatten all sub-sessions in all sessions
  function getAllSubSessions(sessions: Session[]): { id: string; name: string }[] {
    const result = [];
    function recurse(subSessions: SubSession[], parentName = '') {
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

  useEffect(() => {
    loadTills();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  if (showSubSessionModal && selectedParentId) {
    console.log('Creating sub-session under parentId:', selectedParentId, 'Path:', getBreadcrumbs(tills, selectedParentId));
  }

  // In the formula builder modal, get the current Till being edited:
  const currentTill = tills.find(t => t.id === formulaTillId);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Till Formulation</Text>
          <Text style={styles.subtitle}>
            Create Tills, Sessions, and Sub-sessions for your calculations
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowTillModal(true)}
        >
          <Text style={styles.createButtonText}>+ Create New Till</Text>
        </TouchableOpacity>
        {tills.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tills created yet</Text>
            <Text style={styles.emptyStateSubtext}>Create your first till to get started</Text>
          </View>
        ) : (
          <View style={styles.tillsList}>
            {tills.map((till, index) => {
              console.log(`Rendering till ${index}:`, till.id, till.name);
              return (
                <TouchableOpacity key={`${till.id}_${index}`} onPress={() => navigation.navigate('TillDetail', { till, onTillUpdate: handleTillUpdate })} activeOpacity={0.8}>
                  <View style={{ marginBottom: 24, backgroundColor: '#f8f8ff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>{till.name}</Text>
                      {till.description ? (
                        <Text style={{ color: '#888', marginBottom: 6 }}>{till.description}</Text>
                      ) : null}
                      {till.formula && (
                        <Text style={{ color: '#4F8EF7', marginTop: 4, fontSize: 13 }}>
                          Formula: {till.formula.operands.map((op, i) =>
                            `${i > 0 ? ` ${op.operation === 'add' ? '+' : op.operation === 'subtract' ? '-' : op.operation === 'multiply' ? '\u00d7' : '\u00f7'} ` : ''}${getOperandDisplayName(op, till)}`
                          ).join('')}
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => handleEditTill(till)}>
                        <Ionicons name="create-outline" size={20} color="#4F8EF7" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleOpenFormulaModal(till.id, till.formula)}>
                        <Ionicons name="calculator-outline" size={20} color="#2a2a6a" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTill(till.id)}>
                        <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
      {/* Till Creation Modal */}
      <Modal visible={showTillModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Till</Text>
            <TextInput
              style={styles.input}
              placeholder="Till Name"
              value={tillName}
              onChangeText={setTillName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={tillDescription}
              onChangeText={setTillDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTillModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateTill}
              >
                <Text style={styles.confirmButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Edit Till Modal */}
      <Modal visible={showEditTillModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Till</Text>
            <TextInput
              style={styles.input}
              placeholder="Till Name"
              value={editTillName}
              onChangeText={setEditTillName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={editTillDescription}
              onChangeText={setEditTillDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditTillModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveEditTill}
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
                {op.type === 'session' && currentTill ? (
                  <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 6 }}>
                    <TouchableOpacity onPress={() => setShowSessionDropdown(i)} style={{ padding: 4, minWidth: 100 }}>
                      <Text>{currentTill.sessions.find(s => s.id === op.value)?.name || 'Select Session'}</Text>
                    </TouchableOpacity>
                    {showSessionDropdown === i && (
                      <View style={{ position: 'absolute', top: 30, left: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, zIndex: 20 }}>
                        {currentTill.sessions.map(session => (
                          <TouchableOpacity key={session.id} style={{ padding: 8 }} onPress={() => { handleOperandChange(i, 'value', session.id); setShowSessionDropdown(-1); }}>
                            <Text>{session.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ) : null}
                {op.type === 'subsession' && currentTill ? (
                  <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 6 }}>
                    <TouchableOpacity onPress={() => setShowSubSessionDropdown(i)} style={{ padding: 4, minWidth: 120 }}>
                      <Text>{getAllSubSessions(currentTill.sessions).find(sub => sub.id === op.value)?.name || 'Select Sub-session'}</Text>
                    </TouchableOpacity>
                    {showSubSessionDropdown === i && (
                      <View style={{ position: 'absolute', top: 30, left: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, zIndex: 20 }}>
                        {getAllSubSessions(currentTill.sessions).map(sub => (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  authPrompt: {
    padding: 20,
    alignItems: 'center',
  },
  authText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  authButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  authButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: colors.primary,
    margin: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sessionsList: {
    padding: 20,
  },
  sessionItem: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  subSessionItem: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  subSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subSessionName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  subSessionActions: {
    flexDirection: 'row',
    gap: 6,
  },
  subSessionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '500',
  },
  formulaDisplay: {
    backgroundColor: colors.border,
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  formulaText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  formulaRow: {
    marginBottom: 15,
  },
  formulaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  operationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  operationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  selectedOperation: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  operationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  selectedOperationText: {
    color: colors.background,
  },
  tempWarning: {
    backgroundColor: colors.warning,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  tempWarningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  operandRow: {
    marginBottom: 15,
  },
  operandLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  operandButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  operandButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  selectedOperand: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  operandButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  selectedOperandText: {
    color: colors.background,
  },
  addOperandButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addOperandButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  operandsList: {
    marginBottom: 15,
  },
  operandsScrollView: {
    maxHeight: 150,
  },
  operandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  operandItemText: {
    fontSize: 14,
    color: colors.text,
  },
  operandItemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  operandActionButton: {
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  operandActionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  deleteButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -25,
    backgroundColor: colors.warning,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
    width: 50,
  },
  deleteButtonTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    maxHeight: 200,
  },
  dropdownScrollView: {
    maxHeight: 150,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedDropdownOption: {
    backgroundColor: colors.primary,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedDropdownOptionText: {
    color: colors.background,
    fontWeight: '600',
  },
  swipeableContainer: {
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  contentTouchable: {
    flex: 1,
  },
  actionButtonsStyle: {
    opacity: 0,
  },
  operandDeleteButton: {
    backgroundColor: colors.warning,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 4,
  },
  operandDeleteButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.background,
  },
  formulaModalScrollView: {
    maxHeight: 300,
  },
  tillsList: {
    padding: 20,
  },
});

export default TillFormulationScreen; 