import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
     <ScrollView>
    <View style={styles.textHistory}>
        <Text style={styles.textLeft}>Name:  </Text>
        <Text style={styles.textRight}>Animal Studies</Text>
    </View>
    <View style={styles.textHistory}>
        <Text style={styles.textLeft}>Date:  </Text>
        <Text style={styles.textRight}>2026-10-01</Text>
    </View> 
     </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  textHistory:{
    flexDirection:'row',
    borderWidth:1,
    borderRadius:10,
    borderColor:'#FFB100',
    width:320,
    height:50,
    marginBottom:5,
  },
  textRight:{
    color:'#F4EFC8',
    fontSize:18,
    lineHeight:24,
  },
  textLeft:{
    color:'#F4EFC8',
    fontSize:18,
    lineHeight:24,
  },
  background: { backgroundColor: '#1E1F24' },
  container: { flex: 1, alignItems: 'center', padding: 24, backgroundColor: '#1E1F24'  },
  title: { fontSize: 28, fontWeight: '500', color: '#F4EFC8', marginBottom:20},
});