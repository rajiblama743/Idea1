import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

import WelcomeScreen from '@/screens/WelcomeScreen';
import TillFormulationScreen from '@/screens/TillFormulationScreen';
import TillCalculationScreen from '@/screens/TillCalculationScreen';
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import CalculationHistoryScreen from '@/screens/CalculationHistoryScreen';
import CalculationResultDetailScreen from '@/screens/CalculationResultDetailScreen';
import TillDetailScreen from '@/screens/TillDetailScreen';
import SessionDetailScreen from '@/screens/SessionDetailScreen';

export type RootStackParamList = {
  Welcome: undefined;
  TillFormulation: undefined;
  TillCalculation: undefined;
  Login: undefined;
  Register: undefined;
  TillDetail: { till: import('@/types').Till };
  SessionDetail: { session: import('@/types').Session; tillId?: string };
};

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 16, position: 'relative' }}>
        <TouchableOpacity
          onPress={() => props.navigation.closeDrawer()}
          style={{ position: 'absolute', top: 0, right: 0, padding: 8, zIndex: 1 }}
        >
          <Ionicons name="close" size={24} color={colors.text || '#333'} />
        </TouchableOpacity>
        <Text style={{ fontWeight: 'bold', fontSize: 28, color: colors.primary || '#4F8EF7', marginTop: 32 }}>I1</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary || '#888', marginTop: 4, textAlign: 'center', fontStyle: 'italic' }}>
          formulate - calculate - visualize
        </Text>
      </View>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Sign In"
        icon={({ color, size }) => <Ionicons name="log-in-outline" size={size} color={color} />}
        onPress={() => props.navigation.navigate('Login')}
      />
      <DrawerItem
        label="Sign Up"
        icon={({ color, size }) => <Ionicons name="person-add-outline" size={size} color={color} />}
        onPress={() => props.navigation.navigate('Register')}
      />
    </DrawerContentScrollView>
  );
}

function DrawerScreens() {
  return (
    <Drawer.Navigator
      initialRouteName="Welcome"
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        header: ({ navigation }) => (
          <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, height: 56, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginRight: 16 }}>
                <Ionicons name="menu" size={28} color={colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 22, color: colors.primary }}>I1</Text>
              </View>
              <View style={{ width: 44 }} />
            </View>
          </SafeAreaView>
        ),
      })}
    >
      <Drawer.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          drawerLabel: 'Home',
          drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="TillFormulation"
        component={TillFormulationScreen}
        options={{
          drawerLabel: 'Till Formulation',
          drawerIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="TillCalculation"
        component={TillCalculationScreen}
        options={{
          drawerLabel: 'Till Calculation',
          drawerIcon: ({ color, size }) => <Ionicons name="calculator-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="CalculationHistory"
        component={CalculationHistoryScreen}
        options={{
          drawerLabel: 'Calculation History',
          drawerIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="Login"
        component={LoginScreen}
        options={{
          drawerLabel: () => null,
          title: null,
          drawerIcon: () => null,
        }}
      />
      <Drawer.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          drawerLabel: () => null,
          title: null,
          drawerIcon: () => null,
        }}
      />
      <Drawer.Screen
        name="CalculationResultDetail"
        component={CalculationResultDetailScreen}
        options={{
          drawerLabel: () => null,
          title: 'Calculation Result',
          drawerIcon: () => null,
        }}
      />
    </Drawer.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Drawer" component={DrawerScreens} options={{ headerShown: false }} />
        <Stack.Screen name="TillDetail" component={TillDetailScreen} />
        <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
        {/* Add other detail screens here as needed */}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 