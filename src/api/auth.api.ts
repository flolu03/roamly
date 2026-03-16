import client from './client'
import * as SecureStore from 'expo-secure-store'

export async function register(email: string, password: string, displayName: string) {
  const res = await client.post('/auth/register', { email, password, displayName })
  await SecureStore.setItemAsync('accessToken', res.data.accessToken)
  await SecureStore.setItemAsync('refreshToken', res.data.refreshToken)
  return res.data
}

export async function login(email: string, password: string) {
  const res = await client.post('/auth/login', { email, password })
  await SecureStore.setItemAsync('accessToken', res.data.accessToken)
  await SecureStore.setItemAsync('refreshToken', res.data.refreshToken)
  return res.data
}

export async function logout(refreshToken: string) {
  await client.post('/auth/logout', { refreshToken })
  await SecureStore.deleteItemAsync('accessToken')
  await SecureStore.deleteItemAsync('refreshToken')
}