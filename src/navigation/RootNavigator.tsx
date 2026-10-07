import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import HomeScreen from '../screens/HomeScreen';
import SummaryScreen from '../screens/SummaryScreen';
import FlashcardsScreen from '../screens/FlashcardsScreen';
import QuestionsScreen from '../screens/QuestionsScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootDrawerParamList = {
  Home: undefined;
  Summary: { materialId?: number } | undefined;
  Flashcards: { materialId?: number } | undefined;
  Questions: { materialId?: number } | undefined;
  Settings: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName="Home">
        <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'My library' }} />
        <Drawer.Screen name="Summary" component={SummaryScreen} options={{ title: 'Summaries' }} />
        <Drawer.Screen name="Flashcards" component={FlashcardsScreen} options={{ title: 'Flashcards' }} />
        <Drawer.Screen name="Questions" component={QuestionsScreen} options={{ title: 'Questions & answers' }} />
        <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
