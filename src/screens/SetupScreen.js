import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, 
  useColorScheme, StatusBar, Dimensions, Keyboard 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PALETTE } from '../constants/theme';

const { width } = Dimensions.get('window');

const SetupScreen = () => {
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);
  
  const { completeSetup, syncDefaultCalendar } = useUser();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  
  // Date of Birth State (MM / DD / YYYY)
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [stepGoal, setStepGoal] = useState('10000');
  const [hydrationGoal, setHydrationGoal] = useState('2500');
  const [calendarSynced, setCalendarSynced] = useState(false);

  // Refs for Auto-Focus
  const monthRef = useRef(null);
  const dayRef = useRef(null);
  const yearRef = useRef(null);
  const weightRef = useRef(null);
  const heightRef = useRef(null);

  // --- ACTIONS ---

  const calculateAge = (day, month, year) => {
    if (!day || !month || !year) return null;
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSetupLater = () => {
    Alert.alert(
      "Skip Setup?",
      "We'll use default settings. You can update your profile later.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Skip & Finish", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const defaultData = {
              name: name.trim() || "Student",
              dob: null,
              age: null,
              weight: null, 
              height: null, 
              stats: { stepGoal: 10000, hydrationGoal: 2500 }
            };
            await completeSetup(defaultData);
            setLoading(false);
          }
        }
      ]
    );
  };

  const handleSkipStep = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit(); 
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert("Missing Name", "Please enter your name to continue.");
        return;
      }
      
      // Validate DOB if entered partially
      if (dobDay || dobMonth || dobYear) {
        if (dobDay.length < 1 || dobMonth.length < 1 || dobYear.length < 4) {
          Alert.alert("Invalid Date", "Please enter a complete Date of Birth (MM / DD / YYYY).");
          return;
        }
        
        // Basic Date Validation
        const m = parseInt(dobMonth);
        const d = parseInt(dobDay);
        const y = parseInt(dobYear);

        if (m < 1 || m > 12) { Alert.alert("Invalid Month", "Month must be between 01 and 12."); return; }
        if (d < 1 || d > 31) { Alert.alert("Invalid Day", "Day must be between 01 and 31."); return; }
        if (y < 1900 || y > new Date().getFullYear()) { Alert.alert("Invalid Year", "Please check the year."); return; }

        const age = calculateAge(dobDay, dobMonth, dobYear);
        if (age < 5 || age > 100 || isNaN(age)) {
          Alert.alert("Invalid Age", "Please check your birth year.");
          return;
        }
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    // Calculate final age
    const age = calculateAge(dobDay, dobMonth, dobYear);
    const dobString = (dobDay && dobMonth && dobYear) 
      ? `${dobYear}-${dobMonth.padStart(2,'0')}-${dobDay.padStart(2,'0')}` 
      : null;

    const setupData = {
      name: name.trim() || "Student",
      dob: dobString, // Save DOB for auto-updates next year
      age: age,       // Save current calculated age
      weight: weight ? parseInt(weight) : null,
      height: height ? parseInt(height) : null,
      stats: {
        stepGoal: parseInt(stepGoal) || 10000,
        hydrationGoal: parseInt(hydrationGoal) || 2500
      }
    };
    await completeSetup(setupData);
    setLoading(false);
  };

  const handleSyncCalendar = async () => {
    const success = await syncDefaultCalendar();
    if (success) {
      setCalendarSynced(true);
      Alert.alert("Synced!", "We've analyzed your schedule to find workout gaps.");
    } else {
      Alert.alert("Permission Error", "Please enable calendar access in your device settings.");
    }
  };

  // --- AUTO-FOCUS LOGIC (UPDATED FOR MM-DD-YYYY) ---
  const handleMonthChange = (text) => {
    setDobMonth(text);
    if (text.length === 2) dayRef.current?.focus();
  };
  const handleDayChange = (text) => {
    setDobDay(text);
    if (text.length === 2) yearRef.current?.focus();
    if (text.length === 0) monthRef.current?.focus();
  };
  const handleYearChange = (text) => {
    setDobYear(text);
    if (text.length === 0) dayRef.current?.focus();
    if (text.length === 4) Keyboard.dismiss();
  };

  // --- RENDERERS ---

  const renderProgressBar = () => {
    const progress = (step / 4) * 100;
    return (
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>
    );
  };

  const renderStepIcon = () => {
    let iconName = 'person';
    let iconColor = colors.primary;
    if (step === 2) { iconName = 'body'; iconColor = '#FF9500'; } // Orange
    if (step === 3) { iconName = 'flag'; iconColor = '#FFD60A'; } // Yellow
    if (step === 4) { iconName = 'calendar'; iconColor = '#34C759'; } // Green

    return (
      <View style={[styles.stepIconCircle, { backgroundColor: iconColor + '15', borderColor: iconColor + '30' }]}>
        <Ionicons name={iconName} size={28} color={iconColor} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.container}>
          
          {/* TOP NAV */}
          <View style={styles.topNav}>
            {step > 1 ? (
              <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.navBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : <View style={{width: 24}} />}
            
            <TouchableOpacity onPress={handleSetupLater} style={styles.skipBtn}>
              <Text style={styles.skipText}>Setup Later</Text>
            </TouchableOpacity>
          </View>

          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
               {renderStepIcon()}
               <View style={{flex:1, marginLeft: 15}}>
                 <Text style={styles.stepIndicator}>STEP {step} OF 4</Text>
                 <Text style={styles.title}>
                   {step === 1 && "Identity"}
                   {step === 2 && "Body Stats"}
                   {step === 3 && "Daily Goals"}
                   {step === 4 && "Permissions"}
                 </Text>
               </View>
            </View>
            {renderProgressBar()}
          </View>

          <ScrollView 
            contentContainerStyle={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            
            {/* STEP 1: IDENTITY */}
            {step === 1 && (
              <View style={styles.formSection}>
                {/* NAME INPUT */}
                <Text style={styles.label}>FULL NAME (REQUIRED)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textDim}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoFocus
                  />
                </View>

                {/* DATE OF BIRTH INPUT (MM / DD / YYYY) */}
                <Text style={[styles.label, { marginTop: 24 }]}>DATE OF BIRTH</Text>
                <View style={styles.dobContainer}>
                  
                  {/* MONTH */}
                  <View style={[styles.dobInputWrapper, { flex: 0.8 }]}>
                    <Text style={styles.dobLabel}>MM</Text>
                    <TextInput
                      ref={monthRef}
                      style={styles.dobInput}
                      placeholder="01"
                      placeholderTextColor={colors.textDim}
                      value={dobMonth}
                      onChangeText={handleMonthChange}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.dobSeparator}>/</Text>
                  
                  {/* DAY */}
                  <View style={[styles.dobInputWrapper, { flex: 0.8 }]}>
                    <Text style={styles.dobLabel}>DD</Text>
                    <TextInput
                      ref={dayRef}
                      style={styles.dobInput}
                      placeholder="31"
                      placeholderTextColor={colors.textDim}
                      value={dobDay}
                      onChangeText={handleDayChange}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.dobSeparator}>/</Text>
                  
                  {/* YEAR */}
                  <View style={[styles.dobInputWrapper, { flex: 1.2 }]}>
                    <Text style={styles.dobLabel}>YYYY</Text>
                    <TextInput
                      ref={yearRef}
                      style={styles.dobInput}
                      placeholder="2000"
                      placeholderTextColor={colors.textDim}
                      value={dobYear}
                      onChangeText={handleYearChange}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>
                </View>
                <View style={styles.tipBox}>
                  <Ionicons name="information-circle" size={16} color={colors.primary} />
                  <Text style={styles.tipText}>Used to calculate age accurately.</Text>
                </View>
              </View>
            )}

            {/* STEP 2: MEASUREMENTS */}
            {step === 2 && (
              <View style={styles.formSection}>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>WEIGHT (KG)</Text>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="scale-bathroom" size={20} color={colors.textDim} style={styles.inputIcon} />
                      <TextInput
                        ref={weightRef}
                        style={styles.input}
                        placeholder="--"
                        placeholderTextColor={colors.textDim}
                        keyboardType="numeric"
                        value={weight}
                        onChangeText={setWeight}
                        maxLength={3}
                        returnKeyType="next"
                        onSubmitEditing={() => heightRef.current?.focus()}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.label}>HEIGHT (CM)</Text>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="human-male-height" size={20} color={colors.textDim} style={styles.inputIcon} />
                      <TextInput
                        ref={heightRef}
                        style={styles.input}
                        placeholder="--"
                        placeholderTextColor={colors.textDim}
                        keyboardType="numeric"
                        value={height}
                        onChangeText={setHeight}
                        maxLength={3}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.tipBox}>
                  <Ionicons name="fitness-outline" size={16} color={colors.primary} />
                  <Text style={styles.tipText}>Used to calculate accurate calorie burn.</Text>
                </View>
              </View>
            )}

            {/* STEP 3: GOALS */}
            {step === 3 && (
              <View style={styles.formSection}>
                <Text style={styles.label}>DAILY STEPS</Text>
                <View style={styles.grid}>
                  {['5000', '10000', '15000'].map(g => (
                    <TouchableOpacity 
                      key={g} 
                      style={[
                        styles.goalCard, 
                        stepGoal === g && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                      ]}
                      onPress={() => setStepGoal(g)}
                    >
                       <Ionicons name="footsteps" size={20} color={stepGoal === g ? colors.primary : colors.textDim} />
                       <Text style={[styles.goalCardText, stepGoal === g && { color: colors.primary }]}>
                         {parseInt(g).toLocaleString()}
                       </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={[styles.inputContainer, { marginTop: 12 }]}>
                   <Text style={{color:colors.textDim, marginLeft:15, marginRight:5, fontWeight: '600'}}>Custom:</Text>
                   <TextInput 
                     style={styles.input} 
                     value={stepGoal} 
                     onChangeText={setStepGoal} 
                     keyboardType="numeric"
                     placeholder="e.g. 8000"
                     placeholderTextColor={colors.textDim}
                   />
                </View>

                <Text style={[styles.label, { marginTop: 30 }]}>HYDRATION (ML)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="water-outline" size={20} color="#0A84FF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2500"
                    placeholderTextColor={colors.textDim}
                    keyboardType="numeric"
                    value={hydrationGoal}
                    onChangeText={setHydrationGoal}
                  />
                </View>
              </View>
            )}

            {/* STEP 4: PERMISSIONS */}
            {step === 4 && (
              <View style={styles.formSection}>
                 <TouchableOpacity 
                   style={[
                     styles.permCard, 
                     calendarSynced && { borderColor: '#34C759', backgroundColor: '#34C75910' }
                   ]}
                   onPress={handleSyncCalendar}
                   disabled={calendarSynced}
                 >
                   <View style={[styles.iconBox, { backgroundColor: calendarSynced ? '#34C759' : colors.surface }]}>
                     <Ionicons name="calendar" size={28} color={calendarSynced ? "#FFF" : colors.text} />
                   </View>
                   <View style={{flex: 1, paddingHorizontal: 15}}>
                     <Text style={styles.permTitle}>Sync Calendar</Text>
                     <Text style={styles.permDesc}>Required to find "Smart Gaps" in your busy schedule.</Text>
                   </View>
                   <View style={[styles.checkBox, calendarSynced && { backgroundColor: '#34C759', borderColor: '#34C759' }]}>
                     {calendarSynced && <Ionicons name="checkmark" size={16} color="#FFF" />}
                   </View>
                 </TouchableOpacity>
              </View>
            )}

          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footer}>
            {step > 1 && step < 4 && (
              <TouchableOpacity onPress={handleSkipStep} style={styles.textBtn}>
                <Text style={styles.textBtnLabel}>Skip</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={handleNext} 
              style={[styles.primaryBtn, step === 1 && { flex: 1, marginLeft: 0 }]}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Saving..." : (step === 4 ? "Finish Setup" : "Continue")}
              </Text>
              {!loading && <Ionicons name="arrow-forward" size={20} color="#FFF" />}
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },
  
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  navBtn: { padding: 8, marginLeft: -8 },
  skipBtn: { padding: 8, marginRight: -8 },
  skipText: { color: colors.textDim, fontSize: 15, fontWeight: '600' },

  header: { marginBottom: 30 },
  headerRow: { flexDirection:'row', alignItems:'center', marginBottom: 20 },
  stepIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  stepIndicator: { fontSize: 11, fontWeight: '800', color: colors.textDim, letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  progressBarTrack: { height: 4, backgroundColor: colors.surface, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },

  content: { flexGrow: 1 },
  formSection: { gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textDim, marginBottom: 8, marginLeft: 4 },
  
  // Standard Input
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, 
    borderRadius: 16, paddingHorizontal: 16, height: 58, borderWidth: 1, borderColor: colors.border 
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 17, color: colors.text, fontWeight: '600', height: '100%' },
  row: { flexDirection: 'row' },
  
  // DOB Input Styling
  dobContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dobInputWrapper: { 
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, 
    height: 64, alignItems: 'center', justifyContent: 'center' 
  },
  dobLabel: { fontSize: 10, fontWeight: '700', color: colors.textDim, marginBottom: 2 },
  dobInput: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', width: '100%' },
  dobSeparator: { fontSize: 24, color: colors.textDim, fontWeight: '300', marginHorizontal: 5 },

  tipBox: { flexDirection: 'row', backgroundColor: colors.primary + '10', padding: 12, borderRadius: 12, marginTop: 15, alignItems: 'center' },
  tipText: { fontSize: 13, color: colors.text, marginLeft: 10, flex: 1, lineHeight: 18 },

  grid: { flexDirection: 'row', gap: 10 },
  goalCard: { flex: 1, paddingVertical: 15, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6 },
  goalCardText: { fontSize: 15, fontWeight: '700', color: colors.textDim },

  permCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  permTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  permDesc: { fontSize: 12, color: colors.textDim, lineHeight: 16 },
  checkBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },

  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  textBtn: { paddingHorizontal: 20, paddingVertical: 15 },
  textBtnLabel: { fontSize: 16, fontWeight: '600', color: colors.textDim },
  primaryBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: colors.primary, height: 56, borderRadius: 28, gap: 8, marginLeft: 10,
    shadowColor: colors.primary, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6
  },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' }
});

export default SetupScreen;