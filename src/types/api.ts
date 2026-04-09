// src/types/api.ts - API Response Types

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Employee {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department_id?: number;
  department?: Department;
  base_salary?: number;
  position_allowance?: number;
  hire_date?: string;
  status?: 'active' | 'inactive' | 'terminated';
  profile_photo_url?: string;
  [key: string]: any;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  employees?: Employee[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Role {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  color?: string;
  permissions?: string[];
  [key: string]: any;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role_id?: number;
  role?: Role;
  is_active?: boolean;
  avatar?: string;
  [key: string]: any;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee?: Employee;
  type: string;
  from_date: string;
  to_date: string;
  days?: number;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  paid?: boolean;
  created_at?: string;
  [key: string]: any;
}

export interface AdvanceRequest {
  id: number;
  employee_id: number;
  employee?: Employee;
  amount: number;
  type: 'short' | 'long';
  installments?: number;
  monthly_installment?: number;
  remaining_amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Warning {
  id: number;
  employee_id: number;
  employee?: Employee;
  type?: string;
  note?: string;
  date?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Organization {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  commercial_register?: string;
  activity?: string;
  employee_count?: string;
  foundation_year?: string;
  currency?: string;
  currency_symbol?: string;
  logo?: string;
  logo_url?: string;
  stamp?: string;
  stamp_url?: string;
  [key: string]: any;
}

export interface AttendanceSettings {
  shift_ids?: number[];
  allowed_delay_minutes?: number;
  delay_before_warning?: number;
  delay_before_deduction?: number;
  late_deduction_percent?: number;
  absence_after_minutes?: number;
  absence_deduction_days?: number;
  termination_after_days?: number;
  [key: string]: any;
}

export interface LeaveSettings {
  annual_days?: number;
  sick_days?: number;
  maternity_days?: number;
  notice_days?: number;
  by_grade?: Record<string, number>;
  hajj_days?: number;
  emergency_days?: number;
  unpaid_leave_max_days?: number;
  leave_without_salary?: boolean;
  [key: string]: any;
}

export interface AdvanceSettings {
  enabled?: boolean;
  short_advance?: {
    enabled?: boolean;
    max_percent?: number;
    max_amount?: number;
    min_service_months?: number;
    deduction_percent?: number;
  };
  long_advance?: {
    enabled?: boolean;
    max_percent?: number;
    max_amount?: number;
    min_amount?: number;
    min_service_months?: number;
    max_installments?: number;
    min_installments?: number;
  };
  [key: string]: any;
}

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export interface SalaryIncrease {
  default_percent?: number;
  per_job_title?: Record<string, number>;
  apply_automatically?: boolean;
  min_service_months?: number;
  [key: string]: any;
}

export interface WorkShift {
  id: number;
  name: string;
  start_time?: string;
  end_time?: string;
  working_hours?: number;
  is_overnight?: boolean;
  color?: string;
  [key: string]: any;
}

export interface DashboardStats {
  total_employees?: number;
  total_departments?: number;
  total_leaves_pending?: number;
  total_warnings?: number;
  total_increases?: number;
  reports_generated?: number;
  letters_generated?: number;
  total_salaries?: number;
}

export interface DashboardSummary {
  organization?: Organization;
  stats?: DashboardStats;
  generated_at?: string;
}

// Salary Report Types
export interface SalaryReportData {
  id: number;
  name: string;
  department?: string;
  base_salary: number;
  position_allowance: number;
  allowances: { name: string; type: string; amount: number }[];
  incentives: { name: string; type: string; amount: number }[];
  gross_salary: number;
  insurance_amount?: number;
  deductions?: number;
  attendance_deductions?: number;
  attendance_details?: {
    late_days?: number;
    early_leave_days?: number;
  };
  advance_deductions?: number;
  advance_carry_over?: number;
  income_tax?: number;
  total_deductions?: number;
  net_salary?: number;
  [key: string]: any;
}

// Letter Types
export interface LetterData {
  type: string;
  type_label?: string;
  content?: {
    body?: string;
    [key: string]: any;
  };
  employee?: Employee;
  reference_number?: string;
  [key: string]: any;
}
