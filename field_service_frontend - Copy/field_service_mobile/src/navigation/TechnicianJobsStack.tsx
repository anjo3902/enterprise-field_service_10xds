import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import JobListScreen from '../screens/technician/JobListScreen';
import PrevisitBriefingScreen from '../screens/technician/PrevisitBriefingScreen';
import ReportWorkflowScreen from '../screens/technician/ReportWorkflowScreen';
import type { TechnicianJobsStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<TechnicianJobsStackParamList>();

export default function TechnicianJobsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="JobList"
        component={JobListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrevisitBriefing"
        component={PrevisitBriefingScreen}
        options={{ title: 'Prepare Visit (AI)' }}
      />
      <Stack.Screen
        name="ReportWorkflow"
        component={ReportWorkflowScreen}
        options={{ title: 'Report Workflow' }}
      />
    </Stack.Navigator>
  );
}

