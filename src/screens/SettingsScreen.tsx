import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-gesture-handler';

export default function SettingsScreen() {
  const [enhancedMode, setEnhancedMode] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Profile Information</Text>
        <View style={styles.infoBox}>
          <Text style={styles.label}>First & Last Name: </Text>
          <Text style={styles.infoText}>John Doe</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.label}>Email Adress: </Text>
          <Text style={styles.infoText}>johndoe@anything.com</Text>
        </View>

        <Text style={styles.preference}>App Preferences</Text>
        <View style={styles.modeBoxCont}>
          <View style={styles.modeBox}>
            <Text style={styles.modeTitle}>Enhanced Mode</Text>
            <Text style={styles.description}>Allow internet-based features</Text>
          </View>
          <Switch value={enhancedMode} onValueChange={setEnhancedMode} trackColor={{false:'#45464D',true:'#F4EFC8'}} thumbColor={enhancedMode?'#BDBDBD': '#515259'}/>
        </View>
        <Text style={styles.status}>EnhancedMode is {enhancedMode ? 'Enabled' : 'Disabled'}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox:{
    borderWidth:1,
    borderColor:'#FFB100',
    borderRadius:10,
    marginTop:15,
    width:325,
  },
  label:{
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
    color: '#F4EFC8',
  },
  infoText:{
    fontSize: 14,
    marginTop: 8,
    textAlign:'center',
    color: '#F4EFC8',
  },
  preference:{
    fontSize: 18,
    marginTop: 40,
    textAlign: 'center',
    color: '#F4EFC8',
  },
  modeBoxCont:{
    borderWidth:1,
    borderColor:'#FFB100',
    borderRadius:10,
    padding:12,
    marginTop:20,
    marginBottom:10,
  },
  modeBox:{
    borderWidth:1,
    borderColor:'#FFB100',
    borderRadius:10,
    padding:16,
    marginBottom:10,
  },
  modeTitle:{
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#F4EFC8',
  },
  description:{
    fontSize: 10,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
    color: '#F4EFC8',
  },
  status:{
    fontSize: 10,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
    color: '#F4EFC8',
  },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24,  backgroundColor: '#1E1F24' },
  title: { fontSize: 28, marginTop: 8, textAlign: 'center',color: '#F4EFC8', 'marginBottom':16},
});
