import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, 
  useColorScheme, Modal, FlatList, Image, ScrollView, TextInput, Alert 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { PALETTE } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

// --- HEALTH GOAL OPTIONS ---
const STEP_OPTIONS = [
  { label: 'Sedentary', value: 3000 },
  { label: 'Light Active', value: 5000 },
  { label: 'Moderate', value: 7500 },
  { label: 'Active', value: 10000 },
  { label: 'Very Active', value: 12500 },
  { label: 'Athlete', value: 20000 },
];

const WATER_OPTIONS = [
  { label: 'Minimum', value: 1500 },
  { label: 'Standard', value: 2000 },
  { label: 'Recommended', value: 2500 },
  { label: 'High Active', value: 3000 },
  { label: 'Gallon Mode', value: 4000 },
];

const SettingsScreen = () => {
  const navigation = useNavigation();
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);
  
  const { 
    userData, logout, syncDefaultCalendar, updateDailyGoals, updatePreferences, 
    updateName, updateUserPassword, resetProgress, updateDOB // <--- IMPORT updateDOB
  } = useUser();
  
  const { name, email, stats, profileImage, preferences, dob } = userData || {};
  const isSignedIn = !!userData?.email; 

  // --- STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [editType, setEditType] = useState(null); 
  
  // Input State
  const [textInput, setTextInput] = useState('');
  const [confirmInput, setConfirmInput] = useState(''); 
  const [currentPassInput, setCurrentPassInput] = useState('');

  // DOB Input State
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Toggles
  const [isGoogleSync, setIsGoogleSync] = useState(false);

  // --- HANDLERS ---
  const handleDeviceToggle = async (value) => {
    if (value) {
      const success = await syncDefaultCalendar();
      updatePreferences({ isAutoSyncEnabled: success });
    } else {
      updatePreferences({ isAutoSyncEnabled: false });
    }
  };

  const openModal = (type) => {
    setEditType(type);
    setTextInput('');
    setConfirmInput(''); 
    setCurrentPassInput('');
    
    if (type === 'dob' && dob) {
      const parts = dob.split('-'); // YYYY-MM-DD
      if (parts.length === 3) {
        setDobYear(parts[0]);
        setDobMonth(parts[1]);
        setDobDay(parts[2]);
      }
    } else if (type === 'dob') {
        setDobYear(''); setDobMonth(''); setDobDay('');
    }
    
    setModalVisible(true);
  };

  const handleSelectOption = (value) => {
    if (editType === 'steps') updateDailyGoals(value, null);
    if (editType === 'hydration') updateDailyGoals(null, value);
    setModalVisible(false);
  };

  const handleSave = async () => {
    if (editType === 'dob') {
        if (!dobDay || !dobMonth || !dobYear) return;
        const m = parseInt(dobMonth);
        const d = parseInt(dobDay);
        const y = parseInt(dobYear);
        
        if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) {
            Alert.alert("Invalid Date", "Please check your entry.");
            return;
        }

        const today = new Date();
        const birthDate = new Date(y, m - 1, d);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        const dobString = `${y}-${dobMonth.padStart(2,'0')}-${dobDay.padStart(2,'0')}`;
        const res = await updateDOB(dobString, age);
        if (res.success) {
            Alert.alert("Success", "Date of birth updated.");
            setModalVisible(false);
        } else {
            Alert.alert("Error", res.error);
        }
        return;
    }

    if (!textInput && editType !== 'password') return;
    
    if (editType === 'name') {
      const res = await updateName(textInput);
      if (res.success) {
        Alert.alert("Success", "Name updated.");
        setModalVisible(false);
      }
      else Alert.alert("Error", res.error);
    } 
    else if (editType === 'password') {
      if (!currentPassInput) { Alert.alert("Missing Input", "Please enter current password."); return; }
      if (textInput !== confirmInput) { Alert.alert("Mismatch", "New passwords do not match."); return; }
      if (textInput.length < 6) { Alert.alert("Weak Password", "Must be at least 6 characters."); return; }

      const res = await updateUserPassword(currentPassInput, textInput);
      if (res.success) { Alert.alert("Success", "Password updated."); setModalVisible(false); }
      else { Alert.alert("Error", res.error); }
    }
  };

  const handleResetProgress = () => {
    Alert.alert("Reset Progress?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: async () => { await resetProgress(); Alert.alert("Done", "Progress cleared."); } }
    ]);
  };

  // --- RENDER MODAL ---
  const renderModalContent = () => {
    if (editType === 'steps' || editType === 'hydration') {
      return (
        <FlatList 
          data={editType === 'steps' ? STEP_OPTIONS : WATER_OPTIONS}
          keyExtractor={(item) => item.value.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.optionItem} onPress={() => handleSelectOption(item.value)}>
              <Text style={styles.optionLabel}>{item.label}</Text>
              <Text style={styles.optionValue}>{item.value.toLocaleString()} {editType === 'steps' ? 'steps' : 'ml'}</Text>
            </TouchableOpacity>
          )}
          style={{ maxHeight: 300 }}
        />
      );
    } 
    else if (editType === 'dob') {
        return (
            <View style={{ width: '100%' }}>
              <Text style={styles.modalSub}>Enter your Date of Birth (MM / DD / YYYY)</Text>
              <View style={{flexDirection:'row', justifyContent:'space-between', gap: 10, marginBottom: 15}}>
                  <TextInput style={[styles.input, {flex: 1, textAlign:'center'}]} value={dobMonth} onChangeText={setDobMonth} placeholder="MM" maxLength={2} keyboardType="number-pad" />
                  <TextInput style={[styles.input, {flex: 1, textAlign:'center'}]} value={dobDay} onChangeText={setDobDay} placeholder="DD" maxLength={2} keyboardType="number-pad" />
                  <TextInput style={[styles.input, {flex: 1.5, textAlign:'center'}]} value={dobYear} onChangeText={setDobYear} placeholder="YYYY" maxLength={4} keyboardType="number-pad" />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>Update Date</Text></TouchableOpacity>
            </View>
        );
    }
    else if (editType === 'password') {
      return (
        <View style={{ width: '100%' }}>
          <Text style={styles.modalSub}>Change Password</Text>
          <TextInput style={styles.input} value={currentPassInput} onChangeText={setCurrentPassInput} placeholder="Current Password" secureTextEntry />
          <TextInput style={styles.input} value={textInput} onChangeText={setTextInput} placeholder="New Password" secureTextEntry />
          <TextInput style={styles.input} value={confirmInput} onChangeText={setConfirmInput} placeholder="Verify New Password" secureTextEntry />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>Update</Text></TouchableOpacity>
        </View>
      );
    }
    else {
      return (
        <View style={{ width: '100%' }}>
          <Text style={styles.modalSub}>Update Display Name</Text>
          <TextInput style={styles.input} value={textInput} onChangeText={setTextInput} placeholder="Full Name" autoCapitalize="words" autoFocus />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Settings</Text>
        <View style={{width: 30}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ACCOUNT */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.sectionContainer}>
          <TouchableOpacity style={styles.row} onPress={() => openModal('name')}>
            <View style={styles.iconCircle}><Ionicons name="person-outline" size={18} color={theme === 'dark' ? '#FFF' : '#333'} /></View>
            <Text style={[styles.rowTitle, { flex: 1, marginLeft: 12 }]}>Change Name</Text>
            <Text style={styles.rowValue}>{name}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => openModal('dob')}>
            <View style={styles.iconCircle}><Ionicons name="calendar-outline" size={18} color={theme === 'dark' ? '#FFF' : '#333'} /></View>
            <Text style={[styles.rowTitle, { flex: 1, marginLeft: 12 }]}>Date of Birth</Text>
            <Text style={styles.rowValue}>{dob || "Not Set"}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => openModal('password')}>
            <View style={styles.iconCircle}><Ionicons name="lock-closed-outline" size={18} color={theme === 'dark' ? '#FFF' : '#333'} /></View>
            <Text style={[styles.rowTitle, { flex: 1, marginLeft: 12 }]}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </TouchableOpacity>
        </View>

        {/* SYNC */}
        <Text style={styles.sectionHeader}>Sync</Text>
        <View style={styles.sectionContainer}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Device Calendar</Text>
              <Text style={styles.rowSubtitle}>Syncs Android & iOS events</Text>
            </View>
            <Switch value={preferences?.isAutoSyncEnabled || false} onValueChange={handleDeviceToggle} trackColor={{ false: theme === 'dark' ? "#3e3e3e" : "#e0e0e0", true: colors.primary }} />
          </View>
        </View>

        {/* GOALS */}
        <Text style={styles.sectionHeader}>Goals</Text>
        <View style={styles.sectionContainer}>
          <TouchableOpacity style={styles.row} onPress={() => openModal('steps')}>
            <View style={styles.iconCircle}><MaterialCommunityIcons name="shoe-print" size={18} color={theme === 'dark' ? '#FFF' : '#333'} /></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle}>Steps</Text>
              <Text style={styles.rowSubtitle}>{stats?.stepGoal?.toLocaleString()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => openModal('hydration')}>
             <View style={styles.iconCircle}><MaterialCommunityIcons name="water" size={18} color={theme === 'dark' ? '#FFF' : '#333'} /></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle}>Hydration</Text>
              <Text style={styles.rowSubtitle}>{stats?.hydrationGoal?.toLocaleString()} ml</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </TouchableOpacity>
        </View>

        {/* DATA */}
        <Text style={styles.sectionHeader}>Data</Text>
        <View style={styles.sectionContainer}>
          <TouchableOpacity style={styles.row} onPress={handleResetProgress}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger || '#FF3B30'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: colors.danger || '#FF3B30' }]}>Reset Progress</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editType === 'name' ? 'Update Name' : editType === 'dob' ? 'Date of Birth' : 'Update Setting'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={28} color={colors.textDim} /></TouchableOpacity>
            </View>
            {renderModalContent()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.surface },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  scrollContent: { padding: 20 },
  sectionHeader: { color: colors.textDim, fontSize: 12, fontWeight: '700', marginBottom: 10, marginLeft: 10, textTransform: 'uppercase', letterSpacing: 1 },
  sectionContainer: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, marginBottom: 25, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowValue: { color: colors.textDim, fontSize: 14, marginRight: 8 },
  rowSubtitle: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
  iconCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#FF3B30' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: theme === 'dark' ? '#1C1C1E' : '#FFF', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalSub: { fontSize: 14, color: '#AAA', marginBottom: 15 },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLabel: { fontSize: 16, color: colors.text, fontWeight: '500' },
  optionValue: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  input: { backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7', color: colors.text, fontSize: 16, padding: 14, borderRadius: 12, marginBottom: 12 },
  saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveText: { color: '#FFF', fontWeight: 'bold' },
});

export default SettingsScreen;