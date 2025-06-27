# I1 - Till Formulation & Calculation App

A comprehensive cross-platform mobile application for creating and managing till formulations and performing calculations with hierarchical structures.

## Features

### 🔐 Authentication
- User registration and login
- Secure authentication with Firebase
- User profile management

### 📊 Till Formulation
- **Create Sessions**: Define main calculation sessions with names and descriptions
- **Nested Sub-sessions**: Create unlimited levels of nested sub-sessions
- **Formula Definition**: Define mathematical formulas for each session/sub-session
- **Hierarchical Structure**: Visual representation of the session hierarchy
- **Drag & Drop Ready**: Structure supports reordering (UI implementation pending)

### 🧮 Till Calculation
- **Input Management**: Enter values for each session and sub-session
- **Formula Application**: Automatically apply defined formulas recursively
- **Visual Results**: Display calculation flow with hierarchical results
- **History Tracking**: Save and view previous calculations
- **Real-time Computation**: Instant calculation updates

### 💾 Data Management
- **Offline Support**: SQLite local storage for offline functionality
- **Cloud Sync**: Firebase integration for data synchronization
- **Cross-device**: Access your formulations from any device

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Idea_1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/emulator**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

## Usage Guide

### Creating a Till Formulation

1. **Sign In**: Create an account or sign in to your existing account
2. **Navigate to Formulation**: Tap "Formulate" from the welcome screen
3. **Create Session**: 
   - Tap "+ Create New Session"
   - Enter session name and description
   - Tap "Create"
4. **Add Sub-sessions**:
   - Tap "+ Sub" on any session
   - Enter sub-session details
   - Repeat for nested sub-sessions
5. **Define Formulas**:
   - Tap "Formula" on any session/sub-session
   - Choose operation (+, -, ×, ÷)
   - Define operands (input, custom, or reference)
   - Set custom values if needed

### Performing Calculations

1. **Navigate to Calculation**: Tap "Calculate" from the welcome screen
2. **Select Session**: Choose a formulated session to calculate
3. **Enter Values**: 
   - Input values for each session/sub-session
   - Values are automatically validated
4. **View Results**: 
   - See calculated results with formulas applied
   - View hierarchical breakdown
   - Check total calculations

### Formula Types

- **Addition (+)**: Adds two operands
- **Subtraction (-)**: Subtracts second operand from first
- **Multiplication (×)**: Multiplies two operands
- **Division (÷)**: Divides first operand by second

### Operand Types

- **Input**: Direct user input value
- **Custom**: Fixed value defined in formula
- **Reference**: Value from another session/sub-session

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── PostCard.tsx
│   └── HierarchicalView.tsx
├── constants/           # App constants
│   ├── colors.ts
│   └── firebase.ts
├── navigation/          # Navigation configuration
│   └── index.tsx
├── screens/            # App screens
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── TillFormulationScreen.tsx
│   ├── TillCalculationScreen.tsx
│   ├── ProfileScreen.tsx
│   └── ...
├── services/           # Business logic and API
│   ├── firebase.ts
│   ├── sqlite.ts
│   ├── sync.ts
│   └── tillService.ts
└── types/              # TypeScript type definitions
    └── index.ts
```

## Data Models

### Session
```typescript
interface Session {
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
```

### SubSession
```typescript
interface SubSession {
  id: string;
  name: string;
  description?: string;
  order: number;
  formula?: Formula;
  subSessions: SubSession[];
  parentId?: string;
}
```

### Formula
```typescript
interface Formula {
  id: string;
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  operand1: string;
  operand2: string;
  customValue?: number;
}
```

### Calculation
```typescript
interface Calculation {
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
```

## Technical Stack

- **Frontend**: React Native with TypeScript
- **Navigation**: React Navigation v6
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore + SQLite (offline)
- **UI Framework**: React Native built-in components
- **Development**: Expo SDK 53

## Development

### Adding New Features

1. **Create Types**: Add new interfaces in `src/types/index.ts`
2. **Create Service**: Add business logic in `src/services/`
3. **Create Screen**: Add new screens in `src/screens/`
4. **Update Navigation**: Add routes in `src/navigation/index.tsx`
5. **Test**: Run on device/emulator

### Code Style

- Use TypeScript for all new code
- Follow React Native best practices
- Use functional components with hooks
- Implement proper error handling
- Add loading states for async operations

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **TypeScript errors**: Run `npx tsc --noEmit` to check types
3. **Navigation issues**: Ensure all routes are properly typed
4. **Firebase connection**: Check configuration in `src/constants/firebase.ts`

### Performance Tips

- Use React.memo for expensive components
- Implement proper list virtualization for large datasets
- Optimize images and assets
- Use proper key props for lists

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

---

**I1** - Formulate • Calculate • Optimize 