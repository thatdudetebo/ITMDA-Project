import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';

import InferenceDevScreen from '../dev/InferenceDevScreen';
import FlashcardsScreen from '../screens/FlashcardsScreen';
import HomeScreen from '../screens/HomeScreen';
import QuestionsScreen from '../screens/QuestionsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SummaryScreen from '../screens/SummaryScreen';

export type RootDrawerParamList = {
  Home: undefined;
  Summary: { materialId?: number } | undefined;
  Flashcards: { materialId?: number } | undefined;
  Questions: { materialId?: number } | undefined;
  Settings: undefined;
  InferenceLab: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName="Home">
        <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'My library' }} />
        <Drawer.Screen name="Summary" component={SummaryScreen} options={{ title: 'Summaries' }} />
        <Drawer.Screen
          name="Flashcards"
          component={FlashcardsScreen}
          options={{ title: 'Flashcards' }}
        />
        <Drawer.Screen
          name="Questions"
          component={QuestionsScreen}
          options={{ title: 'Questions & answers' }}
        />
        <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Drawer.Screen
          name="InferenceLab"
          component={InferenceDevScreen}
          options={{ title: 'Inference Lab' }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
