import * as SQLite from 'expo-sqlite';
import { Till, Session, SubSession, Formula, Calculation, CalculationInput, CalculationResult, FormulaOperand } from '@/types';

// Type definitions for database rows
interface TillRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionRow {
  id: string;
  tillId: string;
  name: string;
  description: string | null;
  userId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  isSynced: number;
}

interface SubSessionRow {
  id: string;
  sessionId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface FormulaRow {
  id: string;
  sessionId: string | null;
  subsessionId: string | null;
  tillId: string | null;
  operands: string;
  createdAt: string;
}

interface CalculationRow {
  id: string;
  userId: string;
  sessionId: string;
  sessionName: string;
  inputs: string;
  results: string;
  totalResult: number;
  createdAt: string;
  updatedAt: string;
  isSynced: number;
}

class SQLiteService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('tillapp.db');
      
      // Create tables
      await this.createTables();
      console.log('SQLite: Database initialized successfully');
    } catch (error) {
      console.error('SQLite: Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create tills table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS tills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // Create sessions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        tillId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        userId TEXT NOT NULL,
        order_num INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isSynced INTEGER DEFAULT 1,
        FOREIGN KEY (tillId) REFERENCES tills (id) ON DELETE CASCADE
      );
    `);

    // Create subsessions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS subsessions (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        parentId TEXT,
        name TEXT NOT NULL,
        description TEXT,
        order_num INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (parentId) REFERENCES subsessions (id) ON DELETE CASCADE
      );
    `);

    // Create formulas table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS formulas (
        id TEXT PRIMARY KEY,
        sessionId TEXT,
        subsessionId TEXT,
        tillId TEXT,
        operands TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (subsessionId) REFERENCES subsessions (id) ON DELETE CASCADE,
        FOREIGN KEY (tillId) REFERENCES tills (id) ON DELETE CASCADE
      );
    `);

    // Create calculations table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS calculations (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        sessionName TEXT NOT NULL,
        inputs TEXT NOT NULL,
        results TEXT NOT NULL,
        totalResult REAL NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isSynced INTEGER DEFAULT 1
      );
    `);

    console.log('SQLite: Tables created successfully');
  }

  // Till Management
  async createTill(till: Omit<Till, 'id' | 'createdAt' | 'updatedAt'>): Promise<Till> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `till_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      'INSERT INTO tills (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [id, till.name, till.description || null, now, now]
    );

    return {
      id,
      name: till.name,
      description: till.description,
      sessions: [],
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async getTills(): Promise<Till[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync('SELECT * FROM tills ORDER BY createdAt DESC');
    
    const tills: Till[] = [];
    for (const row of result) {
      const tillRow = row as TillRow;
      const sessions = await this.getSessionsForTill(tillRow.id);
      
      // Load formula for this till
      const tillFormula = await this.getFormula(null, null, tillRow.id);
      
      tills.push({
        id: tillRow.id,
        name: tillRow.name,
        description: tillRow.description || undefined,
        sessions,
        formula: tillFormula || undefined,
        createdAt: new Date(tillRow.createdAt),
        updatedAt: new Date(tillRow.updatedAt),
      });
    }

    return tills;
  }

  async getTill(tillId: string): Promise<Till | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync('SELECT * FROM tills WHERE id = ?', [tillId]);
    if (!result) return null;

    const tillRow = result as TillRow;
    const sessions = await this.getSessionsForTill(tillRow.id);
    
    // Load formula for this till
    const tillFormula = await this.getFormula(null, null, tillRow.id);
    
    return {
      id: tillRow.id,
      name: tillRow.name,
      description: tillRow.description || undefined,
      sessions,
      formula: tillFormula || undefined,
      createdAt: new Date(tillRow.createdAt),
      updatedAt: new Date(tillRow.updatedAt),
    };
  }

  async updateTill(tillId: string, updates: Partial<Till>): Promise<Till | null> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    
    // Handle specific fields that can be updated
    if (updates.name !== undefined) {
      await this.db.runAsync(
        'UPDATE tills SET name = ?, updatedAt = ? WHERE id = ?',
        [updates.name, now, tillId]
      );
    }
    
    if (updates.description !== undefined) {
      await this.db.runAsync(
        'UPDATE tills SET description = ?, updatedAt = ? WHERE id = ?',
        [updates.description, now, tillId]
      );
    }

    return this.getTill(tillId);
  }

  async deleteTill(tillId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync('DELETE FROM tills WHERE id = ?', [tillId]);
    return result.changes > 0;
  }

  // Session Management
  async createSession(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'> & { tillId: string }): Promise<Session> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      'INSERT INTO sessions (id, tillId, name, description, userId, order_num, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, session.tillId, session.name, session.description || null, session.userId, session.order, now, now]
    );

    return {
      id,
      name: session.name,
      description: session.description,
      userId: session.userId,
      order: session.order,
      subSessions: [],
      createdAt: new Date(now),
      updatedAt: new Date(now),
      isSynced: true,
    };
  }

  async getSessions(userId: string): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM sessions WHERE userId = ? ORDER BY order_num ASC, createdAt DESC',
      [userId]
    );

    const sessions: Session[] = [];
    for (const row of result) {
      const sessionRow = row as SessionRow;
      const subSessions = await this.getSubSessionsForSession(sessionRow.id);
      sessions.push({
        id: sessionRow.id,
        name: sessionRow.name,
        description: sessionRow.description || undefined,
        userId: sessionRow.userId,
        order: sessionRow.order,
        subSessions,
        createdAt: new Date(sessionRow.createdAt),
        updatedAt: new Date(sessionRow.updatedAt),
        isSynced: sessionRow.isSynced === 1,
      });
    }

    return sessions;
  }

  private async getSessionsForTill(tillId: string): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM sessions WHERE tillId = ? ORDER BY order_num ASC, createdAt ASC',
      [tillId]
    );

    const sessions: Session[] = [];
    for (const row of result) {
      const sessionRow = row as SessionRow;
      const subSessions = await this.getSubSessionsForSession(sessionRow.id);
      
      // Load formula for this session
      const sessionFormula = await this.getFormula(sessionRow.id, null);
      
      sessions.push({
        id: sessionRow.id,
        name: sessionRow.name,
        description: sessionRow.description || undefined,
        userId: sessionRow.userId,
        order: sessionRow.order,
        subSessions,
        formula: sessionFormula || undefined,
        createdAt: new Date(sessionRow.createdAt),
        updatedAt: new Date(sessionRow.updatedAt),
        isSynced: sessionRow.isSynced === 1,
      });
    }

    return sessions;
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    
    // Handle specific fields that can be updated
    if (updates.name !== undefined) {
      await this.db.runAsync(
        'UPDATE sessions SET name = ?, updatedAt = ? WHERE id = ?',
        [updates.name, now, sessionId]
      );
    }
    
    if (updates.description !== undefined) {
      await this.db.runAsync(
        'UPDATE sessions SET description = ?, updatedAt = ? WHERE id = ?',
        [updates.description, now, sessionId]
      );
    }
    
    if (updates.order !== undefined) {
      await this.db.runAsync(
        'UPDATE sessions SET order_num = ?, updatedAt = ? WHERE id = ?',
        [updates.order, now, sessionId]
      );
    }

    const result = await this.db.getFirstAsync('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    if (!result) return null;

    const sessionRow = result as SessionRow;
    const subSessions = await this.getSubSessionsForSession(sessionRow.id);
    return {
      id: sessionRow.id,
      name: sessionRow.name,
      description: sessionRow.description || undefined,
      userId: sessionRow.userId,
      order: sessionRow.order,
      subSessions,
      createdAt: new Date(sessionRow.createdAt),
      updatedAt: new Date(sessionRow.updatedAt),
      isSynced: sessionRow.isSynced === 1,
    };
  }

  // SubSession Management
  async addSubSession(parentId: string, subSession: Omit<SubSession, 'id'>): Promise<SubSession | null> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `subsession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      'INSERT INTO subsessions (id, sessionId, parentId, name, description, order_num, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, parentId, subSession.parentId || null, subSession.name, subSession.description || null, subSession.order, now, now]
    );

    return {
      id,
      parentId: subSession.parentId || undefined,
      name: subSession.name,
      description: subSession.description,
      order: subSession.order,
      subSessions: [],
    };
  }

  private async getSubSessionsForSession(sessionId: string): Promise<SubSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM subsessions WHERE sessionId = ? ORDER BY order_num ASC, createdAt ASC',
      [sessionId]
    );

    const subSessions: SubSession[] = [];
    for (const row of result) {
      const subSessionRow = row as SubSessionRow;
      const childSubSessions = await this.getSubSessionsForSubSession(subSessionRow.id);
      
      // Load formula for this subsession
      const subsessionFormula = await this.getFormula(sessionId, subSessionRow.id);
      
      subSessions.push({
        id: subSessionRow.id,
        parentId: subSessionRow.parentId || undefined,
        name: subSessionRow.name,
        description: subSessionRow.description || undefined,
        order: subSessionRow.order,
        subSessions: childSubSessions,
        formula: subsessionFormula || undefined,
      });
    }

    return subSessions;
  }

  private async getSubSessionsForSubSession(parentId: string): Promise<SubSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM subsessions WHERE parentId = ? ORDER BY order_num ASC, createdAt ASC',
      [parentId]
    );

    const subSessions: SubSession[] = [];
    for (const row of result) {
      const subSessionRow = row as SubSessionRow;
      const childSubSessions = await this.getSubSessionsForSubSession(subSessionRow.id);
      
      // Load formula for this subsession (need to get the sessionId first)
      const sessionResult = await this.db.getFirstAsync(
        'SELECT sessionId FROM subsessions WHERE id = ?',
        [parentId]
      );
      const sessionId = sessionResult ? (sessionResult as any).sessionId : null;
      const subsessionFormula = sessionId ? await this.getFormula(sessionId, subSessionRow.id) : null;
      
      subSessions.push({
        id: subSessionRow.id,
        parentId: subSessionRow.parentId || undefined,
        name: subSessionRow.name,
        description: subSessionRow.description || undefined,
        order: subSessionRow.order,
        subSessions: childSubSessions,
        formula: subsessionFormula || undefined,
      });
    }

    return subSessions;
  }

  async updateSubSession(sessionId: string, subSessionId: string, updates: Partial<SubSession>): Promise<SubSession | null> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    
    // Handle specific fields that can be updated
    if (updates.name !== undefined) {
      await this.db.runAsync(
        'UPDATE subsessions SET name = ?, updatedAt = ? WHERE id = ? AND sessionId = ?',
        [updates.name, now, subSessionId, sessionId]
      );
    }
    
    if (updates.description !== undefined) {
      await this.db.runAsync(
        'UPDATE subsessions SET description = ?, updatedAt = ? WHERE id = ? AND sessionId = ?',
        [updates.description, now, subSessionId, sessionId]
      );
    }
    
    if (updates.order !== undefined) {
      await this.db.runAsync(
        'UPDATE subsessions SET order_num = ?, updatedAt = ? WHERE id = ? AND sessionId = ?',
        [updates.order, now, subSessionId, sessionId]
      );
    }

    const result = await this.db.getFirstAsync(
      'SELECT * FROM subsessions WHERE id = ? AND sessionId = ?',
      [subSessionId, sessionId]
    );
    if (!result) return null;

    const subSessionRow = result as SubSessionRow;
    const childSubSessions = await this.getSubSessionsForSubSession(subSessionRow.id);
    return {
      id: subSessionRow.id,
      parentId: subSessionRow.parentId || undefined,
      name: subSessionRow.name,
      description: subSessionRow.description || undefined,
      order: subSessionRow.order,
      subSessions: childSubSessions,
    };
  }

  // Formula Management
  async setFormula(sessionId: string | null, subSessionId: string | null, tillId: string | null, formula: Omit<Formula, 'id'>): Promise<Formula | null> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `formula_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Delete existing formula if any
    if (tillId) {
      await this.db.runAsync(
        'DELETE FROM formulas WHERE tillId = ?',
        [tillId]
      );
    } else if (subSessionId) {
      await this.db.runAsync(
        'DELETE FROM formulas WHERE subsessionId = ?',
        [subSessionId]
      );
    } else if (sessionId) {
      await this.db.runAsync(
        'DELETE FROM formulas WHERE sessionId = ?',
        [sessionId]
      );
    }

    // Insert new formula
    await this.db.runAsync(
      'INSERT INTO formulas (id, sessionId, subsessionId, tillId, operands, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, sessionId, subSessionId, tillId, JSON.stringify(formula.operands), now]
    );

    return {
      id,
      operands: formula.operands,
    };
  }

  async getFormula(sessionId: string | null, subSessionId: string | null, tillId: string | null = null): Promise<Formula | null> {
    if (!this.db) throw new Error('Database not initialized');

    let query = '';
    let params: any[] = [];

    if (tillId) {
      query = 'SELECT * FROM formulas WHERE tillId = ?';
      params = [tillId];
    } else if (subSessionId) {
      query = 'SELECT * FROM formulas WHERE sessionId = ? AND subsessionId = ?';
      params = [sessionId, subSessionId];
    } else if (sessionId) {
      query = 'SELECT * FROM formulas WHERE sessionId = ? AND subsessionId IS NULL';
      params = [sessionId];
    } else {
      return null;
    }

    const result = await this.db.getFirstAsync(query, params);

    if (!result) return null;

    const formulaRow = result as FormulaRow;
    return {
      id: formulaRow.id,
      operands: JSON.parse(formulaRow.operands),
    };
  }

  // Calculation Management
  async createCalculation(calculation: Omit<Calculation, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<Calculation> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      'INSERT INTO calculations (id, userId, sessionId, sessionName, inputs, results, totalResult, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        calculation.userId,
        calculation.sessionId,
        calculation.sessionName,
        JSON.stringify(calculation.inputs),
        JSON.stringify(calculation.results),
        calculation.totalResult,
        now,
        now
      ]
    );

    return {
      id,
      userId: calculation.userId,
      sessionId: calculation.sessionId,
      sessionName: calculation.sessionName,
      inputs: calculation.inputs,
      results: calculation.results,
      totalResult: calculation.totalResult,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      isSynced: true,
    };
  }

  async getCalculations(userId: string): Promise<Calculation[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM calculations WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );

    return result.map(row => {
      const calcRow = row as CalculationRow;
      return {
        id: calcRow.id,
        userId: calcRow.userId,
        sessionId: calcRow.sessionId,
        sessionName: calcRow.sessionName,
        inputs: JSON.parse(calcRow.inputs),
        results: JSON.parse(calcRow.results),
        totalResult: calcRow.totalResult,
        createdAt: new Date(calcRow.createdAt),
        updatedAt: new Date(calcRow.updatedAt),
        isSynced: calcRow.isSynced === 1,
      };
    });
  }

  async deleteCalculation(calculationId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync('DELETE FROM calculations WHERE id = ?', [calculationId]);
    return result.changes > 0;
  }

  // Clear all data (useful for testing)
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      DELETE FROM calculations;
      DELETE FROM formulas;
      DELETE FROM subsessions;
      DELETE FROM sessions;
      DELETE FROM tills;
    `);

    console.log('SQLite: All data cleared');
  }
}

export const sqliteService = new SQLiteService(); 