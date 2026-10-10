export type JobStatus = 'queued' | 'processing' | 'completed' | 'partially_failed' | 'failed';
export type RecipientStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user_id: string;
  user_name: string;
  user_email: string;
  organization_id: string;
  organization_name: string;
}

export interface RecipientInput {
  full_name: string;
  email?: string;
  institution?: string;
  achievement?: string;
}

export interface CreateJobRequest {
  event_name: string;
  issuer_name: string;
  issue_date: string;
  achievement_description?: string;
  signatory_name?: string;
  signatory_title?: string;
  recipients: RecipientInput[];
}

export interface GenerationJob {
  id: string;
  organization_id: string;
  created_by_id: string;
  event_name: string;
  issuer_name: string;
  achievement_description?: string;
  issue_date: string;
  signatory_name?: string;
  signatory_title?: string;
  status: JobStatus;
  total_count: number;
  pending_count: number;
  processing_count: number;
  success_count: number;
  failed_count: number;
  completion_percentage: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Recipient {
  id: string;
  job_id: string;
  full_name: string;
  email?: string;
  institution?: string;
  achievement?: string;
  status: RecipientStatus;
  retry_count: number;
  error_code?: string;
  error_message?: string;
  processed_at?: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  recipient_id: string;
  public_id: string;
  pdf_sha256: string;
  storage_key?: string;
  is_valid: boolean;
  revoked_at?: string;
  revocation_reason?: string;
  issued_at: string;
  recipient_name?: string;
  recipient_email?: string;
  event_name?: string;
  issuer_name?: string;
  download_url: string;
  verification_url: string;
}

export interface PublicVerification {
  is_valid: boolean;
  is_revoked: boolean;
  public_id: string;
  recipient_name: string;
  event_name: string;
  issuer_name: string;
  achievement_description?: string;
  issue_date: string;
  signatory_name?: string;
  signatory_title?: string;
  issued_at: string;
  revoked_at?: string;
  revocation_reason?: string;
}

export interface DashboardStats {
  total_jobs: number;
  total_certificates: number;
  successful_certificates: number;
  failed_certificates: number;
  success_rate: number;
  active_jobs: number;
}

export interface AuditEvent {
  id: string;
  actor_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  outcome: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface CreateJobResponse {
  id: string;
  job_id: string;
  status: JobStatus;
  total_recipients: number;
  message: string;
  job_url: string;
}

export interface CSVValidationError {
  row?: number;
  row_number?: number;
  field?: string;
  message?: string;
  errors?: string[];
}

export interface CSVValidationResult {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  errors?: CSVValidationError[];
  row_errors?: CSVValidationError[];
  preview: Array<Record<string, any>>;
  column_mapping?: Record<string, any>;
  valid_recipients?: RecipientInput[];
}
