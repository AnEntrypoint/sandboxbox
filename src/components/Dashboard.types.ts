export interface WidgetData {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'status';
  data: any;
  timestamp: Date;
  config?: WidgetConfig;
}

export interface WidgetConfig {
  refreshInterval?: number;
  height?: string;
  width?: string;
  theme?: 'light' | 'dark';
  showTimestamp?: boolean;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  options?: ChartOptions;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip?: {
      enabled?: boolean;
      mode?: 'index' | 'dataset' | 'point';
    };
  };
  scales?: {
    x?: {
      display?: boolean;
      grid?: {
        display?: boolean;
      };
    };
    y?: {
      display?: boolean;
      grid?: {
        display?: boolean;
      };
      beginAtZero?: boolean;
    };
  };
}

export interface MetricData {
  [key: string]: number | string;
}

export interface ListDataItem {
  id: string | number;
  [key: string]: any;
}

export interface StatusData {
  status: 'healthy' | 'warning' | 'error' | 'offline';
  uptime?: string;
  lastCheck?: Date;
  [key: string]: any;
}

export interface DashboardConfig {
  theme?: 'light' | 'dark';
  autoRefresh?: boolean;
  refreshInterval?: number;
  layout?: 'grid' | 'flex';
  widgetColumns?: number;
  showControls?: boolean;
}

export interface DashboardProps {
  className?: string;
  config?: DashboardConfig;
  widgets?: WidgetData[];
  onWidgetUpdate?: (widgetId: string, data: any) => void;
  onWidgetError?: (widgetId: string, error: Error) => void;
}

export type WidgetType = 'metric' | 'chart' | 'list' | 'status';
export type StatusType = 'healthy' | 'warning' | 'error' | 'offline';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface DashboardMetrics {
  totalWidgets: number;
  activeWidgets: number;
  errorCount: number;
  lastUpdate: Date;
  performance: {
    loadTime: number;
    renderTime: number;
    refreshTime: number;
  };
}