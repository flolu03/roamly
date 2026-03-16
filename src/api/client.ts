import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const API_URL = 'http://localhost:3000'

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default client