// Shown on a feature screen when no material is selected.

import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { StyleSheet, Text, View } from 'react-native';

import type { RootDrawerParamList } from '../navigation/RootNavigator';
import { colors } from '../theme';
import AppButton from './AppButton';

export default function NoMaterial() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No material is selected.</Text>
      <Text style={styles.hint}>Upload a PDF or choose one from your library first.</Text>
      <AppButton label="Go to My Library" onPress={() => navigation.navigate('Home')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { color: colors.text, fontSize: 18, fontWeight: '500' },
  hint: { color: colors.text, opacity: 0.6, textAlign: 'center', marginBottom: 8 },
});
