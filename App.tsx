import React, { useState } from 'react'
import { useAuthStore } from './src/store/auth.store'
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

export default function App() {
  const [showRegister, setShowRegister] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const { user, logout } = useAuthStore()

  if (user) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.welcome}>Willkommen, <Text style={styles.accent}>{user.displayName}</Text>! 👋</Text>
        <Text style={styles.sub}>Du bist eingeloggt als {user.email}</Text>
        <TouchableOpacity style={styles.btn} onPress={logout}>
          <Text style={styles.btnText}>Ausloggen</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (isGuest) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.welcome}>Roam<Text style={styles.accent}>ly</Text></Text>
        <Text style={styles.sub}>Du bist als Gast unterwegs 👤</Text>
        <View style={styles.guestBox}>
          <Text style={styles.guestInfo}>✓  Reisen planen & Flüge suchen</Text>
          <Text style={styles.guestInfo}>✓  Preise vergleichen</Text>
          <Text style={styles.guestMissing}>✗  Reisen speichern</Text>
          <Text style={styles.guestMissing}>✗  Preisalarme</Text>
          <Text style={styles.guestMissing}>✗  Buchungshistorie</Text>
        </View>
        <TouchableOpacity style={styles.btn} onPress={() => setIsGuest(false)}>
          <Text style={styles.btnText}>Jetzt registrieren</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsGuest(false)}>
          <Text style={styles.switch}>Bereits ein Konto? <Text style={styles.accent}>Einloggen</Text></Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (showRegister) {
    return <RegisterScreen onSwitch={() => setShowRegister(false)} />
  }

  return <LoginScreen
    onSwitch={() => setShowRegister(true)}
    onGuest={() => setIsGuest(true)}
  />
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#fff' },
  welcome: { fontSize: 40, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  accent: { color: '#BA7517' },
  sub: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#BA7517', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switch: { textAlign: 'center', marginTop: 8, color: '#888', fontSize: 14 },
  guestBox: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 16, marginBottom: 24, borderWidth: 0.5, borderColor: '#eee' },
  guestInfo: { fontSize: 14, color: '#3B6D11', marginBottom: 6 },
  guestMissing: { fontSize: 14, color: '#999', marginBottom: 6 }
})