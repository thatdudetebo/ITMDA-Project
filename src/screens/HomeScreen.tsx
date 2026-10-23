import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RootDrawerParamList } from '../navigation/RootNavigator';

export default function HomeScreen() {
  const navigation = useNavigation<RootDrawerParamList>();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentResult | null>(null);
  const handleDocumentSelection = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' }); 
    if (!result.canceled) {
      setSelectedFile(result);
    }
  };

  return (
    <View style={styles.container}>
    <Text style= {styles.title}>My Library</Text>

    <View style={styles.uploadBox}>
      <Pressable onPress={handleDocumentSelection}>
        <Text style={styles.buttonText}>Upload Document</Text>
      </Pressable>
      {selectedFile && (
        <Text style={styles.subtitle}>Selected File: {selectedFile.name}</Text>
      )}
    </View>

    <View style={styles.summary}>
      <Pressable onPress={()=>navigation.navigate('Summary')}>
        <Text style={styles.buttonText}> Generate Summary</Text>
      </Pressable>
    </View>

    <View style={styles.flashcards}>
      <Pressable onPress={()=>navigation.navigate('Flashcards')}>
        <Text style={styles.buttonText}>Generate Flashcards</Text>
      </Pressable>
    </View>

    <View style={styles.qa}>
      <Pressable onPress={()=>navigation.navigate('Questions')}>
        <Text style={styles.buttonText}>Generate Q&A's</Text>
      </Pressable>
    </View>
    </View>

  );
}

const styles = StyleSheet.create({
  qa:{
    width:'80%',
    height:80,
    borderRadius:10,
    borderWidth:1,
    borderColor:'#FFB100',
    alignItems:'center',
    justifyContent:'space-evenly',
    backgroundColor:'#2B2D34',
    marginTop:'20',
    marginLeft:'11%',
  },
  flashcards:{
    width:'80%',
    height:80,
    borderRadius:10,
    borderWidth:1,
    borderColor:'#FFB100',
    alignItems:'center',
    justifyContent:'space-evenly',
    backgroundColor:'#2B2D34',
    marginTop:'20',
    marginLeft:'11%',
  },
  summary:{
    width:'80%',
    height:80,
    borderRadius:10,
    borderWidth:1,
    borderColor:'#FFB100',
    borderColor:'#',
    alignItems:'center',
    justifyContent:'space-evenly',
    backgroundColor:'#a06f04',
    marginTop:'40',
    marginLeft:'11%',
  },
  container:{
    backgroundColor: '#1E1F24',
    flex: 1,
  },
  uploadBox: {
    width: '80%',
    height: 220,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFB100',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginTop: '40',
    marginLeft: '11%',
    padding: '15',
    backgroundColor: '#2B2D34',
    color: '#F4EFC8',
  },

  title: { fontSize: 28, fontWeight: '500', color: '#F4EFC8', textAlign: 'center', marginTop: '20' },
  subtitle: { fontSize: 14, opacity: 0.6, marginTop: 8, textAlign: 'center', color: '#F4EFC8' },
  background: { backgroundColor: '#1E1F24' },
  color: { color: '#F4EFC8'},
  buttonText:{ color:'#F4EFC8' },
});
