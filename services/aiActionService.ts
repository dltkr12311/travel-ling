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

## ⚠️⚠️⚠️ 핵심 원칙 (절대 필수!)
1. **여러 일정은 반드시 actions 배열로 반환**: 문장에 2개 이상의 장소가 언급되면 **action 대신 actions 배열을 사용해야 함**
2. **긴 문장 자동 파싱**: "1시에 서울 출발, 4시 속초아이, 중앙시장, 델피노"처럼 여러 장소가 언급되면 **모두 추출해서 actions 배열로 반환**
3. **시간이 없어도 일정 추가**: 시간 없이도 장소만 있으면 추가 (나중에 편집 가능). 시간은 null 또는 추론 가능한 시간으로 설정
4. **순서와 맥락 파악**: "들렸다가", "그 다음에", "먼저", "나중에", "그리고" 등의 표현으로 순서 추론
5. **스마트한 시간 추론**: "1시에 출발하면 4시쯤 도착" 같은 표현에서 시간 계산. 이전 일정 시간 + 이동시간으로 자동 계산
6. **"알아서 짜줘", "대략 알아서" 처리**: 여러 장소가 언급되면 적절한 시간 배분해서 일정 생성. 첫 일정은 09:00 또는 언급된 시간부터 시작
7. **"속초아이, 중앙시장, 델피노 이렇게" 요청**: 장소명만 나열되어도 actions 배열로 모두 반환하고, 시간은 자동으로 배분

## ⚠️⚠️⚠️ 응답 형식 규칙 (절대 필수!)
- **단일 일정**: action 객체 사용
- **2개 이상 일정**: 반드시 actions 배열 사용 (action은 null 또는 생략)
- 여러 장소가 언급되면 질문하지 말고 즉시 actions 배열로 모두 반환
- **⚠️ 각 action 항목에는 반드시 type과 data 모두 포함!**
- **⚠️ data 안에 title(장소명)이 반드시 있어야 함!**
- 올바른 형식: { "type": "add_itinerary", "data": { "title": "속초아이", "time": "09:00" } }
- 잘못된 형식: { "type": "add_itinerary" }  ← data가 없으면 안됨!

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

- 입력: "속초아이, 속초 중앙시장, 델피노 소노캄, 영금정, 울산바위, 삼양양떼목장"
  → 쉼표로 구분된 모든 장소명을 actions 배열로 6개 모두 반환 (시간은 자동 배분):
    {
      "text": "속초아이, 속초 중앙시장, 델피노 소노캄, 영금정, 울산바위, 삼양양떼목장 일정을 모두 추가했어요! 📅",
      "action": null,
      "actions": [
        { "type": "add_itinerary", "data": { "time": "09:00", "title": "속초아이", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "10:30", "title": "속초 중앙시장", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "12:00", "title": "델피노 소노캄", "itemType": "hotel" } },
        { "type": "add_itinerary", "data": { "time": "14:00", "title": "영금정", "itemType": "activity" } },
        { "type": "add_itinerary", "data": { "time": "16:00", "title": "울산바위", "itemType": "activity" } },
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
**인식 패턴 예시:**
- "예산 30만원" → budget: 300000
- "예산 50" → budget: 500000 (만원 단위로 해석)

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
      ? `${systemPrompt}\n\n---\n⚠️⚠️⚠️ 매우 중요! 사용자 메시지에 여러 장소/일정이 언급된 것으로 보입니다!

**특히 쉼표(,)로 구분된 나열이 있으면 모든 장소명을 추출해야 합니다!**

사용자가 말한 모든 장소/일정을 문장에서 찾아서 actions 배열로 반환해야 합니다.
action 단일 객체가 아니라 반드시 actions 배열을 사용하세요!

⚠️⚠️⚠️ 중요: 각 action 항목에는 반드시:
1. "type": "add_itinerary" 
2. "data": { "title": "장소명" } ← title(장소명)이 반드시 있어야 함!

잘못된 예시 (이렇게 하면 안됨!):
{ "type": "add_itinerary" }  ← data가 없음!

올바른 예시 (반드시 이렇게!):
{ "type": "add_itinerary", "data": { "title": "속초아이", "time": "09:00", "itemType": "activity" } }

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
                  properties: {
                    time: { type: Type.STRING, nullable: true },
                    title: { type: Type.STRING, nullable: true },
                    location: { type: Type.STRING, nullable: true },
                    itemType: {
                      type: Type.STRING,
                      enum: ['food', 'activity', 'hotel', 'travel'],
                      nullable: true,
                    },
                    notes: { type: Type.STRING, nullable: true },
                    amount: { type: Type.NUMBER, nullable: true },
                    description: { type: Type.STRING, nullable: true },
                    payerName: { type: Type.STRING, nullable: true },
                    budget: { type: Type.NUMBER, nullable: true },
                    personName: { type: Type.STRING, nullable: true },
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
                      '⚠️ 필수! add_itinerary의 경우 title(장소명)이 반드시 포함되어야 함',
                    properties: {
                      time: {
                        type: Type.STRING,
                        description: '시간 (예: "09:00", "14:30")',
                        nullable: true,
                      },
                      title: {
                        type: Type.STRING,
                        description:
                          '⚠️ 필수! 장소명 (예: "속초아이", "중앙시장")',
                      },
                      location: { type: Type.STRING, nullable: true },
                      itemType: {
                        type: Type.STRING,
                        enum: ['food', 'activity', 'hotel', 'travel'],
                        nullable: true,
                      },
                      notes: { type: Type.STRING, nullable: true },
                      amount: { type: Type.NUMBER, nullable: true },
                      description: { type: Type.STRING, nullable: true },
                      payerName: { type: Type.STRING, nullable: true },
                      budget: { type: Type.NUMBER, nullable: true },
                      personName: { type: Type.STRING, nullable: true },
                    },
                    required: ['title'],
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
        // actions 배열에서 유효한 것만 필터링 (data와 필수 필드가 있어야 함)
        const validActions = parsed.actions.filter((a: AIAction) => {
          // 기본 조건: type과 data가 있어야 함
          if (!a.type || a.type === 'none' || !a.data) {
            console.warn('⚠️ Action missing type or data:', a);
            return false;
          }
          // add_itinerary의 경우 title이 필수
          if (a.type === 'add_itinerary' && !a.data.title) {
            console.warn('⚠️ add_itinerary missing title:', a);
            return false;
          }
          // add_expense의 경우 amount와 description이 필수
          if (
            a.type === 'add_expense' &&
            (!a.data.amount || !a.data.description)
          ) {
            console.warn('⚠️ add_expense missing required fields:', a);
            return false;
          }
          return true;
        });

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
      if (
        parsed.action &&
        parsed.action.type &&
        parsed.action.type !== 'none' &&
        parsed.action.data
      ) {
        // 필수 데이터 검증
        if (
          parsed.action.type === 'add_itinerary' &&
          !parsed.action.data.title
        ) {
          console.error(
            '❌ add_itinerary action missing title:',
            parsed.action
          );
        } else if (
          parsed.action.type === 'add_expense' &&
          (!parsed.action.data.amount || !parsed.action.data.description)
        ) {
          console.error(
            '❌ add_expense action missing required fields:',
            parsed.action
          );
        } else {
          console.log('✅ Processing single action:', parsed.action.type);
          return {
            text: parsed.text,
            action: parsed.action,
          };
        }
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
