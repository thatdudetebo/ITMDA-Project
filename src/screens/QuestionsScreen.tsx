import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function QuestionsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.qCards}>
          <Text style={styles.qCardies}>Question 1</Text>
        </View>
        <View style={styles.aCards}>
          <Text style={styles.aCardies}>Answer 1</Text>
        </View>
        <View style={styles.qCards}>
          <Text style={styles.qCardies}>Question 2</Text>
        </View>
        <View style={styles.aCards}>
          <Text style={styles.aCardies}>Answer 2</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  qCards:{
    borderColor:'#FFB100',
    borderWidth:1,
    borderRadius:12,
    backgroundColor:'#2B2D34',
    marginBottom:10,
    width:320,
    height:100,
    padding:20,
    
  },
  qCardies:{
    color:'#F4EFC8',
    fontSize:18,
    lineHeight:24,
    
  },
  aCards:{
    borderColor:'#FFB100',
    borderWidth:1,
    borderRadius:12,
    backgroundColor:'#2B2D34',
    marginBottom:40,
    width:320,
    height:100,
    padding:20,
  },
  aCardies:{
    color:'#F4EFC8',
    fontSize:18,
    lineHeight:24,
  },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#1E1F24' },
  title: { fontSize: 28, fontWeight: '500', color: '#F4EFC8', marginTop:10 },
});
