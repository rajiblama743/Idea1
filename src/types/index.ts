export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  password?: string; // For local-only auth, not for production
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isSynced: boolean;
}

// Till Formulation Types
export interface FormulaOperand {
  type: 'input' | 'session' | 'subsession';
  value: string; // session/sub-session ID or custom value
  operation: 'add' | 'subtract' | 'multiply' | 'divide'; // Operation for this operand
}

export interface Formula {
  id: string;
  operands: FormulaOperand[]; // Array of operands with their own operations
}

export interface SubSession {
  id: string;
  name: string;
  description?: string;
  order: number;
  formula?: Formula;
  subSessions: SubSession[]; // Nested sub-sessions
  parentId?: string; // Reference to parent session/sub-session
}

export interface Session {
  id: string;
  userId: string;
  name: string;
  description?: string;
  order: number;
  formula?: Formula;
  subSessions: SubSession[];
  createdAt: Date;
  updatedAt: Date;
  isSynced: boolean;
}

// Till Calculation Types
export interface CalculationInput {
  sessionId: string;
  subSessionId?: string;
  value: number;
}

export interface CalculationResult {
  sessionId: string;
  subSessionId?: string;
  name: string;
  inputValue?: number;
  calculatedValue: number;
  formula?: Formula;
  subResults?: CalculationResult[];
}

export interface Calculation {
  id: string;
  userId: string;
  sessionId: string;
  sessionName: string;
  inputs: CalculationInput[];
  results: CalculationResult[];
  totalResult: number;
  createdAt: Date;
  updatedAt: Date;
  isSynced: boolean;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface DatabaseState {
  posts: Post[];
  sessions: Session[];
  calculations: Calculation[];
  loading: boolean;
  error: string | null;
}

export interface AppState {
  auth: AuthState;
  database: DatabaseState;
}

export interface SyncStatus {
  lastSync: Date | null;
  isOnline: boolean;
  pendingChanges: number;
}

export interface Till {
  id: string;
  name: string;
  description?: string;
  sessions: Session[];
  createdAt: Date;
  updatedAt: Date;
  formula?: Formula;
} 