import { GoogleGenAI, Type } from '@google/genai';
import { PlaceSearchResult, WeatherInfo } from '../types';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-2.5-flash';

export const resolveLocation = async (
  locationName: string
): Promise<{ lat: number; lng: number; cleanName: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Find the geographic coordinates (latitude and longitude) for "${locationName}" in or near Sokcho, South Korea. Return valid JSON only. The 'cleanName' should be the official Korean name of the place.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER, description: 'Latitude' },
            lng: { type: Type.NUMBER, description: 'Longitude' },
            cleanName: {
              type: Type.STRING,
              description: 'Official Korean name of the place',
            },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error('No coordinates found');
  } catch (error) {
    console.error('Location Resolve Error:', error);
    // Fallback to Sokcho City Hall
    return { lat: 38.207, lng: 128.5918, cleanName: locationName };
  }
};

export const searchPlaces = async (
  query: string
): Promise<PlaceSearchResult[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Search for 3-5 real places in or near Sokcho, South Korea matching the keyword "${query}".
      Return a valid JSON array of objects.
      Each object must have:
      - name: (string) Official Korean name of the place
      - address: (string) Short Korean address (e.g., Sokcho-si, Gangwon-do)
      - type: (string) Best matching category from ['food', 'activity', 'hotel', 'travel']
      - lat: (number) Latitude
      - lng: (number) Longitude
      - description: (string) Very brief description (e.g., 'Famous for squid sundae', 'Beautiful beach')
      
      If the query is vague, suggest the most popular relevant places.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              type: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              description: { type: Type.STRING },
            },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error('Place Search Error:', error);
    return [];
  }
};

export const getSokchoWeatherAndSunrise = async (): Promise<WeatherInfo> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents:
        'Predict the weather for Sokcho, South Korea on the morning of December 13, 2025. Specifically focusing on Cheongdae Mountain (청대산) sunrise hike. Include sunrise time, expected temperature at 6AM, and wind chill. Provide hiking advice in Korean. Return ONLY valid JSON.',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tempHigh: { type: Type.NUMBER },
            tempLow: { type: Type.NUMBER },
            sunriseTime: { type: Type.STRING },
            condition: {
              type: Type.STRING,
              description: 'Weather condition in Korean (e.g., 맑음, 흐림)',
            },
            windSpeed: { type: Type.STRING },
            hikingAdvice: {
              type: Type.STRING,
              description: 'Short hiking advice in Korean',
            },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as WeatherInfo;
    }
    throw new Error('No data returned');
  } catch (error) {
    console.error('Gemini Weather Error:', error);
    return {
      tempHigh: 6,
      tempLow: -3,
      sunriseTime: '07:28 AM',
      condition: '구름 조금',
      windSpeed: '5 m/s',
      hikingAdvice:
        '청대산 정상은 바람이 강할 수 있으니 체감 온도가 낮을 수 있습니다. 아이젠과 방풍 자켓을 꼭 챙기세요.',
    };
  }
};

export const getTravelSuggestions = async (
  query: string,
  locationContext: string = 'Sokcho, South Korea'
): Promise<{ text: string; mapLinks?: { uri: string; title: string }[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `The user is a Korean traveler going to ${locationContext}. Query: "${query}". Provide a helpful, friendly answer in Korean. If searching for places, find specific real locations.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || '죄송해요, 정보를 찾을 수 없어요.';

    // Extract map links if available
    const mapLinks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => chunk.maps)
        .filter(map => map !== undefined && map !== null)
        .map(map => ({ uri: map.uri!, title: map.title! })) || [];

    return { text, mapLinks };
  } catch (error) {
    console.error('Gemini Suggestion Error:', error);
    return {
      text: '지금은 AI 여행 비서와 연결할 수 없어요. 잠시 후 다시 시도해주세요.',
      mapLinks: [],
    };
  }
};

export const generatePackingList = async (): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents:
        'Generate a checklist of 10 essential items for a winter trip to Sokcho (Dec 12-13) including Cheongdae Mountain (청대산) hiking. Return the items in Korean. Return JSON array of strings.',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });
    if (response.text) return JSON.parse(response.text);
    return [];
  } catch (e) {
    return [
      '핫팩',
      '등산화',
      '히트텍/내복',
      '카메라',
      '비니/모자',
      '바람막이',
      '장갑',
      '보온병',
      '보조배터리',
      '선글라스',
    ];
  }
};
