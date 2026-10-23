import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function FlashcardsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flashcards</Text>
      <ScrollView style={styles.cardList}>
        <View style={styles.flashcards}>
          <Text style={styles.cardie}>Flashcard 1</Text>
        </View>
        <View style={styles.flashcards}>
          <Text style={styles.cardie}>Flashcard 2</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardList:{
    flex:1,
    width:'100%',
  },
  flashcards:{
    borderWidth:1,
    borderColor:'#FFB100',
    borderRadius:12,
    padding:12,
    marginBottom:10,
    marginTop:20,
    height:150,
    backgroundColor: '#2B2D34',
  },
  cardie:{
    color:'#F4EFC8',
    lineHeight:24,
    fontWeight:'500',
    fontSize:18,
  },
  background: { backgroundColor: '#1E1F24' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#1E1F24'  },
  title: { fontSize: 28, fontWeight: '500', color: '#F4EFC8' },
});
