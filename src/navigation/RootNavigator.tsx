import { createDrawerNavigator } from '@react-navigation/drawer';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';

import FlashcardsScreen from '../screens/FlashcardsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HomeScreen from '../screens/HomeScreen';
import QuestionsScreen from '../screens/QuestionsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SummaryScreen from '../screens/SummaryScreen';
import { colors } from '../theme';

/**
 * Which material a screen works on comes from ActiveMaterialContext. The only parameter is
 * historyId, set when a history row is opened, and each screen clears it after reading it.
 */
export type RootDrawerParamList = {
  Home: undefined;
  Summary: { historyId?: number } | undefined;
  Flashcards: { historyId?: number } | undefined;
  Questions: { historyId?: number } | undefined;
  History: undefined;
  Settings: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.accentDark,
    notification: colors.accent,
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Drawer.Navigator
        initialRouteName="Home"
        screenOptions={{
          drawerActiveTintColor: colors.accent,
          drawerInactiveTintColor: colors.text,
          drawerActiveBackgroundColor: colors.bg,
          drawerStyle: { backgroundColor: colors.surface },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      >
        <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'StudyBee' }} />
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
        <Drawer.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
        <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
