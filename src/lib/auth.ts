import type { UserRole } from '@/types'

export function isAdmin(role?: UserRole | null): boolean {
  return role === 'admin'
}

export function isHead(role?: UserRole | null): boolean {
  return role === 'admin' || role === 'head'
}

export function canManageUsers(role?: UserRole | null): boolean {
  return role === 'admin'
}

export function canManageDepartments(role?: UserRole | null): boolean {
  return role === 'admin'
}
