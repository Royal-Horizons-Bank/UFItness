import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert, useColorScheme 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, G, Rect } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { PALETTE } from '../constants/theme';

const { width } = Dimensions.get('window');
const SCREEN_PADDING = 40; 
const AVAILABLE_WIDTH = width - SCREEN_PADDING; 
const CHART_HEIGHT = 220;
const CHART_PADDING_TOP = 20;
const CHART_PADDING_BOTTOM = 30;

// --- HELPERS ---
const getLocalISODate = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

const formatDateLabel = (date, filter) => {
  if (filter === 'D') return `${date.getHours()}:00`;
  if (filter === 'W') return date.toLocaleDateString('en-US', { weekday: 'narrow' });
  if (filter === 'M') return date.getDate().toString();
  if (filter === '6M' || filter === 'Y') return date.toLocaleDateString('en-US', { month: 'narrow' });
  return '';
};

const formatFullDate = (date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const FilterPill = ({ label, active, onPress, colors, styles }) => (
  <TouchableOpacity 
    style={[
      styles.filterPill, 
      { backgroundColor: active ? (colors.text === '#000000' ? '#E5E5EA' : '#3A3A3C') : 'transparent' } 
    ]} 
    onPress={onPress}
  >
    <Text style={[
      styles.filterText, 
      { color: active ? colors.text : colors.textDim, fontWeight: active ? '700' : '500' }
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const BodyStatsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);

  const { userData, updateBodyStats } = useUser();
  const { metric, label, unit, color } = route.params; 

  const [newValue, setNewValue] = useState('');
  const [filter, setFilter] = useState('6M'); // W, M, 6M, Y
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Clear selection on filter change
  useEffect(() => setSelectedPoint(null), [filter]);

  // --- 1. DATA PROCESSING ---
  const { graphPoints, stats, chartConfig } = useMemo(() => {
    const history = userData?.history || [];
    const now = new Date();
    let cutoffDate = new Date();
    let gap = 50; // pixels between points

    // 1. Define Range
    if (filter === 'W') { cutoffDate.setDate(now.getDate() - 7); gap = AVAILABLE_WIDTH / 7; }
    else if (filter === 'M') { cutoffDate.setMonth(now.getMonth() - 1); gap = 40; }
    else if (filter === '6M') { cutoffDate.setMonth(now.getMonth() - 6); gap = 60; }
    else if (filter === 'Y') { cutoffDate.setFullYear(now.getFullYear() - 1); gap = 40; }

    // 2. Filter & Sort Data
    let rawData = history
      .filter(item => item.type === metric)
      .map(item => ({
        value: Number(item.value),
        date: new Date(item.date),
        timestamp: new Date(item.date).getTime()
      }))
      .filter(item => item.date >= cutoffDate)
      .sort((a, b) => a.timestamp - b.timestamp);

    // 3. Inject Current Value if needed (to ensure graph isn't empty)
    const currentVal = metric === 'weight' ? userData.weight : userData.height;
    if (currentVal && (rawData.length === 0 || rawData[rawData.length - 1].timestamp < now.getTime() - 86400000)) {
       // If no data today, allow current stats to represent "now"
       rawData.push({ value: Number(currentVal), date: now, timestamp: now.getTime(), isProjected: true });
    }

    // 4. Calculate Min/Max for Y-Axis Scaling
    const values = rawData.map(d => d.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    
    // Add "breathing room" so line doesn't hit edges
    if (minVal === maxVal) { minVal -= 5; maxVal += 5; }
    else {
        const spread = maxVal - minVal;
        minVal -= spread * 0.2; // 20% padding bottom
        maxVal += spread * 0.1; // 10% padding top
    }

    // 5. Generate Graph Coordinates
    const points = rawData.map((d, i) => {
        // Just distribute them evenly by index for smoother scrolling line
        // (Alternatively we could map by exact time, but index is cleaner for UI)
        const x = (i * gap) + (gap / 2); 
        const y = CHART_HEIGHT - CHART_PADDING_BOTTOM - ((d.value - minVal) / (maxVal - minVal)) * (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM);
        return { x, y, value: d.value, date: d.date, label: formatDateLabel(d.date, filter) };
    });

    // 6. Stats Calculation
    const latest = points.length > 0 ? points[points.length - 1].value : 0;
    const start = points.length > 0 ? points[0].value : 0;
    const change = latest - start;
    const best = metric === 'weight' ? Math.min(...values) : Math.max(...values); // Min weight is usually best, Max height best

    return {
        graphPoints: points,
        stats: { latest, change, best },
        chartConfig: { width: Math.max(AVAILABLE_WIDTH, points.length * gap), gap }
    };
  }, [userData, metric, filter]);

  // --- 2. PATH GENERATION ---
  const linePath = useMemo(() => {
    if (graphPoints.length === 0) return '';
    // SVG Path Command: Move to first, Line to rest
    return graphPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }, [graphPoints]);

  // --- ACTIONS ---
  const handleUpdate = async () => {
    if (!newValue) return;
    setLoading(true);
    let w = metric === 'weight' ? newValue : null;
    let h = metric === 'height' ? newValue : null;
    const res = await updateBodyStats(w, h);
    setLoading(false);
    if (res.success) {
      setNewValue('');
      Alert.alert("Success", `${label} updated!`);
    } else {
      Alert.alert("Error", "Could not update.");
    }
  };

  const handlePointPress = (p) => {
    setSelectedPoint(selectedPoint === p ? null : p);
  };

  const displayValue = selectedPoint ? selectedPoint.value : stats.latest;
  const displayDate = selectedPoint ? formatFullDate(selectedPoint.date) : "Current";
  const displayLabel = selectedPoint ? "Recorded on" : "Latest Reading";

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={color} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>{label}</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* FILTERS */}
          <View style={[styles.segmentContainer, { backgroundColor: colors.surface }]}>
            {['W', 'M', '6M', 'Y'].map((f) => (
              <FilterPill 
                key={f} label={f} active={filter === f} 
                colors={colors} styles={styles} onPress={() => setFilter(f)} 
              />
            ))}
          </View>

          {/* SUMMARY BLOCK */}
          <View style={styles.summaryBlock}>
            <Text style={styles.rangeLabel}>{displayLabel} <Text style={{fontWeight:'400'}}>{displayDate}</Text></Text>
            <Text style={[styles.averageBig, { color: colors.text }]}>
              {displayValue} <Text style={styles.unitSmall}>{unit}</Text>
            </Text>
          </View>

          {/* SCROLLABLE CHART */}
          <View style={styles.chartWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 0 }}
            >
              <Svg height={CHART_HEIGHT} width={chartConfig.width}>
                <Defs>
                  <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity="0.5" />
                    <Stop offset="1" stopColor={color} stopOpacity="0" />
                  </LinearGradient>
                </Defs>

                {/* Grid Lines */}
                {[0, 0.33, 0.66, 1].map((pos, i) => (
                  <Line key={i} x1="0" y1={pos * (CHART_HEIGHT - 30)} x2={chartConfig.width} y2={pos * (CHART_HEIGHT - 30)} stroke={colors.border} strokeDasharray="4, 4" strokeWidth="1" />
                ))}

                {/* Data Line */}
                <Path d={linePath} stroke={color} strokeWidth="3" fill="none" />
                
                {/* Gradient Fill (Polygon closing the loop) */}
                {graphPoints.length > 1 && (
                    <Path d={`${linePath} L ${graphPoints[graphPoints.length-1].x} ${CHART_HEIGHT} L ${graphPoints[0].x} ${CHART_HEIGHT} Z`} fill="url(#gradient)" />
                )}

                {/* Interactive Points */}
                {graphPoints.map((p, i) => {
                  const isSelected = selectedPoint === p;
                  return (
                    <G key={i} onPress={() => handlePointPress(p)}>
                      {/* Invisible larger touch target */}
                      <Rect x={p.x - 15} y={0} width={30} height={CHART_HEIGHT} fill="transparent" />
                      
                      {/* Visible Dot */}
                      <Circle 
                        cx={p.x} cy={p.y} 
                        r={isSelected ? 6 : 4} 
                        fill={colors.background} 
                        stroke={color} 
                        strokeWidth={isSelected ? 3 : 2} 
                      />

                      {/* X-Axis Label */}
                      {p.label && (i % 2 === 0 || filter !== 'Y') && (
                        <SvgText
                          x={p.x} y={CHART_HEIGHT - 5}
                          fontSize="10" fill={colors.textDim}
                          textAnchor="middle"
                        >
                          {p.label}
                        </SvgText>
                      )}
                    </G>
                  );
                })}
              </Svg>
            </ScrollView>
          </View>

          {/* DETAILS CARDS */}
          <View style={styles.cardContainer}>
             <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
             
             {/* 1. Trend */}
             <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
               <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                 <View>
                    <Text style={styles.cardLabel}>Total Change</Text>
                    <Text style={[styles.cardBody, { color: colors.text, marginTop: 4 }]}>
                        {Math.abs(stats.change).toFixed(1)} {unit}
                    </Text>
                 </View>
                 <View style={{alignItems: 'flex-end'}}>
                     <Text style={[styles.trendValue, { color: stats.change <= 0 ? (metric === 'weight' ? '#4CAF50' : '#FF3B30') : (metric === 'weight' ? '#FF3B30' : '#4CAF50') }]}>
                        {stats.change > 0 ? '+' : ''}{stats.change}
                     </Text>
                     <Text style={styles.cardLabelSmall}>since start of period</Text>
                 </View>
               </View>
             </View>

             <View style={{height: 10}} />

             {/* 2. Highlights */}
             <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                 <View style={{flexDirection:'row', alignItems:'center', marginBottom:8}}>
                    <Ionicons name="trophy" size={16} color="#FFD60A" style={{marginRight:6}} />
                    <Text style={[styles.cardHeaderTitle, { color }]}>Personal Best</Text>
                 </View>
                 <Text style={[styles.cardBody, { color: colors.text }]}>
                   Your best recorded {label.toLowerCase()} in this period was <Text style={{fontWeight:'bold'}}>{stats.best} {unit}</Text>.
                 </Text>
             </View>
          </View>

          {/* UPDATE INPUT CARD */}
          <View style={styles.cardContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Update {label}</Text>
            <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <TextInput 
                  style={[styles.input, { color: colors.text }]}
                  placeholder={`Enter new ${unit}...`}
                  placeholderTextColor={colors.textDim}
                  keyboardType="numeric"
                  value={newValue}
                  onChangeText={setNewValue}
               />
               <Text style={styles.inputUnit}>{unit}</Text>
               <TouchableOpacity 
                 style={[styles.addBtn, { backgroundColor: color }]} 
                 onPress={handleUpdate}
                 disabled={loading || !newValue}
               >
                 {loading ? <MaterialCommunityIcons name="dots-horizontal" size={24} color="#FFF" /> : <Ionicons name="arrow-up" size={24} color="#FFF" />}
               </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  
  segmentContainer: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 10, padding: 3, marginBottom: 20 },
  filterPill: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  filterText: { fontSize: 13 },

  summaryBlock: { paddingHorizontal: 20, marginBottom: 10 },
  rangeLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  averageBig: { fontSize: 28, fontWeight: '700' },
  unitSmall: { fontSize: 16, color: colors.textDim, fontWeight: '500' },

  chartWrapper: { height: CHART_HEIGHT, marginBottom: 20, paddingHorizontal: 20 },

  cardContainer: { paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  infoCard: { borderRadius: 16, padding: 16 },
  
  cardLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  cardLabelSmall: { color: colors.textDim, fontSize: 11 },
  trendValue: { fontSize: 18, fontWeight: '800' },
  cardBody: { fontSize: 15, lineHeight: 22 },
  cardHeaderTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },

  inputCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 6, paddingLeft: 16, borderWidth: 1 },
  input: { flex: 1, fontSize: 18, fontWeight: '600', paddingVertical: 12 },
  inputUnit: { fontSize: 16, color: colors.textDim, marginRight: 15, fontWeight: '600' },
  addBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});

export default BodyStatsScreen;