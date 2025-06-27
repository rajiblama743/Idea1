import { Session, SubSession, Formula, Calculation, CalculationInput, CalculationResult, FormulaOperand, Till } from '@/types';
import { sqliteService } from './sqlite';

class TillService {
  // Initialize the database
  async initDatabase() {
    await sqliteService.initDatabase();
  }

  // Clear all data (useful for testing or resetting)
  async clearAllData() {
    console.log('tillService.clearAllData(): clearing all data');
    await sqliteService.clearAllData();
    console.log('tillService.clearAllData(): all data cleared');
  }

  // Session Management
  async createSession(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<Session> {
    // Note: We need to pass tillId for SQLite, but it's not in the Session type
    // This will need to be handled by the calling code
    throw new Error('createSession requires tillId. Use createSessionForTill instead.');
  }

  async createSessionForTill(tillId: string, session: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<Session> {
    return await sqliteService.createSession({ ...session, tillId });
  }

  async getSessions(userId: string): Promise<Session[]> {
    return await sqliteService.getSessions(userId);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    // Note: SQLite service doesn't have getSession by ID, we'll need to get all sessions and filter
    const sessions = await sqliteService.getSessions('guest'); // Assuming guest user for now
    return sessions.find(s => s.id === sessionId) || null;
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    return await sqliteService.updateSession(sessionId, updates);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    // Note: SQLite service doesn't have deleteSession, we'll need to implement it
    console.warn('deleteSession not implemented in SQLite service yet');
    return false;
  }

  // SubSession Management
  async addSubSession(
    parentId: string, 
    subSession: Omit<SubSession, 'id' | 'parentId'>
  ): Promise<SubSession | null> {
    return await sqliteService.addSubSession(parentId, subSession);
  }

  async updateSubSession(
    sessionId: string,
    subSessionId: string,
    updates: Partial<SubSession>
  ): Promise<SubSession | null> {
    return await sqliteService.updateSubSession(sessionId, subSessionId, updates);
  }

  async deleteSubSession(sessionId: string, subSessionId: string): Promise<boolean> {
    // Note: SQLite service doesn't have deleteSubSession, we'll need to implement it
    console.warn('deleteSubSession not implemented in SQLite service yet');
    return false;
  }

  // Formula Management
  async setFormula(
    sessionId: string,
    subSessionId: string | null,
    formula: Omit<Formula, 'id'>
  ): Promise<Formula | null> {
    return await sqliteService.setFormula(sessionId, subSessionId, null, formula);
  }

  async setTillFormula(tillId: string, formula: Omit<Formula, 'id'>): Promise<Formula | null> {
    return await sqliteService.setFormula(null, null, tillId, formula);
  }

  // Calculation Management
  async createCalculation(calculation: Omit<Calculation, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<Calculation> {
    return await sqliteService.createCalculation(calculation);
  }

  async getCalculations(userId: string): Promise<Calculation[]> {
    return await sqliteService.getCalculations(userId);
  }

  async getCalculation(calculationId: string): Promise<Calculation | null> {
    // Note: SQLite service doesn't have getCalculation by ID, we'll need to implement it
    const calculations = await sqliteService.getCalculations('guest'); // Assuming guest user for now
    return calculations.find(c => c.id === calculationId) || null;
  }

  async deleteCalculation(calculationId: string): Promise<boolean> {
    return await sqliteService.deleteCalculation(calculationId);
  }

  // Till Management
  async createTill(till: Omit<Till, 'id' | 'createdAt' | 'updatedAt'>): Promise<Till> {
    return await sqliteService.createTill(till);
  }

  async getTills(): Promise<Till[]> {
    return await sqliteService.getTills();
  }

  async getTill(tillId: string): Promise<Till | null> {
    return await sqliteService.getTill(tillId);
  }

  async updateTill(tillId: string, updates: Partial<Till>): Promise<Till | null> {
    return await sqliteService.updateTill(tillId, updates);
  }

  async deleteTill(tillId: string): Promise<boolean> {
    return await sqliteService.deleteTill(tillId);
  }

  // Calculation Logic
  calculateSession(session: Session, inputs: CalculationInput[], sessionResults?: CalculationResult[]): CalculationResult {
    console.log('calculateSession: Starting calculation for session:', session.name, 'ID:', session.id);
    console.log('calculateSession: Session formula:', session.formula);
    
    const calculateSubSession = (subSession: SubSession): CalculationResult => {
      // Find input value for this sub-session
      const input = inputs.find(input => 
        input.sessionId === session.id && input.subSessionId === subSession.id
      );
      
      let calculatedValue = input?.value || 0;

      // Apply formula if exists
      if (subSession.formula) {
        calculatedValue = this.applyFormula(subSession.formula, inputs, session, sessionResults);
      }

      // Calculate sub-sessions recursively
      const subResults = subSession.subSessions.map(ss => calculateSubSession(ss));
      
      return {
        sessionId: session.id,
        subSessionId: subSession.id,
        name: subSession.name,
        inputValue: input?.value,
        calculatedValue,
        formula: subSession.formula,
        subResults,
      };
    };

    // Calculate main session
    const input = inputs.find(input => input.sessionId === session.id && !input.subSessionId);
    let calculatedValue = input?.value || 0;

    // Apply formula if exists
    if (session.formula) {
      calculatedValue = this.applyFormula(session.formula, inputs, session, sessionResults);
    }

    // Calculate sub-sessions
    const subResults = session.subSessions.map(ss => calculateSubSession(ss));

    return {
      sessionId: session.id,
      name: session.name,
      inputValue: input?.value,
      calculatedValue,
      formula: session.formula,
      subResults,
    };
  }

  private applyFormula(formula: Formula, inputs: CalculationInput[], session: Session, sessionResults?: CalculationResult[]): number {
    console.log('applyFormula: Applying formula with operands:', formula.operands);
    
    const getValue = (operand: FormulaOperand): number => {
      console.log('getValue: Processing operand:', operand);
      
      switch (operand.type) {
        case 'input':
          // For input type, use the value directly
          const numValue = parseFloat(operand.value);
          console.log('getValue: Input value:', numValue);
          return isNaN(numValue) ? 0 : numValue;
          
        case 'session':
          // Find the session result
          const sessionResult = sessionResults?.find(r => r.sessionId === operand.value);
          if (sessionResult) {
            console.log('getValue: Session result found:', sessionResult.calculatedValue);
            return sessionResult.calculatedValue;
          }
          console.log('getValue: Session result not found for:', operand.value);
          return 0;
          
        case 'subsession':
          // Find the sub-session result recursively
          const findAndCalculateSubSession = (subSessions: SubSession[]): number => {
            for (const subSession of subSessions) {
              if (subSession.id === operand.value) {
                // Find input value for this sub-session
                const input = inputs.find(input => 
                  input.sessionId === session.id && input.subSessionId === subSession.id
                );
                
                let calculatedValue = input?.value || 0;

                // Apply formula if exists
                if (subSession.formula) {
                  calculatedValue = this.applyFormula(subSession.formula, inputs, session, sessionResults);
                }

                console.log('getValue: Sub-session result:', calculatedValue);
                return calculatedValue;
              }
              
              // Check nested sub-sessions
              if (subSession.subSessions && subSession.subSessions.length > 0) {
                const nestedResult = findAndCalculateSubSession(subSession.subSessions);
                if (nestedResult !== null) {
                  return nestedResult;
                }
              }
            }
            console.log('getValue: Sub-session not found for:', operand.value);
            return 0;
          };
          
          return findAndCalculateSubSession(session.subSessions);
          
        default:
          console.log('getValue: Unknown operand type:', operand.type);
          return 0;
      }
    };

    let result = 0;
    
    for (let i = 0; i < formula.operands.length; i++) {
      const operand = formula.operands[i];
      const value = getValue(operand);
      
      if (i === 0) {
        result = value;
      } else {
        const operation = operand.operation;
        switch (operation) {
          case 'add':
            result += value;
            break;
          case 'subtract':
            result -= value;
            break;
          case 'multiply':
            result *= value;
            break;
          case 'divide':
            if (value !== 0) {
              result /= value;
            } else {
              console.warn('Division by zero detected');
              result = 0;
            }
            break;
        }
      }
    }
    
    console.log('applyFormula: Final result:', result);
    return result;
  }

  calculateTill(till: Till, inputs: CalculationInput[]): CalculationResult {
    console.log('calculateTill: Starting calculation for till:', till.name, 'ID:', till.id);
    
    // Calculate all sessions first
    const sessionResults = till.sessions.map(session => 
      this.calculateSession(session, inputs)
    );
    
    // Apply till formula if exists
    let totalResult = 0;
    if (till.formula) {
      // Create a dummy session for the till formula calculation
      const dummySession: Session = {
        id: till.id,
        name: till.name,
        userId: 'guest',
        order: 0,
        subSessions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isSynced: true,
      };
      totalResult = this.applyFormula(till.formula, inputs, dummySession, sessionResults);
    } else {
      // Sum all session results
      totalResult = sessionResults.reduce((sum, result) => sum + result.calculatedValue, 0);
    }
    
    console.log('calculateTill: Total result:', totalResult);
    
    return {
      sessionId: till.id,
      name: till.name,
      calculatedValue: totalResult,
      formula: till.formula,
      subResults: sessionResults,
    };
  }
}

export const tillService = new TillService(); 