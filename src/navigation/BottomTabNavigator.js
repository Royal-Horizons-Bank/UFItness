import React from 'react';
import { StyleSheet, Platform, useColorScheme, View } from 'react-native'; 
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Screens
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import SummaryScreen from '../screens/SummaryScreen';
import DailyScreen from '../screens/DailyScreen';
import CompeteScreen from '../screens/CompeteScreen';

import { PALETTE, BLUR_INTENSITY } from '../constants/theme';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const theme = useColorScheme() || 'light'; 
  const currentColors = PALETTE[theme]; 

  
  const renderGlowIcon = (name, focused, color, size) => {
    return (
      <View style={[
        styles.iconContainer,
        focused && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 7, 
          elevation: 5 
        }
      ]}>
        <Ionicons name={name} size={size} color={color} />
      </View>
    );
  };

  return (
    <Tab.Navigator
      initialRouteName="Summary"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: currentColors.tabIconActive,
        tabBarInactiveTintColor: currentColors.tabIconInactive,
        // Dynamic Blur Tint ito
        tabBarBackground: () => (
          <BlurView 
            tint={currentColors.blurTint} 
            intensity={BLUR_INTENSITY} 
            style={StyleSheet.absoluteFill} 
          />
        ),
      })}
    >
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => 
            renderGlowIcon("person-circle-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tab.Screen 
        name="Workout" 
        component={WorkoutScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => 
            renderGlowIcon("barbell-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tab.Screen 
        name="Summary" 
        component={SummaryScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => 
            renderGlowIcon("grid-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tab.Screen 
        name="Compete" 
        component={CompeteScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => 
            renderGlowIcon("trophy-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tab.Screen 
        name="Daily" 
        component={DailyScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => 
            renderGlowIcon("calendar-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 60,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    
    width: 40, 
    height: 40,
  }
});

export default BottomTabNavigator;