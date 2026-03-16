import axios from 'axios'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = 'http://localhost:3000'

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

export async function saveToken(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value)
  } else {
    await SecureStore.setItemAsync(key, value)
  }
}

export async function getToken(key: string) {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key)
  } else {
    return SecureStore.getItemAsync(key)
  }
}

export async function deleteToken(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key)
  } else {
    await SecureStore.deleteItemAsync(key)
  }
}

client.interceptors.request.use(async (config) => {
  const token = await getToken('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default client