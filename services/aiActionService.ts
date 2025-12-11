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
  actions?: AIAction[]; // 여러 일정을 한 번에 처리하기 위한 배열
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

// ===== Helper: Validate Action =====
const validateAction = (action: AIAction): boolean => {
  if (!action.type || action.type === 'none' || !action.data) {
    console.warn('⚠️ Action missing type or data:', action);
    return false;
  }

  switch (action.type) {
    case 'add_itinerary':
      if (!action.data.title) {
        console.warn('⚠️ add_itinerary missing title:', action);
        return false;
      }
      return true;

    case 'set_budget':
      if (typeof action.data.budget !== 'number' || action.data.budget <= 0) {
        console.warn('⚠️ set_budget missing or invalid budget:', action);
        return false;
      }
      return true;

    case 'add_expense':
      if (!action.data.amount || !action.data.description) {
        console.warn('⚠️ add_expense missing required fields:', action);
        return false;
      }
      return true;

    case 'add_person':
      if (!action.data.personName) {
        console.warn('⚠️ add_person missing personName:', action);
        return false;
      }
      return true;

    default:
      return false;
  }
};

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
    const systemPrompt = `너는 속초 여행 앱의 AI 비서야. 사용자의 한국어 표현을 이해하고 JSON 형식으로 응답해.

## 🚨🚨🚨 CRITICAL: JSON 형식 규칙 (이것만큼은 절대 지켜!)

**모든 action/actions는 반드시 이 형식을 따라야 함:**

✅ **올바른 형식 (반드시 이렇게!):**
{
  "type": "add_itinerary",
  "data": { "title": "속초 중앙시장", "time": "15:00" }
}

❌ **절대 안 되는 형식 (시스템이 거부함!):**
{ "type": "add_itinerary" }  ← data 없음!
{ "type": "add_itinerary", "data": {} }  ← title 없음!
{ "type": "add_itinerary", "data": { "time": "15:00" } }  ← title 없음!

**핵심 규칙:**
1. type과 data는 **항상 함께** 있어야 함
2. data는 **절대 빈 객체 {}면 안 됨** - 필수 필드 반드시 포함!
3. 액션 타입별 필수 필드:
   - add_itinerary → data.title 필수!
   - set_budget → data.budget 필수! (title 불필요)
   - add_expense → data.amount, data.description 필수!
   - add_person → data.personName 필수!

**더 많은 올바른 예시:**
- 일정: { "type": "add_itinerary", "data": { "title": "속초아이" } }
- 일정(시간 포함): { "type": "add_itinerary", "data": { "title": "중앙시장", "time": "14:00" } }
- 예산: { "type": "set_budget", "data": { "budget": 300000 } }
- 지출: { "type": "add_expense", "data": { "amount": 15000, "description": "점심" } }
- 멤버: { "type": "add_person", "data": { "personName": "철수" } }

**잘못된 예시 (시스템이 거부!):**
- { "type": "add_itinerary" } ← data 없음!
- { "type": "add_itinerary", "data": {} } ← title 없음!
- { "type": "set_budget", "data": { "title": "예산" } } ← budget 없음!
- { "type": "add_expense", "data": { "amount": 5000 } } ← description 없음!

---

## 여행 정보
- 여행지: 속초, 강원도 (2025년 12월 12-13일)
- 주요 일정: 청대산 일출 등반
- 일출 시간: ${context.sunriseTime || '07:28'} (청대산 정상)
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

## 핵심 원칙
1. **여러 일정은 actions 배열로**: 2개 이상 장소 → actions 배열 사용
2. **긴 문장 자동 파싱**: 쉼표로 구분된 장소들 모두 추출
3. **시간 없어도 OK**: 장소만 있으면 추가 (시간은 나중에 편집 가능)
4. **순서 파악**: "들렸다가", "그 다음", "먼저" 등으로 순서 추론
5. **시간 추론**: "1시 출발 → 4시 도착" 같은 표현 계산
6. **자동 시간 배분**: "알아서 짜줘" 요청 시 적절한 시간 배정

## 실행 가능한 액션

### 1. add_itinerary (일정 추가)
**⚠️ 중요: 여러 일정이 언급되면 actions 배열로 모두 반환하세요!**

**장소 인식 규칙:**
- 어떤 장소명이든 인식 가능 (속초아이, 중앙시장, 델피노는 예시일 뿐)
- "XX에 가자", "XX 들렸다", "XX로 이동" 등 어떤 표현이든 장소명 추출
- **쉼표로 구분된 나열**: "속초아이, 중앙시장, 델피노"처럼 쉼표로 나열된 모든 장소명 추출
- 도시명, 관광지명, 식당명, 호텔명 등 모든 장소 인식
- "출발", "도착", "이동" 같은 표현도 travel 타입 일정으로 인식
- 쉼표 뒤 공백 유무와 상관없이 장소명 파싱 ("속초아이,중앙시장" 또는 "속초아이, 중앙시장" 모두 인식)

**복잡한 문장 파싱 예시 (매우 중요! 반드시 이 형식대로 반환):**
- 입력: "1시에 서울에서 출발하면 4시쯤 속초아이 들렸다가 그 다음에 속초중앙시장 들렸다 델피노 숙소에 갈거야"
  → 반드시 actions 배열로 4개 모두 반환 (action은 null 또는 생략):
    {
      "text": "서울 출발, 속초아이, 속초중앙시장, 델피노 숙소 일정을 모두 추가했어요! 📅",
      "action": null,
      "actions": [
        { "type": "add_itinerary", "data": { "time": "13:00", "title": "서울 출발", "itemType": "travel" } },
        { "type": "add_itinerary", "data": { "time": "16:00", "title": "속초아이", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "16:30", "title": "속초중앙시장", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "18:00", "title": "델피노", "itemType": "hotel" } }
      ]
    }

- 입력: "속초아이, 중앙시장, 델피노 이렇게" (또는 다른 장소명들)
  → actions 배열로 3개 반환 (시간은 자동 배분):
    {
      "text": "속초아이, 중앙시장, 델피노 일정을 자동으로 시간 배분해서 추가했어요! 📝",
      "action": null,
      "actions": [
        { "type": "add_itinerary", "data": { "time": "09:00", "title": "속초아이", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "11:00", "title": "중앙시장", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "15:00", "title": "델피노", "itemType": "hotel" } }
      ]
    }

- 입력: "속초아이, 속초 중앙시장, 델피노 소노캄, 영금정, 청대산, 삼양양떼목장"
  → 쉼표로 구분된 모든 장소명을 actions 배열로 6개 모두 반환 (시간은 자동 배분):
    {
      "text": "속초아이, 속초 중앙시장, 델피노 소노캄, 영금정, 청대산, 삼양양떼목장 일정을 모두 추가했어요! 📅",
      "action": null,
      "actions": [
        { "type": "add_itinerary", "data": { "time": "09:00", "title": "속초아이", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "10:30", "title": "속초 중앙시장", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "12:00", "title": "델피노 소노캄", "itemType": "hotel" } },
        { "type": "add_itinerary", "data": { "time": "14:00", "title": "영금정", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "16:00", "title": "청대산", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "18:00", "title": "삼양양떼목장", "itemType": "activity" } }
      ]
    }

- 입력: "속초아이,중앙시장,델피노" (공백 없이 쉼표만)
  → actions 배열로 3개 모두 반환 (공백 유무와 상관없이 파싱)

- 입력: "대략 알아서 짜줘" (이전 대화 맥락에 장소가 언급된 경우)
  → 언급된 모든 장소를 actions 배열로 반환하고 적절한 시간 배분

- 입력: "강릉에 가서 커피마실 곳 가고 해운대 가자" (임의의 장소명)
  → actions 배열로 2개 반환:
    {
      "text": "강릉 커피마실 곳, 해운대 일정을 추가했어요! 📅",
      "action": null,
      "actions": [
        { "type": "add_itinerary", "data": { "title": "강릉 커피마실 곳", "itemType": "food" } },
        { "type": "add_itinerary", "data": { "title": "해운대", "itemType": "activity" } }
      ]
    }

**단일 일정 예시:**
- 입력: "3시에 중앙시장 가자"
  → action 객체 사용:
    {
      "text": "중앙시장 일정 추가했어요! 📅",
      "action": { "type": "add_itinerary", "data": { "time": "15:00", "title": "중앙시장", "itemType": "activity" } },
      "actions": null
    }

**시간 추론 규칙:**
- "N시쯤", "N시경" → 해당 시간 또는 약간 늦게
- "1시 출발 4시 도착" → 출발 시간부터 도착 시간까지 자동 계산
- "들렸다가", "그 다음" → 이전 일정 +30분~1시간 추가
- 시간 없으면 이전 일정 시간 +1~2시간으로 자동 배분
- 첫 일정 시간 없으면 09:00 시작 가정

**장소 타입 자동 판단:**
- "숙소", "호텔", "리조트", "펜션" → hotel
- "시장", "맛집", "식당", "회센터" → food
- "출발", "터미널", "역", "공항" → travel
- 나머지 → activity

**기본 인식 패턴:**
- "3시에 중앙시장" → time: "15:00", title: "중앙시장"
- "점심은 동명항 회센터" → time: "12:00", title: "동명항 회센터", itemType: "food"
- "숙소 설악파크호텔" → title: "설악파크호텔", itemType: "hotel"

### 2. add_expense (지출 추가)
**인식 패턴 예시:**
- "점심 15000원" → amount: 15000, description: "점심"
- "커피 4500" → amount: 4500, description: "커피"
- "택시비 12000 내가 냄" → amount: 12000, description: "택시비", payerName: "나"

**금액 해석:**
- "5만원", "5만" → 50000
- "1만5천" → 15000
- 숫자만 있으면 원 단위로 해석

**결제자:** 언급 없으면 첫 번째 멤버(${context.people[0]?.name || '나'})로 설정

### 3. set_budget (예산 설정)
**⚠️ 중요: 예산 설정은 title이 필요 없고 budget만 필요합니다!**
**인식 패턴 예시:**
- "예산 30만원" → budget: 300000
- "예산 50" → budget: 500000 (만원 단위로 해석)
- "예산 200만원으로 설정해줘" → budget: 2000000
- "예산 100만" → budget: 1000000

**응답 형식:**
{
  "text": "예산을 300,000원으로 설정했어요! 💰",
  "action": { "type": "set_budget", "data": { "budget": 300000 } }
}

### 4. add_person (멤버 추가)
**인식 패턴 예시:**
- "철수 추가해줘" → personName: "철수"
- "영희도 같이 가" → personName: "영희"

## 응답 규칙
1. **⚠️ 매우 중요: "등록했어요", "추가했어요", "기록했어요"라고 말하려면 반드시 action 또는 actions를 반환해야 함!**
   - 등록/추가 관련 텍스트와 action은 항상 함께 있어야 함
   - 등록했다고 말했는데 action이 없으면 거짓말이 됨
2. **여러 일정 추가 시**: "서울 출발, 속초아이, 중앙시장, 델피노 숙소 일정을 모두 추가했어요! 📅" + actions 배열 반환
3. **시간 없이 추가 시**: "속초아이 일정 추가했어요. 시간은 나중에 편집할 수 있어요! ⏰" + action 또는 actions 반환
4. **"알아서 짜줘" 요청**: "속초아이, 중앙시장, 델피노 일정을 자동으로 시간 배분해서 추가했어요! 📝" + actions 배열 반환
5. **항상 한국어**로 응답
6. **이모지** 적절히 사용해서 친근하게
7. **질문에는 직접 답변**: "몇 시?", "얼마?" 같은 질문은 action 없이 답변만 제공
8. **등록할 수 없으면 솔직하게 말하기**: "죄송해요, 어떤 일정을 추가할까요?" 같은 확인 질문

## ⚠️ 주의사항 (절대 필수 준수!)
- **2개 이상 장소가 언급되면 반드시 actions 배열로 모두 반환** (action 사용 금지! 하나씩 물어보지 말 것!)
- **쉼표로 구분된 나열은 무조건 여러 일정으로 인식**: "속초아이, 중앙시장, 델피노"처럼 쉼표가 하나라도 있으면 모든 장소명을 추출
- 문장에서 "출발", "들렸다가", "그 다음", "그리고", "이렇게", "등록해줘" 같은 표현이 있으면 여러 일정으로 파싱
- "속초아이, 속초 중앙시장, 델피노 소노캄, 영금정" 같은 쉼표 나열은 반드시 모든 장소를 actions 배열로 반환
- "대략 알아서", "알아서 짜줘" 같은 요청은 언급된 모든 장소를 actions 배열로 반환하고 적절한 시간 배분
- 시간이 없어도 장소명만 있으면 일정 추가 (시간은 null 또는 추론 가능한 시간으로 설정)
- 순서와 맥락을 파악해서 시간을 추론하되, 너무 확신 없으면 null로 설정
- 금액/시간이 전혀 추론 불가능하면 확인 질문하기
- "몇 시?", "얼마?" 같은 단순 질문은 action 없이 답변만

## 최종 확인
사용자 메시지를 분석할 때:
1. **쉼표(,)가 하나라도 있나?** → 쉼표로 구분된 모든 장소명을 추출해서 actions 배열 사용
2. 장소/일정이 2개 이상 언급되었는가? (쉼표 없어도) → actions 배열 사용
3. 장소/일정이 1개만 언급되었는가? → action 객체 사용
4. 일반 대화/질문인가? → action과 actions 모두 null`;

    // 사용자 메시지에서 여러 장소/일정이 언급되었는지 유연하게 감지
    // 하드코딩된 키워드가 아닌 패턴 기반 감지
    const connectionWords = [
      '그리고',
      '그 다음',
      '들렸다',
      '들러',
      '먼저',
      '나중에',
      '이렇게',
      '등록',
      '추가',
      '갈거야',
      '가자',
    ];
    const timePatterns = (
      userMessage.match(/\d+시|시|오전|오후|아침|점심|저녁/g) || []
    ).length;
    const hasComma = userMessage.includes(',') || userMessage.includes('，');
    // 쉼표가 있으면 무조건 여러 장소 나열로 인식
    const commaCount = (userMessage.match(/,/g) || []).length;
    const hasConnection = connectionWords.some(word =>
      userMessage.includes(word)
    );
    const wordCount = (userMessage.match(/[가-힣]+/g) || []).filter(
      word => word.length > 1
    ).length;
    // 여러 장소명 패턴 (2자 이상의 명사가 여러 개 있는 경우)
    const placeLikeWords = (userMessage.match(/[가-힣]{2,}/g) || []).length;

    // 여러 일정 언급 가능성 판단
    // - 쉼표가 하나라도 있으면 무조건 여러 장소 나열로 인식 (최우선)
    // - 연결어가 있거나, 시간 표현이 2개 이상, 문장이 긴 경우, 장소명 같은 단어가 3개 이상
    const hasMultiplePlaces =
      hasComma || // 쉼표가 있으면 무조건 여러 일정
      hasConnection ||
      timePatterns >= 2 ||
      wordCount > 8 ||
      placeLikeWords >= 3;

    const messageWithHint = hasMultiplePlaces
      ? `${systemPrompt}\n\n---\n🚨🚨🚨 여러 장소/일정 감지! 반드시 actions 배열 사용!

사용자: "${userMessage}"

**이 메시지는 여러 장소/일정이 언급되었습니다!**
- action 단일 객체 사용 금지!
- 반드시 actions 배열 사용!
- 쉼표로 구분된 모든 장소명 추출!

**올바른 응답 형식:**
{
  "text": "속초아이, 중앙시장 일정 추가했어요!",
  "action": null,
  "actions": [
    { "type": "add_itinerary", "data": { "title": "속초아이", "time": "09:00" } },
    { "type": "add_itinerary", "data": { "title": "중앙시장", "time": "11:00" } }
  ]
}

🚨 각 action 항목의 필수 구조:
1. "type" 필드 - 액션 타입 지정
2. "data" 필드 - **반드시 필수 필드 포함!**
   ✅ add_itinerary: data.title 필수!
   ✅ set_budget: data.budget 필수!
   ✅ add_expense: data.amount, data.description 필수!
   ✅ add_person: data.personName 필수!

❌ 잘못된 예시 (시스템이 거부!):
{ "type": "add_itinerary" }  ← data 없음!
{ "type": "add_itinerary", "data": {} }  ← title 없음!
{ "type": "add_itinerary", "data": { "time": "15:00" } }  ← title 없음!

✅ 올바른 예시:
{ "type": "add_itinerary", "data": { "title": "속초 중앙시장" } }
{ "type": "add_itinerary", "data": { "title": "속초 중앙시장", "time": "15:00" } }

전체 응답 형식:
{
  "text": "모든 일정을 추가했어요!",
  "action": null,
  "actions": [
    { "type": "add_itinerary", "data": { "title": "속초아이", "time": "09:00", "itemType": "activity" } },
    { "type": "add_itinerary", "data": { "title": "속초 중앙시장", "time": "11:00", "itemType": "activity" } },
    { "type": "add_itinerary", "data": { "title": "델피노 소노캄", "time": "13:00", "itemType": "hotel" } }
  ]
}

사용자: "${userMessage}"`
      : `${systemPrompt}\n\n---\n사용자: "${userMessage}"`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: messageWithHint,
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
              description:
                '단일 액션 (하나의 일정만 있을 때만 사용. 여러 일정이면 actions 배열 사용)',
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
                  description:
                    '액션 타입에 따라 필요한 필드가 다름: add_itinerary는 title 필수, set_budget는 budget 필수, add_expense는 amount와 description 필수, add_person은 personName 필수',
                  properties: {
                    time: { type: Type.STRING, nullable: true },
                    title: {
                      type: Type.STRING,
                      description:
                        '⚠️ add_itinerary 타입일 때 반드시 필요함!',
                      nullable: true,
                    },
                    location: { type: Type.STRING, nullable: true },
                    itemType: {
                      type: Type.STRING,
                      enum: ['food', 'activity', 'hotel', 'travel'],
                      nullable: true,
                    },
                    notes: { type: Type.STRING, nullable: true },
                    amount: {
                      type: Type.NUMBER,
                      description: '⚠️ add_expense 타입일 때 반드시 필요함!',
                      nullable: true,
                    },
                    description: {
                      type: Type.STRING,
                      description: '⚠️ add_expense 타입일 때 반드시 필요함!',
                      nullable: true,
                    },
                    payerName: { type: Type.STRING, nullable: true },
                    budget: {
                      type: Type.NUMBER,
                      description:
                        '⚠️ set_budget 타입일 때 반드시 필요함! title 불필요!',
                      nullable: true,
                    },
                    personName: {
                      type: Type.STRING,
                      description: '⚠️ add_person 타입일 때 반드시 필요함!',
                      nullable: true,
                    },
                  },
                },
              },
            },
            actions: {
              type: Type.ARRAY,
              description:
                '2개 이상의 일정이 언급되면 반드시 이 배열 사용! 각 항목에는 type과 data가 모두 필요함. data 안에 title(장소명)이 반드시 포함되어야 함!',
              nullable: true,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    enum: [
                      'add_itinerary',
                      'add_expense',
                      'set_budget',
                      'add_person',
                    ],
                    description: '액션 타입',
                  },
                  data: {
                    type: Type.OBJECT,
                    description:
                      '액션 타입에 따라 필요한 필드가 다릅니다: add_itinerary는 title 필수, set_budget는 budget 필수, add_expense는 amount와 description 필수, add_person은 personName 필수',
                    properties: {
                      time: {
                        type: Type.STRING,
                        description:
                          '시간 (예: "09:00", "14:30") - add_itinerary에만 사용',
                        nullable: true,
                      },
                      title: {
                        type: Type.STRING,
                        description:
                          '⚠️ 장소명 (예: "속초아이", "중앙시장") - add_itinerary에만 사용하며 반드시 필요함!',
                        nullable: true,
                      },
                      location: { type: Type.STRING, nullable: true },
                      itemType: {
                        type: Type.STRING,
                        enum: ['food', 'activity', 'hotel', 'travel'],
                        nullable: true,
                        description: 'add_itinerary에만 사용',
                      },
                      notes: { type: Type.STRING, nullable: true },
                      amount: {
                        type: Type.NUMBER,
                        description:
                          '⚠️ 지출 금액 (원 단위) - add_expense 타입일 때 반드시 필요함!',
                        nullable: true,
                      },
                      description: {
                        type: Type.STRING,
                        description:
                          '⚠️ 지출 설명 - add_expense 타입일 때 반드시 필요함!',
                        nullable: true,
                      },
                      payerName: {
                        type: Type.STRING,
                        nullable: true,
                        description: '결제자 이름 - add_expense에 사용 (선택)',
                      },
                      budget: {
                        type: Type.NUMBER,
                        description:
                          '⚠️ 예산 금액 (원 단위) - set_budget 타입일 때 반드시 필요함! title은 필요 없음!',
                        nullable: true,
                      },
                      personName: {
                        type: Type.STRING,
                        description:
                          '⚠️ 멤버 이름 - add_person 타입일 때 반드시 필요함!',
                        nullable: true,
                      },
                    },
                  },
                },
                required: ['type', 'data'],
              },
            },
          },
          required: ['text'],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);

      console.log('📥 AI Response:', JSON.stringify(parsed, null, 2));

      // 🛡️ Fallback: AI가 data 없이 action을 생성한 경우 빈 객체라도 추가
      if (parsed.action && !parsed.action.data) {
        console.warn(
          '⚠️ AI generated action without data field, adding empty object:',
          parsed.action.type
        );
        parsed.action.data = {};
      }

      // 🛡️ Fallback: actions 배열의 각 항목에도 동일하게 적용
      if (parsed.actions && Array.isArray(parsed.actions)) {
        parsed.actions.forEach((action: AIAction, index: number) => {
          if (action && !action.data) {
            console.warn(
              `⚠️ AI generated action[${index}] without data field, adding empty object:`,
              action.type
            );
            action.data = {};
          }
        });
      }

      // Clean up action
      if (parsed.action?.type === 'none' || !parsed.action?.type) {
        delete parsed.action;
      }

      // AI가 "등록/추가했다"고 말했는지 확인
      const registrationKeywords = ['등록', '추가', '기록', '저장', '생성'];
      const hasRegistrationText = registrationKeywords.some(keyword =>
        parsed.text.includes(keyword)
      );

      // actions 배열이 있으면 우선 사용 (여러 일정 처리)
      if (
        parsed.actions &&
        Array.isArray(parsed.actions) &&
        parsed.actions.length > 0
      ) {
        // actions 배열에서 유효한 것만 필터링 (통합 검증 함수 사용)
        const validActions = parsed.actions.filter((a: AIAction) =>
          validateAction(a)
        );

        console.log(
          `📊 Total actions: ${parsed.actions.length}, Valid actions: ${validActions.length}`
        );

        if (validActions.length > 0) {
          console.log(
            `✅ Processing ${validActions.length} valid actions from array`
          );

          return {
            text: parsed.text,
            actions: validActions,
          };
        } else {
          console.warn('⚠️ actions array is empty or invalid:', parsed.actions);
        }
      }

      // 단일 action이 있으면 사용
      if (parsed.action && validateAction(parsed.action)) {
        console.log('✅ Processing single action:', parsed.action.type);
        return {
          text: parsed.text,
          action: parsed.action,
        };
      } else if (parsed.action && !validateAction(parsed.action)) {
        console.error(
          '❌ Invalid action detected, discarding:',
          parsed.action
        );
      }

      // action/actions 모두 없는데 "등록했다"고 말한 경우 경고
      if (
        hasRegistrationText &&
        !parsed.action &&
        (!parsed.actions || parsed.actions.length === 0)
      ) {
        console.error(
          '❌ CRITICAL: AI said it registered but provided no action!',
          {
            text: parsed.text,
            hasAction: !!parsed.action,
            hasActions: !!(parsed.actions && parsed.actions.length > 0),
          }
        );
      }

      // action/actions 모두 없으면 텍스트만 반환
      console.log('ℹ️ No valid actions found, returning text only');
      return {
        text: parsed.text,
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
