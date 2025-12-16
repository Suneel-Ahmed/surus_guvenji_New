import type { RouteAnalysis } from "@/types";

const stripKgm = (val?: string | null) => {
  if (!val) return val;
  return val.replace(/\s*\|\s*KGM:.*$/i, "").trim();
};

export const sanitizeAnalysis = (analysis: RouteAnalysis): RouteAnalysis => {
  const cleanedWeather = {
    origin: {
      ...analysis.weather.origin,
      location: stripKgm(analysis.weather.origin?.location) || analysis.weather.origin?.location
    },
    destination: {
      ...analysis.weather.destination,
      location: stripKgm(analysis.weather.destination?.location) || analysis.weather.destination?.location
    }
  };

  const cleanedTimeline = (analysis.timeline || []).map((t) => ({
    ...t,
    title: stripKgm(t.title) || t.title,
    description: stripKgm(t.description) || t.description
  }));

  const cleanedRiskIntensity = (analysis.riskIntensity || []).map((r) => ({
    ...r,
    name: stripKgm(r.name) || r.name
  }));

  return {
    ...analysis,
    weather: cleanedWeather,
    timeline: cleanedTimeline,
    riskIntensity: cleanedRiskIntensity
  };
};
