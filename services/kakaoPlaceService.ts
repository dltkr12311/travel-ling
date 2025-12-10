import { PlaceSearchResult } from '../types';

declare global {
  interface Window {
    kakao: any;
  }
}

/**
 * Kakao SDK 로드 완료 대기
 */
const waitForKakaoSDK = (): Promise<boolean> => {
  return new Promise(resolve => {
    // 이미 로드됨
    if (window.kakao?.maps?.services) {
      console.log('[Kakao] ✅ SDK already loaded');
      resolve(true);
      return;
    }

    console.log('[Kakao] Waiting for SDK to load...');

    // 최대 5초 대기
    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      if (window.kakao?.maps?.services) {
        clearInterval(interval);
        console.log('[Kakao] ✅ SDK loaded after waiting');
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('[Kakao] ❌ SDK load timeout');
        console.error(
          'Check: 1) Domain registered in Kakao Developers, 2) API key is correct'
        );
        resolve(false);
      }
    }, 100);
  });
};

/**
 * Kakao Places API를 사용한 장소 검색
 * 속초/강원도 지역 장소를 우선 검색합니다
 */
export const searchPlacesKakao = async (
  query: string
): Promise<PlaceSearchResult[]> => {
  console.log(`[Kakao] Searching for: "${query}"`);

  const sdkLoaded = await waitForKakaoSDK();

  if (!sdkLoaded) {
    console.error('[Kakao] SDK not available, cannot search');
    return [];
  }

  return new Promise(resolve => {
    const ps = new window.kakao.maps.services.Places();

    // 검색어에 지역명이 없으면 "속초"를 추가
    const hasLocation = /속초|강릉|양양|고성|강원/.test(query);
    const searchQuery = hasLocation ? query : `속초 ${query}`;

    console.log(`[Kakao] Final search query: "${searchQuery}"`);

    // 정확도순 정렬 (ACCURACY)
    ps.keywordSearch(searchQuery, (data: any[], status: string) => {
      console.log('[Kakao] Search response:', {
        status,
        count: data?.length || 0,
      });

      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        const results: PlaceSearchResult[] = data.slice(0, 8).map(place => ({
          name: place.place_name,
          address: place.road_address_name || place.address_name,
          type: categorizePlace(place.category_group_code, place.category_name),
          lat: parseFloat(place.y),
          lng: parseFloat(place.x),
          description: place.category_name?.split(' > ').pop() || '',
        }));
        resolve(results);
      } else {
        // "속초" 추가 검색이 실패하면 원본 쿼리로 재시도
        console.log('[Kakao] Retrying with original query...');
        ps.keywordSearch(query, (data2: any[], status2: string) => {
          if (
            status2 === window.kakao.maps.services.Status.OK &&
            data2.length > 0
          ) {
            const results: PlaceSearchResult[] = data2
              .slice(0, 8)
              .map(place => ({
                name: place.place_name,
                address: place.road_address_name || place.address_name,
                type: categorizePlace(
                  place.category_group_code,
                  place.category_name
                ),
                lat: parseFloat(place.y),
                lng: parseFloat(place.x),
                description: place.category_name?.split(' > ').pop() || '',
              }));
            resolve(results);
          } else {
            console.log('[Kakao] No results found');
            resolve([]);
          }
        });
      }
    });
  });
};

/**
 * Kakao 카테고리 코드를 앱의 type으로 변환
 */
const categorizePlace = (
  categoryCode: string,
  categoryName: string
): 'food' | 'activity' | 'hotel' | 'travel' => {
  // Kakao category_group_code:
  // FD5: 음식점, CE7: 카페, AD5: 숙박, AT4: 관광명소, CT1: 문화시설, SW8: 지하철역, BK9: 은행, etc.

  switch (categoryCode) {
    case 'FD5': // 음식점
    case 'CE7': // 카페
      return 'food';
    case 'AD5': // 숙박
      return 'hotel';
    case 'AT4': // 관광명소
    case 'CT1': // 문화시설
      return 'activity';
    case 'SW8': // 지하철역
    case 'PK6': // 주차장
      return 'travel';
    default:
      // 카테고리 이름으로 추가 분류
      if (categoryName) {
        const name = categoryName.toLowerCase();
        if (
          name.includes('음식') ||
          name.includes('식당') ||
          name.includes('카페') ||
          name.includes('맛집')
        ) {
          return 'food';
        }
        if (
          name.includes('숙박') ||
          name.includes('호텔') ||
          name.includes('펜션') ||
          name.includes('모텔')
        ) {
          return 'hotel';
        }
        if (
          name.includes('터미널') ||
          name.includes('역') ||
          name.includes('공항') ||
          name.includes('버스')
        ) {
          return 'travel';
        }
      }
      return 'activity';
  }
};

/**
 * 좌표로 주소 검색 (Reverse Geocoding)
 */
export const getAddressFromCoords = async (
  lat: number,
  lng: number
): Promise<string> => {
  const sdkLoaded = await waitForKakaoSDK();

  if (!sdkLoaded) {
    return '';
  }

  return new Promise(resolve => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    const coord = new window.kakao.maps.LatLng(lat, lng);

    geocoder.coord2Address(
      coord.getLng(),
      coord.getLat(),
      (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const address =
            result[0]?.road_address?.address_name ||
            result[0]?.address?.address_name ||
            '';
          resolve(address);
        } else {
          resolve('');
        }
      }
    );
  });
};

/**
 * 주소/장소명으로 좌표 검색 (Geocoding)
 */
export const getCoordsFromAddress = async (
  address: string
): Promise<{ lat: number; lng: number } | null> => {
  const sdkLoaded = await waitForKakaoSDK();

  if (!sdkLoaded) {
    return null;
  }

  return new Promise(resolve => {
    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(address, (result: any[], status: string) => {
      if (
        status === window.kakao.maps.services.Status.OK &&
        result.length > 0
      ) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
        });
      } else {
        // 주소 검색 실패시 키워드 검색 시도
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(address, (data: any[], status2: string) => {
          if (
            status2 === window.kakao.maps.services.Status.OK &&
            data.length > 0
          ) {
            resolve({
              lat: parseFloat(data[0].y),
              lng: parseFloat(data[0].x),
            });
          } else {
            resolve(null);
          }
        });
      }
    });
  });
};
