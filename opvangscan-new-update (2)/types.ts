
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  qrCode: string;
  studentNumber: string; // Nieuw veld voor stamboeknummer
  photo?: string;
  isArchived?: boolean;
}

export type SessionType = 'MORNING' | 'EVENING';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  timestamp: string;
  session: SessionType;
}

export interface PricingConfig {
  morningPrice: number;
  eveningPrice: number;
  wednesdayMorningPrice: number;
  wednesdayEveningPrice: number;
}

export interface CloudSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSync?: string;
  error?: string;
}

export interface AppData {
  students: Student[];
  records: AttendanceRecord[];
  pricing: PricingConfig;
  version: number;
}
