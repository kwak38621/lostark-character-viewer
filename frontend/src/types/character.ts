export interface EquipmentItem {
  type: string
  name: string
  grade: string
  icon?: string
  tooltip?: string
}

export interface Engraving {
  name: string
  level: number
}

export interface CharacterInfo {
  serverName: string
  characterName: string
  characterClassName: string
  itemAvgLevel: string
  characterImage?: string
  equipment: EquipmentItem[]
  engravings: Engraving[]
}

export interface Sibling {
  serverName: string
  characterName: string
  characterClassName: string
  characterLevel: number
  itemAvgLevel: string
}

export interface EnrichedSibling extends Sibling {
  characterImage?: string
  enlightenmentNodeDesc?: string  // 깨달음 첫 번째 노드 description 원문
}

export interface Tripod {
  tier: number
  slot: number
  name: string
  icon: string
  isSelected: boolean
}

export interface SkillRune {
  name: string
  icon: string
  grade: string
}

export interface Skill {
  name: string
  icon: string
  level: number
  type: string      // 예: "패시브", "무력화 하" 등
  skillType: number // 0=일반, 1=패시브 등
  tripods: Tripod[]
  rune: SkillRune | null
}

export interface ArkPassivePoint {
  name: string        // 진화 / 깨달음 / 도약
  value: number
  description: string // "6랭크 21레벨"
}

export interface ArkPassiveEffect {
  name: string        // 진화 / 깨달음 / 도약
  description: string // "깨달음 1티어 신속한 일격 Lv.1"
  icon: string
  tooltip: string     // ToolTip JSON 문자열
}

export interface ArkPassive {
  isArkPassive: boolean
  title: string
  points: ArkPassivePoint[]
  effects: ArkPassiveEffect[]
}

export interface ArkGridGem {
  index: number
  icon: string
  isActive: boolean
  grade: string
  tooltip: string
}

export interface ArkGridSlot {
  index: number
  icon: string
  name: string
  point: number
  grade: string
  tooltip: string
  gems: ArkGridGem[]
}

export interface ArkGridEffect {
  name: string
  level: number
  tooltip: string
}

export interface ArkGrid {
  slots: ArkGridSlot[]
  effects: ArkGridEffect[]
}

export interface CardItem {
  slot: number
  name: string
  icon: string
  awakeCount: number
  awakeTotal: number
  grade: string
}

export interface CardEffectItem {
  name: string
  description: string
}

export interface CardEffect {
  index: number
  items: CardEffectItem[]
}

export interface CardData {
  cards: CardItem[]
  effects: CardEffect[]
}

export interface GemItem {
  slot: number
  gemName: string
  gemIcon: string
  level: number
  grade: string
  skillName: string
  skillIcon: string
  effectDesc: string
}

export interface GemData {
  gems: GemItem[]
}
