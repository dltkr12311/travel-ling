import { GoogleGenAI, Type } from '@google/genai';
import { Person } from '../types';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
const MODEL_NAME = 'gemini-2.5-flash';

// ===== Types =====
export interface AIAction {
  type: 'add_itinerary' | 'add_expense' | 'set_budget' | 'add_person' | 'none';
  data?: {
    // For add_itinerary
    time?: string;
    title?: string;
    location?: string;
    itemType?: 'food' | 'activity' | 'hotel' | 'travel';
    notes?: string;
    // For add_expense
    amount?: number;
    description?: string;
    payerName?: string;
    // For set_budget
    budget?: number;
    // For add_person
    personName?: string;
  };
}

export interface AIAssistantResponse {
  text: string;
  action?: AIAction;
  mapLinks?: { uri: string; title: string }[];
}

export interface AppContext {
  people: Person[];
  currentBudget: number;
  totalSpent?: number;
  itineraryCount?: number;
  sunriseTime?: string;
  weatherCondition?: string;
}

// ===== Main Function =====
export const processAIAssistantMessage = async (
  userMessage: string,
  context: AppContext
): Promise<AIAssistantResponse> => {
  try {
    const peopleNames = context.people.map(p => p.name).join(', ');
    const peopleList = context.people
      .map(p => `${p.name}(ID:${p.id})`)
      .join(', ');

    // 더 스마트한 프롬프트
    const systemPrompt = `너는 속초 여행 앱의 AI 비서야. 사용자의 **자연스러운 한국어 표현**을 이해하고 앱 기능을 실행해.

## 여행 정보
- 여행지: 속초, 강원도 (2025년 12월 12-13일)
- 주요 일정: 설악산 울산바위 일출 등반
- 일출 시간: ${context.sunriseTime || '07:28'} (울산바위 정상)
- 날씨: ${context.weatherCondition || '맑음'}

## 현재 상태
- 여행 멤버: ${peopleList}
- 예산: ${
      context.currentBudget > 0
        ? context.currentBudget.toLocaleString() + '원'
        : '미설정'
    }
- 총 지출: ${context.totalSpent?.toLocaleString() || 0}원
- 등록된 일정: ${context.itineraryCount || 0}개

## 실행 가능한 액션

### 1. add_itinerary (일정 추가)
**인식 패턴 예시:**
- "3시에 중앙시장 가자" → time: "15:00", title: "중앙시장", itemType: "activity"
- "점심은 동명항 회센터" → time: "12:00", title: "동명항 회센터", itemType: "food"
- "내일 아침 울산바위" → time: "06:00", title: "울산바위", itemType: "activity"
- "숙소 설악파크호텔" → title: "설악파크호텔", itemType: "hotel"
- "버스터미널에서 출발" → title: "버스터미널", itemType: "travel"

**시간 해석:**
- "아침" → 07:00-09:00
- "점심" → 12:00
- "저녁" → 18:00-19:00
- "밤" → 21:00
- "새벽" → 05:00-06:00
- 숫자만 있으면 적절히 AM/PM 판단

### 2. add_expense (지출 추가)
**인식 패턴 예시:**
- "점심 15000원" → amount: 15000, description: "점심"
- "커피 4500" → amount: 4500, description: "커피"
- "택시비 12000 내가 냄" → amount: 12000, description: "택시비", payerName: "나"
- "회 5만원 썼어" → amount: 50000, description: "회"
- "마트 장보기 32000원" → amount: 32000, description: "마트 장보기"

**금액 해석:**
- "5만원", "5만" → 50000
- "1만5천" → 15000
- 숫자만 있으면 원 단위로 해석

**결제자:** 언급 없으면 첫 번째 멤버(${context.people[0]?.name || '나'})로 설정

### 3. set_budget (예산 설정)
**인식 패턴 예시:**
- "예산 30만원" → budget: 300000
- "예산 50" → budget: 500000 (만원 단위로 해석)
- "총 예산 25만원으로" → budget: 250000

### 4. add_person (멤버 추가)
**인식 패턴 예시:**
- "철수 추가해줘" → personName: "철수"
- "영희도 같이 가" → personName: "영희"

## 응답 규칙
1. **액션 실행 시**: 친근하고 짧게 확인 메시지 (예: "점심 15,000원 기록했어요! 🍽️")
2. **일반 대화**: 여행 관련 정보나 추천을 친근하게 제공
3. **모호한 요청**: 명확하게 물어보기 (예: "몇 시쯤 가실 건가요?")
4. **항상 한국어**로 응답
5. **이모지** 적절히 사용해서 친근하게

## 주의사항
- 불확실하면 action 없이 확인 질문하기
- 금액/시간이 명확하지 않으면 추정하지 말고 물어보기
- 여러 액션이 필요하면 가장 중요한 것 하나만 실행`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `${systemPrompt}\n\n---\n사용자: "${userMessage}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description:
                '사용자에게 보여줄 친근한 응답 메시지 (한국어, 이모지 포함)',
            },
            action: {
              type: Type.OBJECT,
              description: '실행할 앱 액션. 일반 대화나 불확실한 경우 null',
              nullable: true,
              properties: {
                type: {
                  type: Type.STRING,
                  enum: [
                    'add_itinerary',
                    'add_expense',
                    'set_budget',
                    'add_person',
                    'none',
                  ],
                },
                data: {
                  type: Type.OBJECT,
                  properties: {
                    // add_itinerary
                    time: { type: Type.STRING, nullable: true },
                    title: { type: Type.STRING, nullable: true },
                    location: { type: Type.STRING, nullable: true },
                    itemType: {
                      type: Type.STRING,
                      enum: ['food', 'activity', 'hotel', 'travel'],
                      nullable: true,
                    },
                    notes: { type: Type.STRING, nullable: true },
                    // add_expense
                    amount: { type: Type.NUMBER, nullable: true },
                    description: { type: Type.STRING, nullable: true },
                    payerName: { type: Type.STRING, nullable: true },
                    // set_budget
                    budget: { type: Type.NUMBER, nullable: true },
                    // add_person
                    personName: { type: Type.STRING, nullable: true },
                  },
                },
              },
            },
          },
          required: ['text'],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);

      // Clean up action
      if (parsed.action?.type === 'none' || !parsed.action?.type) {
        delete parsed.action;
      }

      return {
        text: parsed.text,
        action: parsed.action,
      };
    }

    return { text: '죄송해요, 다시 한번 말씀해주세요! 🙏' };
  } catch (error) {
    console.error('AI Action Error:', error);
    return {
      text: '잠시 문제가 생겼어요. 다시 시도해주세요! 🙏',
    };
  }
};

// ===== Helper: Resolve Place Coordinates =====
export const resolveItineraryPlace = async (
  placeName: string
): Promise<{ lat: number; lng: number; address: string } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `"${placeName}"의 위치를 찾아줘. 속초/강릉/양양 지역이면 해당 지역으로, 아니면 정확한 위치로. 한국어 주소와 좌표 반환.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            address: { type: Type.STRING },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (e) {
    console.error('Place resolve error:', e);
    return null;
  }
};
