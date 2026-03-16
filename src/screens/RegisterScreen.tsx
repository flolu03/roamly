import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useAuthStore } from '../store/auth.store'

export default function RegisterScreen({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const { register, isLoading, error, clearError } = useAuthStore()

  const handleRegister = async () => {
    clearError()
    await register(email, password, displayName)
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrap}>
      <Text style={styles.logo}>roam<Text style={styles.logoAccent}>ly</Text></Text>
      <Text style={styles.subtitle}>Konto erstellen</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="#999"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Passwort"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={isLoading}>
        {isLoading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Registrieren</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={onSwitch}>
        <Text style={styles.switch}>Bereits ein Konto? <Text style={styles.switchAccent}>Einloggen</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#fff' },
  logo: { fontSize: 40, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  logoAccent: { color: '#BA7517' },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 32 },
  input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12, color: '#1a1a1a' },
  btn: { backgroundColor: '#BA7517', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c0392b', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  switch: { textAlign: 'center', marginTop: 20, color: '#888', fontSize: 14 },
  switchAccent: { color: '#BA7517', fontWeight: '600' }
})