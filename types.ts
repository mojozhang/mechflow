
export enum ProcessingType {
  Lathe = '车床',
  Mill = '铣床',
  Planer = '刨床',
  Drill = '钻床',
  Welder = '焊工',
  Fitter = '钳工',
  Sawing = '锯床',
  Tapping = '攻丝机',
  Other = '其他'
}

export interface Resource {
  id: string;
  type: string; // Changed from ProcessingType to string to allow custom types from AI
  name: string; // e.g., "Lathe #1"
  count: number;
}

export interface ManufacturingStep {
  stepId: string;
  order: number;
  description: string;
  processType: string;
  estimatedHours: number;
}

export interface Part {
  id: string;
  projectId: string;
  name: string;
  fileData: string | null; // Base64
  mimeType: string;
  analysisStatus: 'pending' | 'analyzing' | 'done' | 'error';
  steps: ManufacturingStep[];
  warnings?: string[]; // New: For pre-check alerts
}

export interface Project {
  id: string;
  name: string;
  deadline: string;
  color: string; // Hex color code
  parts: Part[];
}

export interface ScheduleTask {
  taskId: string;
  partId: string;
  partName: string;
  projectId: string;
  projectName: string;
  resourceId: string; // ID of the specific resource instance (e.g., Lathe #1)
  resourceName: string;
  startTime: number; // Hours from T=0
  duration: number; // Hours
  description: string;
  completed?: boolean;
  completedAt?: string;
}

export interface ScheduleResult {
  totalDuration: number;
  tasks: ScheduleTask[];
  explanation: string;
}
