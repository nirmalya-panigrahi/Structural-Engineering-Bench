export type ModuleId =
  | 'mohrs-circle'
  | 'stress-strain'
  | 'sn-curve'
  | 'goodman-haigh'
  | 'beam-sfd-bmd'
  | 'mohr-coulomb'
  | 'ashby-chart'
  | 'euler-buckling'
  | 'pm-interaction'
  | 'casagrande';

export type ModuleCategory =
  | 'All'
  | 'Solid Mechanics'
  | 'Fatigue & Failure'
  | 'Structural'
  | 'Geotechnical'
  | 'Materials';

export type StatusTone = 'safe' | 'caution' | 'danger' | 'neutral';

export interface FinePrintMeta {
  summary: string;
  formula?: string;
  standard?: string;
  assumptions?: string;
  validRange?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface InputFieldSpec {
  key: string;
  label: string;
  symbol?: string;
  unit?: string;
  kind: 'number' | 'select' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
  options?: SelectOption[];
  finePrint: FinePrintMeta;
  visibleWhen?: (values: Record<string, number | string | boolean>) => boolean;
}

export interface OutputMetric {
  key: string;
  label: string;
  symbol?: string;
  value: string;
  rawValue?: number;
  unit?: string;
  tone?: StatusTone;
  statusLabel?: string;
  finePrint: FinePrintMeta;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface EngineeringPreset {
  id: string;
  label: string;
  description: string;
  values: Record<string, number | string | boolean>;
}

export interface CalculationResult<TGraph = unknown> {
  valid: boolean;
  issues: ValidationIssue[];
  warnings: string[];
  metrics: OutputMetric[];
  verdict?: {
    tone: StatusTone;
    label: string;
    detail: string;
  };
  graphData: TGraph | null;
}

export interface ModuleMetadata {
  id: ModuleId;
  index: string;
  name: string;
  shortName: string;
  category: Exclude<ModuleCategory, 'All'>;
  description: string;
  governingStandard: string;
  equations: Array<{
    title: string;
    expression: string;
    note: string;
  }>;
  assumptions: string[];
  fields: InputFieldSpec[];
  presets: EngineeringPreset[];
  defaultValues: Record<string, number | string | boolean>;
}
