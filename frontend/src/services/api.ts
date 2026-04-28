import axios from 'axios'
import type { ArkGrid, ArkPassive, CardData, CharacterInfo, EnrichedSibling, GemData, Sibling, Skill } from '@/types/character'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 서버에서 내려오는 ErrorResponse 메시지를 그대로 throw
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const serverMessage = error.response?.data?.message
    const status: number = error.response?.status ?? 0

    let message: string
    if (serverMessage) {
      message = serverMessage
    } else if (status === 0 || error.code === 'ECONNABORTED') {
      message = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
    } else {
      message = '알 수 없는 오류가 발생했습니다.'
    }

    const err = new Error(message) as Error & { status: number }
    err.status = status
    return Promise.reject(err)
  }
)

/** <summary>캐릭터 정보 조회</summary> */
export const fetchCharacter = async (characterName: string): Promise<CharacterInfo> => {
  const response = await apiClient.get<CharacterInfo>(`/characters/${encodeURIComponent(characterName)}`)
  return response.data
}

/** <summary>원정대 캐릭터 목록 조회</summary> */
export const fetchSiblings = async (characterName: string): Promise<Sibling[]> => {
  const response = await apiClient.get<Sibling[]>(`/characters/${encodeURIComponent(characterName)}/siblings`)
  return response.data
}

/** <summary>원정대 캐릭터 목록 조회 (이미지 + 깨달음 노드 포함)</summary> */
export const fetchEnrichedSiblings = async (characterName: string): Promise<EnrichedSibling[]> => {
  const response = await apiClient.get<EnrichedSibling[]>(`/characters/${encodeURIComponent(characterName)}/siblings/enriched`)
  return response.data
}

/** <summary>사용 중인 스킬 목록 조회</summary> */
export const fetchSkills = async (characterName: string): Promise<Skill[]> => {
  const response = await apiClient.get<Skill[]>(`/characters/${encodeURIComponent(characterName)}/skills`)
  return response.data
}

/** <summary>아크 패시브(아크 그리드) 조회</summary> */
export const fetchArkPassive = async (characterName: string): Promise<ArkPassive> => {
  const response = await apiClient.get<ArkPassive>(`/characters/${encodeURIComponent(characterName)}/arkpassive`)
  return response.data
}

/** <summary>아크 그리드 조회</summary> */
export const fetchArkGrid = async (characterName: string): Promise<ArkGrid> => {
  const response = await apiClient.get<ArkGrid>(`/characters/${encodeURIComponent(characterName)}/arkgrid`)
  return response.data
}

/** <summary>카드 조회</summary> */
export const fetchCards = async (characterName: string): Promise<CardData> => {
  const response = await apiClient.get<CardData>(`/characters/${encodeURIComponent(characterName)}/cards`)
  return response.data
}

/** <summary>보석 조회</summary> */
export const fetchGems = async (characterName: string): Promise<GemData> => {
  const response = await apiClient.get<GemData>(`/characters/${encodeURIComponent(characterName)}/gems`)
  return response.data
}
