// ── Labianca Desk — domain types ─────────────────────────────────

export type UserRole = 'admin' | 'head' | 'staff'

export type RequestStatus = 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed'

export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent'

export type RequestCategory =
  | 'Cold Chain & Equipment'
  | 'IT & Systems'
  | 'Facilities & Maintenance'
  | 'Procurement'
  | 'Logistics & Fleet'
  | 'Inventory & Supplies'
  | 'HR & Personnel'
  | 'Finance & Payments'
  | 'Safety & Security'
  | 'General'

export interface Department {
  id: string
  name: string
  code: string
  description?: string | null
  color?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  member_count?: number
}

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string | null
  job_title?: string | null
  role: UserRole
  department_id?: string | null
  avatar_url?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  department?: Department | null
}

export interface RequestActivity {
  id: string
  request_id: string
  actor_id: string
  type: 'comment' | 'status_change' | 'assignment' | 'created'
  body?: string | null
  from_status?: string | null
  to_status?: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  actor?: Profile
}

export interface RequestAttachment {
  id: string
  request_id: string
  url: string
  file_name?: string | null
  file_size?: number | null
  uploaded_by: string
  created_at: string
}

export interface Request {
  id: string
  request_number: string
  title: string
  description: string
  category: RequestCategory
  priority: RequestPriority
  status: RequestStatus
  raised_by: string
  raised_dept?: string | null
  target_dept: string
  assigned_to?: string | null
  location?: string | null
  resolution_notes?: string | null
  due_date?: string | null
  created_at: string
  updated_at: string
  resolved_at?: string | null
  raiser?: Profile
  assignee?: Profile | null
  raised_department?: Department | null
  target_department?: Department | null
  activity?: RequestActivity[]
  attachments?: RequestAttachment[]
}

// ── Messaging ────────────────────────────────────────────────────
export interface Conversation {
  id: string
  type: 'direct' | 'group'
  title?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  last_message_at?: string | null
  last_message_preview?: string | null
  members?: ConversationMember[]
  // client-computed
  other?: Profile | null
  display_name?: string
  unread?: number
}

export interface ConversationMember {
  id: string
  conversation_id: string
  user_id: string
  last_read_at: string
  joined_at: string
  user?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  attachment_url?: string | null
  created_at: string
  sender?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  entity_id?: string | null
  is_read: boolean
  created_at: string
}

export interface DashboardStats {
  raised_by_me: number
  assigned_to_me: number
  open_for_my_dept: number
  resolved_this_month: number
  needs_me: number
}
