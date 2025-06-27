import { Session, SubSession, Formula, Calculation, CalculationInput, CalculationResult, FormulaOperand, Till } from '@/types';
import { createDrawerNavigator } from '@react-navigation/drawer';

// In-memory mock storage for sessions and calculations
const mockSessions: Session[] = [];
const mockCalculations: Calculation[] = [];
// In-memory mock storage for tills
const mockTills: Till[] = [];

class TillService {
  // Clear all data (useful for testing or resetting)
  clearAllData() {
    console.log('tillService.clearAllData(): clearing all data');
    mockSessions.length = 0;
    mockCalculations.length = 0;
    mockTills.length = 0;
    console.log('tillService.clearAllData(): all data cleared');
  }

  // Session Management
  async createSession(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<Session> {
    const newSession: Session = {
      ...session,
      id: (mockSessions.length + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isSynced: true,
    };
    mockSessions.push(newSession);
    return newSession;
  }

  async getSessions(userId: string): Promise<Session[]> {
    return mockSessions.filter(s => s.userId === userId);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return mockSessions.find(s => s.id === sessionId) || null;
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    const idx = mockSessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return null;
    mockSessions[idx] = { ...mockSessions[idx], ...updates, updatedAt: new Date() };
    return mockSessions[idx];
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const idx = mockSessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return false;
    mockSessions.splice(idx, 1);
    return true;
  }

  // SubSession Management
  async addSubSession(
    parentId: string, 
    subSession: Omit<SubSession, 'id' | 'parentId'>
  ): Promise<SubSession | null> {
    const parentSession = await this.getSession(parentId);
    if (!parentSession) return null;
    const newSubSession: SubSession = {
      ...subSession,
      id: `subsession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parentId,
      subSessions: [],
    };
    parentSession.subSessions.push(newSubSession);
    await this.updateSession(parentId, { subSessions: parentSession.subSessions });
    return newSubSession;
  }

  async updateSubSession(
    sessionId: string,
    subSessionId: string,
    updates: Partial<SubSession>
  ): Promise<SubSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    const updateSubSessionInArray = (subSessions: SubSession[]): SubSession[] => {
      return subSessions.map(subSession => {
        if (subSession.id === subSessionId) {
          return { ...subSession, ...updates };
        }
        if (subSession.subSessions) {
          return {
            ...subSession,
            subSessions: updateSubSessionInArray(subSession.subSessions),
          };
        }
        return subSession;
      });
    };
    session.subSessions = updateSubSessionInArray(session.subSessions);
    await this.updateSession(sessionId, { subSessions: session.subSessions });
    // Find and return the updated sub-session
    const findSubSession = (subSessions: SubSession[]): SubSession | null => {
      for (const subSession of subSessions) {
        if (subSession.id === subSessionId) {
          return subSession;
        }
        if (subSession.subSessions) {
          const found = findSubSession(subSession.subSessions);
          if (found) return found;
        }
      }
      return null;
    };
    return findSubSession(session.subSessions);
  }

  async deleteSubSession(sessionId: string, subSessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;
    const removeSubSessionFromArray = (subSessions: SubSession[]): SubSession[] => {
      return subSessions.filter(subSession => {
        if (subSession.id === subSessionId) {
          return false;
        }
        if (subSession.subSessions) {
          subSession.subSessions = removeSubSessionFromArray(subSession.subSessions);
        }
        return true;
      });
    };
    session.subSessions = removeSubSessionFromArray(session.subSessions);
    await this.updateSession(sessionId, { subSessions: session.subSessions });
    return true;
  }

  // Formula Management
  async setFormula(
    sessionId: string,
    subSessionId: string | null,
    formula: Omit<Formula, 'id'>
  ): Promise<Formula | null> {
    const newFormula: Formula = {
      ...formula,
      id: `formula_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    if (subSessionId) {
      await this.updateSubSession(sessionId, subSessionId, { formula: newFormula });
      return newFormula;
    } else {
      await this.updateSession(sessionId, { formula: newFormula });
      return newFormula;
    }
  }

  // Calculation Management
  async createCalculation(calculation: Omit<Calculation, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<Calculation> {
    const newCalculation: Calculation = {
      ...calculation,
      id: (mockCalculations.length + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isSynced: true,
    };
    mockCalculations.push(newCalculation);
    return newCalculation;
  }

  async getCalculations(userId: string): Promise<Calculation[]> {
    return mockCalculations.filter(c => c.userId === userId);
  }

  async getCalculation(calculationId: string): Promise<Calculation | null> {
    return mockCalculations.find(c => c.id === calculationId) || null;
  }

  async deleteCalculation(calculationId: string): Promise<boolean> {
    const idx = mockCalculations.findIndex(c => c.id === calculationId);
    if (idx === -1) return false;
    mockCalculations.splice(idx, 1);
    return true;
  }

  // Calculation Logic
  calculateSession(session: Session, inputs: CalculationInput[]): CalculationResult {
    const calculateSubSession = (subSession: SubSession): CalculationResult => {
      // Find input value for this sub-session
      const input = inputs.find(input => 
        input.sessionId === session.id && input.subSessionId === subSession.id
      );
      
      let calculatedValue = input?.value || 0;

      // Apply formula if exists
      if (subSession.formula) {
        calculatedValue = this.applyFormula(subSession.formula, inputs, session);
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

    if (session.formula) {
      calculatedValue = this.applyFormula(session.formula, inputs, session);
    }

    const subResults = session.subSessions.map(subSession => calculateSubSession(subSession));

    return {
      sessionId: session.id,
      name: session.name,
      inputValue: input?.value,
      calculatedValue,
      formula: session.formula,
      subResults,
    };
  }

  private applyFormula(formula: Formula, inputs: CalculationInput[], session: Session): number {
    console.log('Applying formula:', formula);
    console.log('Inputs:', inputs);
    
    const getValue = (operand: FormulaOperand): number => {
      console.log('Getting value for operand:', operand);
      
      switch (operand.type) {
        case 'input':
          const inputValue = parseFloat(operand.value) || 0;
          console.log('Input value:', inputValue);
          return inputValue;
        case 'session':
          // Find the referenced session and get its calculated value
          const sessionInput = inputs.find(input => 
            input.sessionId === operand.value && !input.subSessionId
          );
          const sessionValue = sessionInput?.value || 0;
          console.log('Session value:', sessionValue);
          return sessionValue;
        case 'subsession':
          // Find the referenced sub-session and get its calculated value
          const subSessionInput = inputs.find(input => 
            input.sessionId === session.id && input.subSessionId === operand.value
          );
          
          // If we have a direct input value, use it
          if (subSessionInput) {
            console.log('Direct sub-session input value:', subSessionInput.value);
            return subSessionInput.value;
          }
          
          // If no direct input, try to find the sub-session and calculate it
          const findAndCalculateSubSession = (subSessions: SubSession[]): number => {
            for (const subSession of subSessions) {
              if (subSession.id === operand.value) {
                // Calculate this sub-session
                const subInput = inputs.find(input => 
                  input.sessionId === session.id && input.subSessionId === subSession.id
                );
                let calculatedValue = subInput?.value || 0;
                
                if (subSession.formula) {
                  calculatedValue = this.applyFormula(subSession.formula, inputs, session);
                }
                
                console.log('Calculated sub-session value:', calculatedValue);
                return calculatedValue;
              }
              if (subSession.subSessions.length > 0) {
                const result = findAndCalculateSubSession(subSession.subSessions);
                if (result !== 0) return result;
              }
            }
            return 0;
          };
          
          const calculatedSubValue = findAndCalculateSubSession(session.subSessions);
          console.log('Calculated sub-session value:', calculatedSubValue);
          return calculatedSubValue;
        default:
          return 0;
      }
    };

    if (formula.operands.length === 0) {
      console.log('No operands in formula, returning 0');
      return 0;
    }

    let result = getValue(formula.operands[0]);
    console.log('Initial result:', result);

    // Apply each operand's operation to the result
    for (let i = 1; i < formula.operands.length; i++) {
      const operand = formula.operands[i];
      const operandValue = getValue(operand);
      
      console.log(`Applying ${operand.operation} with value ${operandValue} to result ${result}`);
      
      switch (operand.operation) {
        case 'add':
          result += operandValue;
          break;
        case 'subtract':
          result -= operandValue;
          break;
        case 'multiply':
          result *= operandValue;
          break;
        case 'divide':
          result = operandValue !== 0 ? result / operandValue : 0;
          break;
        default:
          break;
      }
      
      console.log('Result after operation:', result);
    }

    console.log('Final formula result:', result);
    return result;
  }

  // Till Management
  async createTill(till: Omit<Till, 'id' | 'createdAt' | 'updatedAt'>): Promise<Till> {
    console.log('tillService.createTill(): creating till with name:', till.name);
    console.log('tillService.createTill(): current mockTills length before:', mockTills.length);
    
    const newTill: Till = {
      ...till,
      id: `till_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('tillService.createTill(): new till id:', newTill.id);
    mockTills.push(newTill);
    
    console.log('tillService.createTill(): current mockTills length after:', mockTills.length);
    console.log('tillService.createTill(): all tills:', mockTills.map(t => ({ id: t.id, name: t.name })));
    
    return newTill;
  }

  async getTills(): Promise<Till[]> {
    console.log('tillService.getTills(): mockTills length:', mockTills.length);
    mockTills.forEach((till, index) => {
      console.log(`  Till ${index}:`, till.name, 'sessions:', till.sessions.length);
    });
    return mockTills;
  }

  async getTill(tillId: string): Promise<Till | null> {
    return mockTills.find(t => t.id === tillId) || null;
  }

  async updateTill(tillId: string, updates: Partial<Till>): Promise<Till | null> {
    console.log('tillService.updateTill(): updating tillId:', tillId);
    console.log('tillService.updateTill(): updates:', updates);
    console.log('tillService.updateTill(): current mockTills length:', mockTills.length);
    
    const idx = mockTills.findIndex(t => t.id === tillId);
    console.log('tillService.updateTill(): found till at index:', idx);
    
    if (idx === -1) {
      console.log('tillService.updateTill(): till not found!');
      return null;
    }
    
    mockTills[idx] = { ...mockTills[idx], ...updates, updatedAt: new Date() };
    console.log('tillService.updateTill(): updated till sessions:', mockTills[idx].sessions.length);
    return mockTills[idx];
  }

  async deleteTill(tillId: string): Promise<boolean> {
    const idx = mockTills.findIndex(t => t.id === tillId);
    if (idx === -1) return false;
    mockTills.splice(idx, 1);
    return true;
  }

  // Calculate a Till (recursively calculates all Sessions and applies Till formula if present)
  calculateTill(till: Till, inputs: CalculationInput[]): CalculationResult {
    // Calculate all sessions in the till
    const sessionResults = till.sessions.map(session => this.calculateSession(session, inputs));
    let calculatedValue = 0;
    if (till.formula) {
      // If Till has a formula, apply it (operands can reference sessions by id)
      const getValue = (operand: FormulaOperand): number => {
        switch (operand.type) {
          case 'input':
            return parseFloat(operand.value) || 0;
          case 'session':
            const sessionResult = sessionResults.find(s => s.sessionId === operand.value);
            return sessionResult ? sessionResult.calculatedValue : 0;
          case 'subsession':
            // Find the session containing this subsession
            for (const sessionResult of sessionResults) {
              const findSub = (subResults: CalculationResult[]): number | null => {
                for (const sub of subResults) {
                  if (sub.subSessionId === operand.value) return sub.calculatedValue;
                  if (sub.subResults && sub.subResults.length > 0) {
                    const found = findSub(sub.subResults);
                    if (found !== null) return found;
                  }
                }
                return null;
              };
              const found = findSub(sessionResult.subResults || []);
              if (found !== null) return found;
            }
            return 0;
          default:
            return 0;
        }
      };
      if (till.formula.operands.length > 0) {
        calculatedValue = getValue(till.formula.operands[0]);
        for (let i = 1; i < till.formula.operands.length; i++) {
          const operand = till.formula.operands[i];
          const operandValue = getValue(operand);
          switch (operand.operation) {
            case 'add':
              calculatedValue += operandValue;
              break;
            case 'subtract':
              calculatedValue -= operandValue;
              break;
            case 'multiply':
              calculatedValue *= operandValue;
              break;
            case 'divide':
              calculatedValue = operandValue !== 0 ? calculatedValue / operandValue : 0;
              break;
            default:
              break;
          }
        }
      }
    } else {
      // If no formula, sum all session results
      calculatedValue = sessionResults.reduce((sum, s) => sum + s.calculatedValue, 0);
    }
    return {
      sessionId: till.id, // Use sessionId for compatibility
      name: till.name,
      calculatedValue,
      formula: till.formula,
      subResults: sessionResults,
    };
  }
}

export const tillService = new TillService(); 