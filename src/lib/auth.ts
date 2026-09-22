import type { UserRole } from '@/types'

export function isAdmin(role?: UserRole | null): boolean {
  return role === 'admin'
}

export function isDeptHead(role?: UserRole | null): boolean {
  return role === 'admin' || role === 'department_head'
}

export function canManageIncidents(role?: UserRole | null): boolean {
  return role === 'admin' || role === 'department_head'
}

export function canViewAllIncidents(role?: UserRole | null): boolean {
  return role === 'admin'
}

export function canManageUsers(role?: UserRole | null): boolean {
  return role === 'admin'
}

export function canManageDepartments(role?: UserRole | null): boolean {
  return role === 'admin'
}
