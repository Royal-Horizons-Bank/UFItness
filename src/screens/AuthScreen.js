import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator, 
  useColorScheme, LayoutAnimation, UIManager,
  Image, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

WebBrowser.maybeCompleteAuthSession();

const AuthScreen = () => {
  const theme = useColorScheme() || 'light';
  const isDark = theme === 'dark';
  
  const bg = isDark ? '#000000' : '#FFFFFF';
  const text = isDark ? '#FFFFFF' : '#000000';
  const inputBg = isDark ? '#1C1C1E' : '#F2F2F7';
  const inputPlaceholder = isDark ? '#8E8E93' : '#AEAEB2';
  const accent = '#FF3B30';

  const { login, register, loginWithGoogle } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- 1. GENERATE REDIRECT URI ---
 
  const redirectUri = makeRedirectUri({
    scheme: 'ufitness' 
  });



  // --- 2. GOOGLE AUTH CONFIG ---
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '779129847304-4ca2qbqk3o4mgkcd50kife70jecbr1ve.apps.googleusercontent.com', 
    iosClientId: '779129847304-gir2q52dj21s43ea4b6j1pil1v8brel8.apps.googleusercontent.com',
    webClientId: '779129847304-oacdsfob6u492ba658ho6mj5u587jpva.apps.googleusercontent.com',
    redirectUri: redirectUri, // Explicitly pass the calculated URI
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    } else if (response?.type === 'error') {
      Alert.alert("Google Auth Error", "Check your Client IDs and Redirect URI in Google Cloud.");
      console.error("Google Auth Error:", response.error);
    }
  }, [response]);

  const handleGoogleSignIn = async (token) => {
    setLoading(true);
    const result = await loginWithGoogle(token);
    if (!result.success) Alert.alert("Login Failed", result.error);
    setLoading(false);
  };

  const toggleAuthMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsLogin(!isLogin);
  };

  const handleAuth = async () => {
    setLoading(true);
    let result;
    if (isLogin) result = await login(email, password);
    else result = await register(email, password);
    
    setLoading(false);
    if (!result.success) Alert.alert("Error", result.error); 
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          
          <View style={styles.header}>
            <View style={[
              styles.iconShadow, 
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
            ]}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={styles.appIcon}
                resizeMode="cover" 
              />
            </View>
            
            <Text style={[styles.title, { color: text }]}>
              {isLogin ? 'Welcome back.' : 'Join UFitness.'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Sign in to continue your progress.' : 'Create an account to start tracking.'}
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: text }]}
              placeholder="Email"
              placeholderTextColor={inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: text }]}
              placeholder="Password"
              placeholderTextColor={inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: accent }]} 
              onPress={handleAuth}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={[styles.line, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]} />
              <Text style={{ marginHorizontal: 10, color: '#8E8E93' }}>OR</Text>
              <View style={[styles.line, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]} />
            </View>

            <TouchableOpacity 
              style={[styles.googleBtn, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#E5E5EA' }]}
              onPress={() => {
                if (!request) {
                  Alert.alert("Not Ready", "Checking configuration...");
                  return;
                }
                promptAsync();
              }}
              disabled={!request}
            >
              <Ionicons name="logo-google" size={20} color={isDark ? '#FFF' : '#000'} style={{ marginRight: 10 }} />
              <Text style={[styles.googleText, { color: text }]}>Continue with Google</Text>
            </TouchableOpacity>

          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: '#8E8E93' }]}>
              {isLogin ? "No account?" : "Have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={[styles.linkText, { color: text }]}>
                {isLogin ? ' Sign up' : ' Log in'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 30, width: '100%', maxWidth: 500, alignSelf: 'center' },
  
  header: { marginBottom: 30 },
  
  iconShadow: {
    width: 90, 
    height: 90, 
    borderRadius: 22, 
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  appIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 22, 
  },

  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10 },
  subtitle: { fontSize: 17, color: '#8E8E93', lineHeight: 24 },
  
  form: { gap: 16 },
  input: { height: 56, borderRadius: 14, paddingHorizontal: 18, fontSize: 17, fontWeight: '500' },
  button: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  line: { flex: 1, height: 1 },
  
  googleBtn: { 
    height: 56, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    borderWidth: 1, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 4 
  },
  googleText: { fontSize: 17, fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 15 },
  linkText: { fontSize: 15, fontWeight: '700', marginLeft: 5 },
});

export default AuthScreen;