import { GoogleGenAI } from "@google/genai";
import { RouteAnalysis, RouteOptions } from "../types";

// Helper to safely parse JSON from Gemini's response
const parseJSONResponse = (text: string | undefined): any => {
  if (!text) return {};
  try {
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) return JSON.parse(jsonBlockMatch[1]);

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", e, "Raw text:", text);
    return {};
  }
};

// Retry helper for transient Gemini errors
const generateWithRetry = async (ai: GoogleGenAI, params: any, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const status = error.status || error.response?.status || 0;
      if (i === retries - 1) throw error;
      if (status === 500 || status === 503) {
        console.warn(`Gemini API error ${status}. Retrying (${i + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries reached");
};

// --- ROUTE AGENT USING GEMINI ONLY ---
const routeAgent = async (ai: GoogleGenAI, origin: string, destination: string, options?: RouteOptions) => {
  const stopStr = options?.stopName ? `via ${options.stopName}` : "direct route";
  const tollStr = options?.useTolls ? "using tolls" : "avoiding tolls";

  const prompt = `
GÖREV: Tır/Kamyon için rota oluştur.

Başlangıç: "${origin}"
Varış: "${destination}"
Tercihler: ${stopStr}, ${tollStr}

TALİMATLAR:
1. Hesaplamayı sadece kendi bilgi ve aklını kullanarak yap. Google Maps API gerekmez.
2. Tahmini mesafeyi ve süreyi kesin olarak yaz. Tır için süreyi %30 artır.
3. Ana güzergah şehirlerini ve yollarını Türkçe olarak özetle.
4. JSON olarak çıktı ver:

{
  "totalDistance": "örn: 1200 km",
  "estimatedDuration": "örn: 14 sa 30 dk",
  "routeDescription": "Ana şehirler ve yolların özeti",
  "estimatedArrivalHours": 14.5,
  "isEstimate": true
}
`;

  const response = await generateWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: prompt
  });



  return parseJSONResponse(response.text);
};

// --- WEATHER AGENT ---
const weatherAgent = async (ai: GoogleGenAI, origin: string, destination: string, arrivalInHours: number) => {
  const arrivalDate = new Date(Date.now() + arrivalInHours * 60 * 60 * 1000);
  const arrivalTimeStr = arrivalDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const prompt = `
GÖREV: Başlangıç ve varış noktasının hava durumunu al.

Başlangıç: ${origin} (şu an)
Varış: ${destination} (tahmini varış: bugün ${arrivalTimeStr})

JSON olarak çıktı ver:
{
  "origin": { "location": "${origin}", "temp": "örn: 15°C", "condition": "örn: Parçalı Bulutlu", "icon": "sunny" },
  "destination": { "location": "${destination}", "temp": "örn: 12°C", "condition": "örn: Yağmurlu", "icon": "rainy" }
}
`;

  const response = await generateWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: prompt
  });

  return parseJSONResponse(response.text);
};

// --- RISK AGENT ---
const riskAgent = async (ai: GoogleGenAI, routeDescription: string, origin: string, destination: string, durationHours: number) => {
  const MAX_DRIVING_WITHOUT_BREAK = 4.5;
  const MAX_DAILY_DRIVING = 9.0;

  let mandatoryBreakValue = durationHours > MAX_DRIVING_WITHOUT_BREAK ? "45 dk (Zorunlu)" : "Gerekmez";
  let breakNote = durationHours > MAX_DRIVING_WITHOUT_BREAK
    ? "Her 4,5 saatlik sürüşten sonra en az 45 dk mola zorunludur."
    : "Zorunlu mola yok";

  const prompt = `
GÖREV: Rota risk analizi ve mola planlaması.

Rota: ${origin} -> ${destination}
Detaylar: ${routeDescription}
Toplam süre: ${durationHours.toFixed(1)} saat

JSON olarak çıktı ver:
{
  "riskIntensity": [ { "name": "Bölge Adı", "value": 1-100, "color": "#hex" } ],
  "riskTypes": [ { "category": "Tip Adı", "value": 1-10, "description": "Türkçe açıklama" } ],
  "timeline": [
    { "title": "Başlangıç", "description": "Rota başlangıcı", "type": "start", "icon": "traffic" }
  ],
  "mandatoryBreak": "${mandatoryBreakValue}",
  "breakNote": "${breakNote}"
}
`;

  const response = await generateWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: prompt
  });

  return { data: parseJSONResponse(response.text) };
};

// --- MAIN ORCHESTRATOR ---
export const analyzeRoute = async (
  originName: string,
  destinationName: string,
  originCoords?: string,
  destCoords?: string,
  options?: RouteOptions
): Promise<RouteAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Use raw coordinates if available for better accuracy
  const originVal = originCoords || originName;
  const destVal = destCoords || destinationName;

  try {
    // STEP 1: Route Agent
    const routeData = await routeAgent(ai, originVal, destVal, options);
    const safeRouteDesc = routeData.routeDescription || `${originName} - ${destinationName}`;
    const safeArrivalHours = typeof routeData.estimatedArrivalHours === "number" ? routeData.estimatedArrivalHours : 6;

    // STEP 2: Parallel weather and risk
    const [weatherData, riskResult] = await Promise.all([
      weatherAgent(ai, originName, destinationName, safeArrivalHours),
      riskAgent(ai, safeRouteDesc, originName, destinationName, safeArrivalHours)
    ]);

    const riskData = riskResult.data;

    // STEP 3: Merge and return
    return {
      summary: {
        totalDistance: routeData.totalDistance || "Hesaplanıyor...",
        estimatedDuration: routeData.estimatedDuration || "Hesaplanıyor...",
        mandatoryBreak: riskData.mandatoryBreak || "Hesaplanıyor...",
        breakNote: riskData.breakNote || "-"
      },
      weather: {
        origin: weatherData.origin || { location: originName, temp: "-", condition: "-", icon: "cloudy" },
        destination: weatherData.destination || { location: destinationName, temp: "-", condition: "-", icon: "cloudy" }
      },
      riskIntensity: riskData.riskIntensity || [],
      riskTypes: riskData.riskTypes || [],
      timeline: riskData.timeline || [],
      groundingMetadata: undefined
    };
  } catch (error) {
    console.error("Multi-Agent Analysis Error:", error);
    throw error;
  }
};
