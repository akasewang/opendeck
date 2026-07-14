export type AuthRole = 'user' | 'admin'

export type AuthStatus = 'active' | 'suspended'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: AuthRole
  status: AuthStatus
}
