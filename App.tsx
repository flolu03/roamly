import React, { useState } from 'react'
import { useAuthStore } from './src/store/auth.store'
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import RouteBuilderScreen from './src/screens/RouteBuilderScreen'
import FlightSearchScreen from './src/screens/FlightSearchScreen'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

export default function App() {
  const [showRegister, setShowRegister] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [screen, setScreen] = useState<'home' | 'route' | 'search'>('home')
  const { user, logout } = useAuthStore()

  const isLoggedIn = user || isGuest

  if (isLoggedIn) {
    if (screen === 'search') {
      return <FlightSearchScreen onBack={() => setScreen('route')} />
    }
    if (screen === 'route') {
      return <RouteBuilderScreen onSearch={() => setScreen('search')} />
    }
    return (
      <View style={styles.wrap}>
        <Text style={styles.logo}>roam<Text style={styles.accent}>ly</Text></Text>
        {user
          ? <Text style={styles.sub}>Willkommen, {user.displayName}! 👋</Text>
          : <Text style={styles.sub}>Du bist als Gast unterwegs 👤</Text>
        }
        <TouchableOpacity style={styles.btn} onPress={() => setScreen('route')}>
          <Text style={styles.btnText}>Neue Rundreise planen →</Text>
        </TouchableOpacity>
        {!user && (
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsGuest(false)}>
            <Text style={styles.btnSecondaryText}>Registrieren / Einloggen</Text>
          </TouchableOpacity>
        )}
        {user && (
          <TouchableOpacity style={styles.btnSecondary} onPress={logout}>
            <Text style={styles.btnSecondaryText}>Ausloggen</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (showRegister) {
    return <RegisterScreen onSwitch={() => setShowRegister(false)} />
  }

  return (
    <LoginScreen
      onSwitch={() => setShowRegister(true)}
      onGuest={() => setIsGuest(true)}
    />
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#fff' },
  logo: { fontSize: 40, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  accent: { color: '#BA7517' },
  sub: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  btn: { backgroundColor: '#BA7517', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnSecondary: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 15, alignItems: 'center' },
  btnSecondaryText: { color: '#888', fontSize: 16 }
})