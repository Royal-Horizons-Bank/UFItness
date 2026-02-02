import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, 
  useColorScheme, TouchableOpacity, RefreshControl 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { PALETTE } from '../constants/theme';
import { useUser } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';

const SummaryScreen = () => {
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);
  const navigation = useNavigation();
  
  const { userData, addWater, refreshData } = useUser();
  const { stats, schedule = [], name, history = [] } = userData || {}; 
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('Good Morning,');

  const DAILY_STEP_GOAL = stats?.stepGoal || 10000;
  const DAILY_WATER_GOAL = stats?.hydrationGoal || 2500;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning,');
    else if (hour < 18) setGreeting('Good Afternoon,');
    else setGreeting('Good Evening,');
  }, []);

  const getLocalTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayString = getLocalTodayString();
  
  const todaysEvents = (schedule || [])
    .filter(item => item.dateString === todayString)
    .sort((a, b) => a.rawStart - b.rawStart);

  const nowMs = Date.now();
  const currentGap = schedule.find(item => {
    return (
      item.type === 'gap' && 
      item.dateString === todayString && 
      item.rawStart <= nowMs && 
      item.rawEnd > nowMs
    );
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  // --- COMPONENTS ---

  const WeeklyChart = ({ history }) => {
    const chartData = useMemo(() => {
      const today = new Date();
      const dayOfWeek = today.getDay(); 
      const distToMon = (dayOfWeek + 6) % 7; 
      const monday = new Date(today);
      monday.setDate(today.getDate() - distToMon);
      monday.setHours(0, 0, 0, 0);

      const weekData = Array(7).fill(0);
      const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

      history.forEach(item => {
        if (!item.calories) return;
        const itemDate = new Date(item.date);
        const diffTime = itemDate - monday;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays < 7) {
          weekData[diffDays] += parseInt(item.calories);
        }
      });

      const maxValue = Math.max(...weekData, 1); 

      return weekData.map((val, index) => ({
        label: dayLabels[index],
        value: val,
        heightPercent: (val / maxValue) * 100, 
        isToday: index === distToMon,
      }));
    }, [history]);

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => navigation.navigate('History', { 
          metric: 'calories', 
          label: 'Active Energy', 
          color: '#FF9500', // Matches History Screen Orange
          unit: 'kcal' 
        })}
      >
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <View>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Calories Burned</Text>
              <Text style={[styles.chartSubtitle, { color: '#FF9500' }]}>This Week</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
          </View>
          
          <View style={styles.chartContainer}>
            {chartData.map((item, index) => (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barTrack}>
                  <View 
                    style={[
                      styles.barFill, 
                      { 
                        height: `${Math.max(item.heightPercent, 5)}%`, 
                        // UPDATED: Use Orange (#FF9500) for consistency
                        backgroundColor: item.isToday ? '#FF9500' : (item.value > 0 ? '#555' : '#333') 
                      }
                    ]} 
                  />
                </View>
                <Text style={[
                  styles.barLabel, 
                  { color: item.isToday ? '#FF9500' : colors.textDim }
                ]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ScheduleRow = ({ item }) => {
    const isGap = item.type === 'gap';
    return (
      <View style={[styles.rowContainer, isGap && styles.gapRowContainer]}>
        <Text style={styles.timeText}>{item.startTime}</Text>
        <View style={styles.rowContent}>
           <View style={[styles.dot, { backgroundColor: isGap ? '#FF453A' : (item.color || colors.primary) }]} />
           <Text style={[styles.rowTitle, isGap && styles.gapTitleText]}>{item.title}</Text>
        </View>
        {isGap && <Text style={styles.gapDurationText}>{item.duration}</Text>}
      </View>
    );
  };

  const CircularStats = ({ value, goal, color, label, subLabel, icon }) => {
    const safeValue = Number(value) || 0;
    const safeGoal = Number(goal) || 1;
    const size = 90;
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(safeValue / safeGoal, 1);
    const strokeDashoffset = circumference * (1 - progress);
    const bgStroke = theme === 'dark' ? '#2C2C2E' : '#E5E5EA';
    
    return (
      <View style={styles.circleCard}>
        <View style={styles.circleHeader}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
          <Text style={styles.circleTitle}>{label}</Text>
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            <G rotation="-90" origin={`${size/2}, ${size/2}`}>
              <Circle stroke={bgStroke} cx={size/2} cy={size/2} r={radius} strokeWidth={8} fill="transparent" />
              <Circle stroke={color} cx={size/2} cy={size/2} r={radius} strokeWidth={8} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="transparent" />
            </G>
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>{safeValue.toLocaleString()}</Text>
            <Text style={{ fontSize: 10, color: colors.textDim, fontWeight: '600' }}>{subLabel}</Text>
          </View>
        </View>
        <Text style={styles.goalText}>Goal: {safeGoal.toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.username}>{name || 'Student'}</Text>
            <Text style={styles.date}>Today's Activity</Text>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.streakPill}>
                <Ionicons name="flame" size={16} color="#FFD60A" />
                <Text style={styles.streakText}>{stats?.streak || 0} day streak</Text>
            </View>
          </View>
        </View>

        {/* --- STAT PILLS --- */}
        <View style={styles.topStatsRow}>
          <View style={styles.statPill}>
            <Ionicons name="trophy-outline" size={16} color="#FFD60A" style={{marginRight: 6}} />
            <Text style={styles.statPillText}>{stats?.workoutsCompletedToday || 0} workouts today</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>{stats?.caloriesBurnedToday || 0} cal burned</Text>
          </View>
        </View>

        {/* --- SCHEDULE CARD --- */}
        <View style={styles.largeCard}>
          <View style={styles.cardHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <Ionicons name="time-outline" size={18} color="#FF453A" style={{marginRight: 8}}/>
               <Text style={styles.cardTitle}>Fitness Window</Text>
            </View>
            <Text style={styles.cardSubtitle}>Today's Schedule</Text>
          </View>

          <View style={styles.scheduleListContainer}>
            {todaysEvents.length > 0 ? (
               <ScrollView 
                 style={{ maxHeight: 300 }} 
                 nestedScrollEnabled={true} 
                 showsVerticalScrollIndicator={false}
               >
                 {todaysEvents.map((item, index) => (
                   <ScheduleRow key={index} item={item} />
                 ))}
               </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No events scheduled today.</Text>
            )}
          </View>

          {currentGap ? (
            <TouchableOpacity style={styles.perfectWindowBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Workout')}>
              <View style={styles.btnIconCircle}><Ionicons name="flash" size={24} color="#FFD60A" /></View>
              <View style={{flex: 1}}>
                <Text style={styles.btnTitle}>You're Free Right Now!</Text>
                <Text style={styles.btnSub}>{currentGap.duration} available • Do a Micro-Workout</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          ) : (
             <View style={{ padding: 10, alignItems: 'center' }}>
                <Text style={{ color: colors.textDim, fontSize: 12 }}>
                  {todaysEvents.some(e => e.rawEnd > nowMs) ? "Busy right now." : "No more windows today."}
                </Text>
             </View>
          )}
        </View>

        <View style={styles.midRow}>
          {/* UPDATED: STEPS CARD IS NOW TOUCHABLE */}
          <TouchableOpacity 
            style={styles.halfCardWrapper} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('History', { 
              metric: 'steps', 
              label: 'Steps', 
              color: colors.danger, // Keep red for Steps
              unit: 'steps' 
            })}
          >
             <CircularStats label="Steps" icon="shoe-print" color={colors.danger} value={stats?.steps || 0} goal={DAILY_STEP_GOAL} subLabel="STEPS" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.halfCardWrapper} onPress={addWater} activeOpacity={0.7}>
             <CircularStats label="Hydration" icon="water" color="#0A84FF" value={stats?.hydrationCurrent || 0} goal={DAILY_WATER_GOAL} subLabel="ML" />
          </TouchableOpacity>
        </View>

        <WeeklyChart history={history} />

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20 },
  greeting: { fontSize: 28, fontWeight: '800', color: colors.text, lineHeight: 34 },
  username: { fontSize: 28, fontWeight: '800', color: colors.primary, lineHeight: 34, marginBottom: 4 },
  date: { fontSize: 14, color: colors.textDim },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  streakPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme === 'dark' ? 'rgba(255, 214, 10, 0.15)' : '#FFF9D6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FFD60A' },
  streakText: { color: '#C6A700', fontWeight: '600', fontSize: 12, marginLeft: 4 },
  
  topStatsRow: { flexDirection: 'row', marginBottom: 24 },
  statPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border },
  statPillText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  
  largeCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 16, marginBottom: 20, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4, alignItems: 'center' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: colors.textDim, fontSize: 12 },
  scheduleListContainer: { marginBottom: 16 },
  rowContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme === 'dark' ? '#2C2C2E' : colors.background, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  gapRowContainer: { backgroundColor: 'rgba(255, 59, 48, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.3)' },
  timeText: { width: 65, color: colors.textDim, fontSize: 13, fontWeight: '600' },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
  gapTitleText: { color: '#FF453A', fontWeight: '700' },
  gapDurationText: { color: theme === 'dark' ? '#FFD60A' : '#C6A700', fontSize: 14, fontWeight: '700' },
  emptyText: { color: colors.textDim, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
  perfectWindowBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#BB2D2D', padding: 20, borderRadius: 24, marginTop: 10, shadowColor: "#FF3B30", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  btnIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  btnTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  btnSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  
  midRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  halfCardWrapper: { width: '48%', aspectRatio: 0.85 },
  circleCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 24, padding: 16, alignItems: 'center', justifyContent: 'space-between', borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border },
  circleHeader: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 10 },
  circleTitle: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  goalText: { fontSize: 10, color: colors.textDim, marginTop: 8 },

  chartCard: { borderRadius: 24, padding: 20, borderWidth: theme === 'light' ? 1 : 0 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  chartSubtitle: { fontSize: 12, fontWeight: '600', marginBottom: 24, textTransform: 'uppercase' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  barWrapper: { alignItems: 'center', flex: 1 },
  barTrack: { width: 32, height: '98%', backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA', borderRadius: 11, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 11 },
  barLabel: { marginTop: 8, fontSize: 12, fontWeight: '600' },
});

export default SummaryScreen;