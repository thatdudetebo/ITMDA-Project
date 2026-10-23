import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SummaryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Summaries</Text>
      <View style={styles.summaryBox}>
        <ScrollView>
          <Text style={styles.summaryText}>Generated summaries appear here</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryBox:{
    flex: 1,
    width:'100%',
    borderWidth:1,
    borderColor:'#FFB100',
    borderRadius:10,
    padding:12,
    marginTop:20,
    marginBottom:60,
    backgroundColor:'#2B2D34',

  },
  summaryText:{
    color:'#F4EFC8',
    fontSize:16,
    lineHeight:24,
  },
  background: { backgroundColor: '#1E1F24' },
  container: { flex: 1, alignItems: 'center', padding: 24, backgroundColor:'#1E1F24', color:'#F4EFC8' },
  title: { fontSize: 28, fontWeight: '500', color:'#F4EFC8', marginTop:10},
  subtitle: { fontSize: 14, opacity: 0.6, marginTop: 8, textAlign: 'center', color: '#F4EFC8'},
  
});
