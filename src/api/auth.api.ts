import client, { saveToken, deleteToken } from './client'

export async function register(email: string, password: string, displayName: string) {
  const res = await client.post('/auth/register', { email, password, displayName })
  await saveToken('accessToken', res.data.accessToken)
  await saveToken('refreshToken', res.data.refreshToken)
  return res.data
}

export async function login(email: string, password: string) {
  const res = await client.post('/auth/login', { email, password })
  await saveToken('accessToken', res.data.accessToken)
  await saveToken('refreshToken', res.data.refreshToken)
  return res.data
}

export async function logout(refreshToken: string) {
  await client.post('/auth/logout', { refreshToken })
  await deleteToken('accessToken')
  await deleteToken('refreshToken')
}