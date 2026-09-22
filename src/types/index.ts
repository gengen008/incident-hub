export type UserRole = 'admin' | 'department_head' | 'user'

export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical'

export type IncidentCategory =
  | 'Equipment Failure'
  | 'Software Issue'
  | 'Maintenance'
  | 'Safety'
  | 'Process'
  | 'HR'
  | 'Facility'
  | 'Security'
  | 'Other'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string | null
  role: UserRole
  is_active: boolean
  avatar_url?: string | null
  department_id?: string | null
  must_change_password?: boolean
  created_at: string
  updated_at: string
  department?: Department
}

export interface Department {
  id: string
  name: string
  description?: string | null
  code?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  member_count?: number
}

export interface UserDepartment {
  id: string
  user_id: string
  department_id: string
  is_head: boolean
  joined_at: string
  department?: Department
  user?: Profile
}

export interface IncidentPhoto {
  id: string
  incident_id: string
  photo_url: string
  file_name?: string | null
  file_size?: number | null
  uploaded_by: string
  uploaded_at: string
  uploader?: Profile
}

export interface IncidentComment {
  id: string
  incident_id: string
  user_id: string
  content: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  user?: Profile
}

export interface IncidentStatusHistory {
  id: string
  incident_id: string
  old_status?: string | null
  new_status: string
  changed_by: string
  reason?: string | null
  changed_at: string
  changer?: Profile
}

export interface Incident {
  id: string
  incident_number: string
  title: string
  description: string
  additional_notes?: string | null
  category: IncidentCategory
  priority: IncidentPriority
  status: IncidentStatus
  reported_by: string
  assigned_to?: string | null
  department_id: string
  affected_systems?: string | null
  location?: string | null
  resolution_notes?: string | null
  created_at: string
  updated_at: string
  resolved_at?: string | null
  reporter?: Profile
  assignee?: Profile
  department?: Department
  photos?: IncidentPhoto[]
  comments?: IncidentComment[]
  status_history?: IncidentStatusHistory[]
  _count?: {
    photos: number
    comments: number
  }
}

export interface Notification {
  id: string
  user_id: string
  type: 'incident_assigned' | 'status_update' | 'comment' | 'mentioned' | 'resolved' | string
  title: string
  body?: string | null
  incident_id?: string | null
  link?: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationPreferences {
  id?: string
  user_id: string
  email_on_assign: boolean
  email_on_status_change: boolean
  email_on_comment: boolean
  email_on_critical: boolean
  push_on_assign: boolean
  push_on_status_change: boolean
  // legacy aliases
  email_assigned?: boolean
  email_status_change?: boolean
  email_comment?: boolean
  email_mentioned?: boolean
  email_resolved?: boolean
}

export interface DashboardStats {
  total: number
  open: number
  in_progress: number
  resolved: number
  closed: number
  critical: number
  this_month: number
  avg_resolution_hours?: number
}

export interface IncidentFilters {
  search?: string
  status?: IncidentStatus | ''
  priority?: IncidentPriority | ''
  department_id?: string
  date_from?: string
  date_to?: string
  assigned_to?: string
  reported_by?: string
}
