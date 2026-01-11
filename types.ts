
export enum LeadStatus {
  NEW = 'new',
  ANALYZED = 'analyzed',
  MESSAGED = 'messaged',
  REPLIED = 'replied',
  HOT = 'hot'
}

export type AutomationStatus = 'none' | 'queued' | 'sending' | 'sent' | 'failed';

export interface Lead {
  id: string;
  full_name: string;
  linkedin_url: string;
  title: string;
  company: string;
  website: string;
  country: string;
  industry: string;
  pain_points: string | null;
  ai_message: string | null;
  approved: boolean;
  status: LeadStatus;
  automation_status: AutomationStatus;
  scheduled_at: string | null;
  created_at: string;
}

export interface DiscoveryResult {
  full_name: string;
  title: string;
  company: string;
  linkedin_url: string;
  website: string;
  industry: string;
  country: string;
  intent_signal: string;
  source_platform: string;
}

export interface AuditResult {
  pain_points: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface SalesMessageResponse {
  message: string;
  tone: string;
}
