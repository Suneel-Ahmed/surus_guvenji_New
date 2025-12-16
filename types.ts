
export interface SummaryStats {
  totalDistance: string;
  estimatedDuration: string;
  mandatoryBreak: string;
  breakNote: string;
}

export interface RiskSegment {
  name: string;
  value: number;
  color: string;
}

export interface RiskType {
  category: string;
  value: number;
  description: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  type: 'start' | 'info' | 'warning' | 'danger' | 'break' | 'end' | 'stop';
  icon?: string; // e.g., 'wind', 'traffic', 'descent'
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    placeId?: string;
  };
}

export interface WeatherInfo {
  location: string;
  temp: string;
  condition: string;
  icon: 'sunny' | 'cloudy' | 'rainy' | 'storm' | 'snow' | 'fog';
}

export interface RouteAnalysis {
  summary: SummaryStats;
  weather: {
    origin: WeatherInfo;
    destination: WeatherInfo;
  };
  riskIntensity: RiskSegment[];
  riskTypes: RiskType[];
  timeline: TimelineEvent[];
  groundingMetadata?: GroundingChunk[];
}

export interface Warehouse {
  id: string;
  name: string;
  city: string;
  coordinates: string; // "lat,lng"
}

export interface RouteOptions {
  useTolls: boolean;
  stopName?: string;
  stopCoords?: string;
}

export interface BatchItem {
  id: string;
  origin: string;
  destination: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: RouteAnalysis;
  errorMsg?: string;
}

// Saved report that can be shared as a read-only link
export interface SavedReport {
  id: string;
  createdAt: string;
  origin: string;
  destination: string;
  stop?: string;
  useTolls: boolean;
  analysis: RouteAnalysis;
}

export const INITIAL_ANALYSIS: RouteAnalysis = {
  summary: {
    totalDistance: "0 km",
    estimatedDuration: "0 Saat",
    mandatoryBreak: "-",
    breakNote: "-"
  },
  weather: {
    origin: { location: "-", temp: "-", condition: "-", icon: "cloudy" },
    destination: { location: "-", temp: "-", condition: "-", icon: "cloudy" }
  },
  riskIntensity: [],
  riskTypes: [],
  timeline: []
};
