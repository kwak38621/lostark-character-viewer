import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ArkGrid, ArkPassive, ArkPassiveEffect, CardData, CharacterInfo, EnrichedSibling, GemData, Skill } from '@/types/character'
import { fetchArkGrid, fetchArkPassive, fetchCards, fetchEnrichedSiblings, fetchGems, fetchSkills } from '@/services/api'

interface Props {
  character: CharacterInfo
  onSelectCharacter: (name: string) => void
}

const gradeStyle: Record<string, { color: string; bg: string; border: string }> = {
  '고대': { color: '#f5c842', bg: '#2a2310', border: '#5a4a18' },
  '유물': { color: '#e8722a', bg: '#2a1a0e', border: '#5a3014' },
  '전설': { color: '#f5a623', bg: '#251e0e', border: '#5a4010' },
  '영웅': { color: '#c084fc', bg: '#1e1430', border: '#4a2a6a' },
  '희귀': { color: '#60a5fa', bg: '#0e1a2e', border: '#1a3a5a' },
  '고급': { color: '#4ade80', bg: '#0e1e14', border: '#1a4a28' },
}

function GradeBadge({ grade }: { grade: string }) {
  const s = gradeStyle[grade] ?? { color: '#8892a4', bg: '#161929', border: '#252a3d' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: s.color, backgroundColor: s.bg }}>
      {grade}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: '#1e2340', borderTopColor: '#4f7bff' }} />
    </div>
  )
}

function TabError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
        style={{ backgroundColor: '#2a1020', border: '1px solid #5a1f2e' }}>
        ⚠️
      </div>
      <p className="text-sm text-center max-w-xs leading-relaxed" style={{ color: '#f87171' }}>{message}</p>
    </div>
  )
}

/* ──────────────────────── 장비 툴팁 파서 ──────────────────────── */

/** 연마/팔찌 효과 HTML에서 상/중/하/고정 색상 추출 */
function parsePolishLines(raw: string): TooltipLine[] {
  return raw
    .replace(/<img[^>]*>/gi, '')
    .split(/<br\s*\/?>/gi)
    .map(part => {
      const text = stripHtml(part).trim()
      if (!text) return null
      const colorMatch = part.match(/COLOR=['"]?#?([A-Fa-f0-9]{6})/gi)
      const codes = (colorMatch ?? []).map(c => c.replace(/COLOR=['"]?#?/i, '').toUpperCase())
      let color: string
      if (codes.includes('FE9600'))      color = '#f5c842'  // 상옵 → 노란색
      else if (codes.includes('CE43FC')) color = '#c084fc'  // 중옵 → 보라색
      else if (codes.includes('00B5FF')) color = '#60a5fa'  // 고정 스탯 → 파란색
      else if (codes.includes('91FE02')) color = '#a3e635'  // 스탯형 옵션 → 연두색
      else if (codes.includes('99FF99') || codes.includes('99ff99')) color = '#86efac' // 부가효과 → 연초록
      else                               color = '#60a5fa'  // 하옵 → 파란색
      return { text, color }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)
}

function parseEquipSections(tooltipJson?: string): TooltipSection[] {
  if (!tooltipJson) return []
  try {
    const parsed = JSON.parse(tooltipJson) as Record<string, { type: string; value: unknown } | null>
    const sections: TooltipSection[] = []
    let itemLevel = ''
    let quality = -1

    for (const key of Object.keys(parsed).sort()) {
      const el = parsed[key]
      if (!el?.type) continue

      if (el.type === 'ItemTitle' && typeof el.value === 'object' && el.value !== null) {
        const v = el.value as Record<string, unknown>
        if (typeof v.qualityValue === 'number') quality = v.qualityValue as number
        if (typeof v.leftStr2 === 'string') itemLevel = stripHtml(v.leftStr2 as string).trim()
      } else if (el.type === 'ItemPartBox' && typeof el.value === 'object' && el.value !== null) {
        const v = el.value as Record<string, string>
        const label = stripHtml(v.Element_000 ?? '').trim()
        const rawValue = v.Element_001 ?? ''
        // 연마 효과는 상/중/하 색상 적용
        if (label === '연마 효과' || label === '팔찌 효과') {
          const lines = parsePolishLines(rawValue)
          if (lines.length > 0) sections.push({ label, lines })
        } else {
          const lines: TooltipLine[] = stripHtml(
            rawValue.replace(/<br\s*\/?>/gi, '\n').replace(/<img[^>]*>/gi, '')
          ).split('\n').map(l => l.trim()).filter(Boolean).map(text => ({ text }))
          if (label && lines.length > 0) sections.push({ label, lines })
        }
      } else if (el.type === 'IndentStringGroup' && typeof el.value === 'object' && el.value !== null) {
        type GroupItem = { topStr?: string; contentStr?: Record<string, { contentStr?: string }> }
        const v = el.value as Record<string, GroupItem>
        for (const gk of Object.keys(v).sort()) {
          const group = v[gk]
          if (!group) continue
          const label = group.topStr ? stripHtml(group.topStr).trim() : ''
          const lines: TooltipLine[] = []
          if (group.contentStr) {
            for (const ck of Object.keys(group.contentStr).sort()) {
              const item = group.contentStr[ck]
              if (item?.contentStr) {
                const text = stripHtml(
                  item.contentStr.replace(/<br\s*\/?>/gi, '').replace(/<img[^>]*>/gi, '')
                ).trim()
                if (text) lines.push({ text })
              }
            }
          }
          if (lines.length > 0) sections.push({ label, lines })
        }
      }
    }

    const headerLines: TooltipLine[] = []
    if (itemLevel) headerLines.push({ text: itemLevel })
    if (quality >= 0) headerLines.push({ text: `품질 ${quality}${quality === 100 ? ' (최고)' : ''}` })
    if (headerLines.length > 0) sections.unshift({ label: '', lines: headerLines })

    return sections
  } catch {
    return []
  }
}

/* ──────────────────────── 보석 섹션 ──────────────────────── */
function GemsSection({ gemData }: { gemData: GemData }) {
  if (gemData.gems.length === 0) return null

  // 피해 / 쿨감 / 기타 분류
  const isDamage = (g: GemData['gems'][0]) =>
    g.effectDesc.includes('피해') || g.gemName.includes('겁화') || g.gemName.includes('작열') || g.gemName.includes('홍염')
  const isCool = (g: GemData['gems'][0]) =>
    g.effectDesc.includes('재사용') || g.gemName.includes('원시') || g.gemName.includes('청명')

  const damageGems = gemData.gems.filter(isDamage)
  const coolGems   = gemData.gems.filter(g => !isDamage(g) && isCool(g))
  const otherGems  = gemData.gems.filter(g => !isDamage(g) && !isCool(g))

  const GemRow = ({ gems, label }: { gems: GemData['gems']; label: string }) => {
    if (gems.length === 0) return null
    return (
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: '#3d4a6b' }}>{label}</p>
        <div className="flex flex-wrap gap-3">
          {gems.map((gem, i) => {
            const gs = gradeStyle[gem.grade] ?? { color: '#8892a4', bg: '#0d0f1a', border: '#252a3d' }
            return (
              <div key={i} className="flex flex-col items-center gap-1" style={{ width: '48px' }}>
                <div className="relative">
                  {/* 스킬 아이콘 */}
                  <div className="rounded-md overflow-hidden" style={{ width: '44px', height: '44px', backgroundColor: '#0d0f1a', border: `1px solid ${gs.border}` }}>
                    {gem.skillIcon
                      ? <img src={gem.skillIcon} alt={gem.skillName} className="w-full h-full object-cover" />
                      : <div className="w-full h-full" style={{ backgroundColor: gs.bg }} />
                    }
                  </div>
                  {/* 보석 아이콘 (우하단 오버레이) */}
                  <div className="absolute -bottom-1 -right-1 rounded overflow-hidden"
                    style={{ width: '18px', height: '18px', border: `1px solid ${gs.border}`, backgroundColor: '#0d0f1a' }}>
                    {gem.gemIcon && <img src={gem.gemIcon} alt={gem.gemName} className="w-full h-full object-cover" />}
                  </div>
                  {/* 보석 레벨 */}
                  <div className="absolute -top-1.5 -left-1.5 rounded-sm px-1 font-bold"
                    style={{ backgroundColor: '#0a0c18', color: gs.color, fontSize: '10px', lineHeight: '16px', border: `1px solid ${gs.border}` }}>
                    {gem.level}
                  </div>
                </div>
                {/* 스킬명 */}
                <p className="text-center leading-tight w-full overflow-hidden" style={{ fontSize: '10px', color: '#7a86a4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                  {gem.skillName || gem.gemName}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <section>
      <h4 className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#3d4a6b' }}>보석</h4>
      <div className="rounded-lg px-4 py-3 space-y-4" style={{ backgroundColor: '#161929', border: '1px solid #252a3d' }}>
        <GemRow gems={damageGems} label="피해" />
        <GemRow gems={coolGems}   label="쿨감" />
        <GemRow gems={otherGems}  label="기타" />
      </div>
    </section>
  )
}

/* ──────────────────────── 장비 인라인 정보 파서 ──────────────────────── */
function qualityBarColor(q: number) {
  if (q === 100) return '#e8a100'
  if (q >= 70)   return '#1a6ee8'
  if (q >= 30)   return '#1e8b1e'
  if (q >= 10)   return '#b44a00'
  return '#6e6e6e'
}

/** 카드에 인라인으로 보여줄 핵심 정보 추출 */
function parseInlineInfo(tooltipJson?: string, itemName?: string) {
  const enhance = itemName?.match(/\+(\d+)/)?.[1] ?? null
  if (!tooltipJson) return { enhance, quality: -1, stats: [] as TooltipLine[] }
  try {
    const parsed = JSON.parse(tooltipJson) as Record<string, { type: string; value: unknown } | null>
    let quality = -1
    const stats: TooltipLine[] = []

    for (const key of Object.keys(parsed).sort()) {
      const el = parsed[key]
      if (!el?.type) continue

      if (el.type === 'ItemTitle' && typeof el.value === 'object' && el.value !== null) {
        const v = el.value as Record<string, unknown>
        if (typeof v.qualityValue === 'number') quality = v.qualityValue as number
      } else if (el.type === 'ItemPartBox' && typeof el.value === 'object' && el.value !== null) {
        const v = el.value as Record<string, string>
        const label = stripHtml(v.Element_000 ?? '').trim()
        const rawValue = v.Element_001 ?? ''
        // 색상 코드가 있으면 모두 상/중/하 파싱 적용 (연마 효과, 팔찌 효과, 팔찌 기본 스탯 등)
        const hasColorCode = /COLOR=['"]?#?(FE9600|CE43FC|00B5FF|91FE02|99FF99)/i.test(rawValue)
        if (label === '연마 효과' || label === '팔찌 효과' || hasColorCode) {
          stats.push(...parsePolishLines(rawValue))
        }
      } else if (el.type === 'IndentStringGroup' && typeof el.value === 'object' && el.value !== null) {
        // 어빌리티 스톤 각인
        type GroupItem = { topStr?: string; contentStr?: Record<string, { contentStr?: string }> }
        const v = el.value as Record<string, GroupItem>
        for (const gk of Object.keys(v).sort()) {
          const group = v[gk]
          if (!group?.contentStr) continue
          for (const ck of Object.keys(group.contentStr).sort()) {
            const item = group.contentStr[ck]
            if (item?.contentStr) {
              const text = stripHtml(item.contentStr.replace(/<br\s*\/?>/gi, '').replace(/<img[^>]*>/gi, '')).trim()
              if (text) stats.push({ text })
            }
          }
        }
      }
    }
    return { enhance, quality, stats }
  } catch {
    return { enhance, quality: -1, stats: [] as TooltipLine[] }
  }
}

/* ──────────────────────── 팔찌 딜 효율 계산 ──────────────────────── */
/**
 * 팔찌 효율 계산 — ropegames 실측값 역산 계수 사용
 *
 * 특성 포인트 계수 (ropegames 실측 역산):
 *   치명  97pt → 2.64%  ⟹ 1pt = 0.0272%
 *   특화  86pt → 3.30%  ⟹ 1pt = 0.0384%
 *   민첩 10176 → 0.77%  ⟹ 1pt = 0.0000757%
 *
 * % 옵션 계수 (r=0.70, C_total=1.645, D=1.70 근사):
 *   치피/치명타로적중시 1% → 0.412%
 *   치적 1%               → 0.968%
 *   적주피 1%             → 1.0%
 *   추피/타대 1%          → 0.75%
 */
function calcBraceletDps(stats: TooltipLine[]): { value: number; isSupport: boolean } | null {
  // 특성 포인트 → %DPS 계수
  const CRIT_PT  = 0.0272    // 치명 1pt
  const SPEC_PT  = 0.0384    // 특화 1pt (클래스 의존, 범용 근사)
  const SWIFT_PT = 0.0250    // 신속 1pt (CDR 근사)
  const MAIN_PT  = 0.0000757 // 힘/민/지 1pt
  const WPN_PT   = 0.000210  // 무기공격력 1pt

  // % 옵션 계수
  const C_CRIT_DMG  = 0.412  // 치피 / 치명타로적중시 1% per %
  const C_CRIT_RATE = 0.968  // 치적 per %
  const C_DMG       = 1.0    // 적주피 / 공격력% / 아군 피해 증가 per %
  const C_ADD_DMG   = 0.75   // 추피 / 타대 per %

  let dps = 0
  let hasOption = false
  let isSupport = false

  for (const line of stats) {
    const t = line.text

    // ── 특성 포인트 ──────────────────────────────────────────────
    const critPts = t.match(/치명\s+\+?(\d+)/)?.[1]
    if (critPts) { dps += parseInt(critPts) * CRIT_PT; hasOption = true }

    const specPts = t.match(/특화\s+\+?(\d+)/)?.[1]
    if (specPts) { dps += parseInt(specPts) * SPEC_PT; hasOption = true }

    const swiftPts = t.match(/신속\s+\+?(\d+)/)?.[1]
    if (swiftPts) { dps += parseInt(swiftPts) * SWIFT_PT; hasOption = true }

    // 힘/민/지 — 툴팁에 캐릭터 전체 합산값이 표시되므로 낮은 계수 사용
    const mainPts = t.match(/(?:힘|민첩|지능)\s+\+?(\d+)/)?.[1]
    if (mainPts) { dps += parseInt(mainPts) * MAIN_PT; hasOption = true }

    const wpnPts = t.match(/무기공격력\s+\+?(\d+)/)?.[1]
    if (wpnPts) { dps += parseInt(wpnPts) * WPN_PT; hasOption = true }

    // ── % 옵션 ──────────────────────────────────────────────────
    // 치피: "치명타 피해가 X% 증가한다."
    const critDmgPct = t.match(/치명타\s*(?:주는\s*)?피해(?:가)?\s*\+?([\d.]+)%/)?.[1]
    if (critDmgPct) { dps += parseFloat(critDmgPct) * C_CRIT_DMG; hasOption = true }

    // 이중 옵션 2줄: "공격이 치명타로 적중 시 적에게 주는 피해가 X% 증가한다."
    const critHitPct = t.match(/치명타로\s*적중\s*시\s*적에게\s*주는\s*피해(?:가)?\s*\+?([\d.]+)%/)?.[1]
    if (critHitPct) { dps += parseFloat(critHitPct) * C_CRIT_DMG; hasOption = true }

    // 치적: "치명타 적중률이 X% 증가한다."
    const critRatePct = t.match(/치명타\s*적중률(?:이)?\s*\+?([\d.]+)%/)?.[1]
    if (critRatePct) { dps += parseFloat(critRatePct) * C_CRIT_RATE; hasOption = true }

    // 적주피: "적에게 주는 피해가 X% 증가한다." (치명타 조건 없는 순수 피해)
    if (!t.includes('치명타로') && !t.includes('치명타 피해')) {
      const bonusDmgPct = t.match(/적에게\s*주는\s*피해(?:가)?\s*\+?([\d.]+)%/)?.[1]
      if (bonusDmgPct) { dps += parseFloat(bonusDmgPct) * C_DMG; hasOption = true }
    }

    // 추피: "추가 피해가 X% 증가한다."
    const addDmgPct = t.match(/추가\s*피해(?:가)?\s*\+?([\d.]+)%/)?.[1]
    if (addDmgPct) { dps += parseFloat(addDmgPct) * C_ADD_DMG; hasOption = true }

    // 타대: "타격 대상에게 주는 피해 X%"
    const targetDmgPct = t.match(/타격\s*대상.*?피해(?:가)?\s*\+?([\d.]+)%/)?.[1]
    if (targetDmgPct) { dps += parseFloat(targetDmgPct) * C_ADD_DMG; hasOption = true }

    // 공격력 %
    const atkPct = t.match(/공격력(?:이)?\s*\+?([\d.]+)%/)?.[1]
    if (atkPct) { dps += parseFloat(atkPct) * C_DMG; hasOption = true }

    // 서포터: 아군 피해 증가
    const partyDmgPct = t.match(/아군.*?(?:피해|공격력).*?(?:증가|향상).*?([\d.]+)%/)?.[1]
    if (partyDmgPct) { dps += parseFloat(partyDmgPct) * C_DMG; hasOption = true; isSupport = true }
  }

  return hasOption ? { value: dps, isSupport } : null
}

/* ──────────────────────── 장비 탭 ──────────────────────── */
function EquipmentTab({ character, gemData }: { character: CharacterInfo; gemData: GemData | null }) {
  return (
    <div className="space-y-5">
      {/* 각인 */}
      {character.engravings && character.engravings.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#3d4a6b' }}>각인</h4>
          <div className="flex flex-wrap gap-2">
            {character.engravings.map((e, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: '#161929', border: '1px solid #252a3d' }}>
                <span style={{ color: '#c9d1e8' }}>{e.name}</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#1e2a4a', color: '#4f7bff' }}>
                  Lv.{e.level}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 장비 */}
      {character.equipment && character.equipment.length > 0 && (() => {
        const ARMOR_ORDER = ['투구','어깨','상의','하의','장갑','무기','보주']
        const ACCES_ORDER = ['목걸이','귀걸이','반지','팔찌','어빌리티 스톤']
        const EXCLUDE     = ['부적','나침반']

        const filtered = character.equipment.filter(e => !EXCLUDE.includes(e.type))
        const armorCol = ARMOR_ORDER.flatMap(t => filtered.filter(e => e.type === t))
        const accesCol = ACCES_ORDER.flatMap(t => filtered.filter(e => e.type === t))

        // 색상 → 상/중/하 뱃지
        const tierBadge = (color?: string): { label: string; color: string } | null => {
          if (color === '#f5c842') return { label: '상', color: '#f5c842' }
          if (color === '#c084fc') return { label: '중', color: '#c084fc' }
          if (color === '#60a5fa') return { label: '하', color: '#60a5fa' }
          return null
        }

        // 좌: 방어구·무기·보주 카드 (이름 + 강화 + 품질)
        const ArmorCard = ({ item }: { item: typeof character.equipment[0] }) => {
          const gs = gradeStyle[item.grade] ?? { color: '#8892a4', bg: '#161929', border: '#252a3d' }
          const sections = parseEquipSections(item.tooltip)
          const { enhance, quality } = parseInlineInfo(item.tooltip, item.name)
          const cleanName = item.name.replace(/^\+\d+\s*/, '')
          return (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
              style={{ backgroundColor: '#161929', border: `1px solid ${gs.border}` }}>
              <div className="shrink-0 relative">
                <ArkIconWithTooltip
                  icon={item.icon} alt={item.name}
                  iconClass="w-10 h-10 rounded-md overflow-hidden cursor-pointer"
                  iconStyle={{ border: `2px solid ${gs.border}`, backgroundColor: gs.bg }}
                  sections={sections}
                />
                {enhance && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 rounded-sm font-bold whitespace-nowrap"
                    style={{ backgroundColor: '#0a0c18', color: gs.color, fontSize: '9px', lineHeight: '14px', border: `1px solid ${gs.border}` }}>
                    +{enhance}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate" style={{ color: '#c9d1e8', fontSize: '11px' }}>{cleanName}</p>
                {quality >= 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: '#1e2340' }}>
                      <div style={{ width: `${quality}%`, height: '100%', backgroundColor: qualityBarColor(quality), borderRadius: '9999px' }} />
                    </div>
                    <span style={{ fontSize: '9px', color: qualityBarColor(quality), fontWeight: 600, minWidth: '18px' }}>{quality}</span>
                  </div>
                )}
              </div>
            </div>
          )
        }

        // 우: 악세·팔찌·스톤 카드 (아이콘 + 스탯 + 상/중/하 뱃지)
        const AccesCard = ({ item }: { item: typeof character.equipment[0] }) => {
          const gs = gradeStyle[item.grade] ?? { color: '#8892a4', bg: '#161929', border: '#252a3d' }
          const sections = parseEquipSections(item.tooltip)
          const { stats, quality } = parseInlineInfo(item.tooltip, item.name)
          const showQuality = quality >= 0 && ['목걸이','귀걸이','반지'].includes(item.type)
          return (
            <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg"
              style={{ backgroundColor: '#161929', border: `1px solid ${gs.border}` }}>
              <div className="shrink-0 flex flex-col items-center gap-1" style={{ width: '36px' }}>
                <ArkIconWithTooltip
                  icon={item.icon} alt={item.name}
                  iconClass="w-9 h-9 rounded-md overflow-hidden cursor-pointer"
                  iconStyle={{ border: `2px solid ${gs.border}`, backgroundColor: gs.bg }}
                  sections={sections}
                />
                {showQuality && (
                  <div className="w-full flex flex-col items-center gap-px">
                    <div className="w-full rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: '#1e2340' }}>
                      <div style={{ width: `${quality}%`, height: '100%', backgroundColor: qualityBarColor(quality), borderRadius: '9999px' }} />
                    </div>
                    <span style={{ fontSize: '8px', color: qualityBarColor(quality), fontWeight: 700, lineHeight: 1 }}>{quality}</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-px">
                {stats.length > 0 ? stats.map((line, li) => {
                  const badge = tierBadge(line.color)
                  return (
                    <div key={li} className="flex items-center justify-between gap-1">
                      <span style={{ fontSize: '10px', color: line.color ?? '#c9d1e8', lineHeight: '1.5' }} className="truncate">{line.text}</span>
                      {badge && (
                        <span className="shrink-0 font-bold rounded-sm px-1"
                          style={{ fontSize: '9px', color: badge.color, backgroundColor: '#0a0c18', lineHeight: '14px', border: `1px solid ${badge.color}33` }}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  )
                }) : (
                  <p style={{ fontSize: '10px', color: '#3d4a6b' }}>{item.name.replace(/^\+\d+\s*/, '')}</p>
                )}
                {item.type === '팔찌' && (() => {
                  const result = calcBraceletDps(stats)
                  if (result === null) return null
                  const label = result.isSupport ? '파티 기여' : '딜 효율'
                  return (
                    <div className="flex items-center justify-between mt-1 pt-1"
                      style={{ borderTop: '1px solid #252a3d' }}>
                      <span style={{ fontSize: '10px', color: '#3d4a6b' }}>{label}</span>
                      <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700 }}>
                        +{result.value.toFixed(2)}%
                      </span>
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        }

        return (
          <section>
            <h4 className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#3d4a6b' }}>장비</h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 items-start">
              <div className="space-y-1.5">
                {armorCol.map((item, i) => <ArmorCard key={i} item={item} />)}
              </div>
              <div className="space-y-1.5">
                {accesCol.map((item, i) => <AccesCard key={i} item={item} />)}
              </div>
            </div>
          </section>
        )
      })()}

      {/* 보석 */}
      {gemData && <GemsSection gemData={gemData} />}
    </div>
  )
}

/* ──────────────────────── 스킬 탭 ──────────────────────── */
// skillType: 0=일반, 1=패시브 (실제 값은 API 확인 필요)
const isPassive = (s: Skill) => s.skillType === 1 || s.type === '패시브'

function SkillsTab({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) return <p className="text-sm text-center py-10" style={{ color: '#3d4a6b' }}>스킬 정보가 없습니다.</p>

  const active  = skills.filter(s => !isPassive(s))
  const passive = skills.filter(s => isPassive(s))

  const SkillRow = ({ skill }: { skill: Skill }) => {
    const passive = isPassive(skill)
    const runeColor = skill.rune ? (gradeStyle[skill.rune.grade]?.color ?? '#8892a4') : '#8892a4'

    return (
      <div className="flex items-center gap-3 px-3 py-3 rounded-lg"
        style={{ backgroundColor: '#161929', border: '1px solid #252a3d' }}>
        {/* 아이콘 + 레벨 뱃지 */}
        <div className="shrink-0 relative">
          <div className="w-12 h-12 rounded-md overflow-hidden"
            style={{ border: `2px solid ${passive ? '#3d4a6b' : '#2a3050'}`, backgroundColor: '#0d0f1a' }}>
            {skill.icon && <img src={skill.icon} alt={skill.name} className="w-full h-full object-cover" />}
          </div>
          {skill.level > 0 && (
            <span className="absolute -bottom-1 -right-1 font-bold px-1 rounded"
              style={{ backgroundColor: '#1e2a4a', color: '#4f7bff', fontSize: '10px', lineHeight: '16px' }}>
              {skill.level}
            </span>
          )}
        </div>

        {/* 이름 + 타입 + 트라이포드 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: '#c9d1e8' }}>{skill.name}</span>
            {skill.type && (
              <span className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: '#1a2040', color: '#7a86a4', fontSize: '10px' }}>
                {skill.type}
              </span>
            )}
          </div>
          {skill.tripods.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {skill.tripods.map((t, ti) => (
                <div key={ti} className="flex items-center gap-1">
                  {t.icon && <img src={t.icon} alt={t.name} className="w-4 h-4 rounded" />}
                  <span style={{ color: '#7a86a4', fontSize: '11px' }}>{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 룬 */}
        {skill.rune && (
          <div className="shrink-0 flex flex-col items-center gap-1">
            {skill.rune.icon && (
              <img src={skill.rune.icon} alt={skill.rune.name} className="w-7 h-7 rounded" />
            )}
            <span className="text-xs font-semibold text-center" style={{ color: runeColor, fontSize: '10px' }}>
              {skill.rune.name}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold tracking-widest mb-2" style={{ color: '#3d4a6b' }}>스킬</h4>
          <div className="space-y-2">
            {active.map((s, i) => <SkillRow key={i} skill={s} />)}
          </div>
        </section>
      )}
      {passive.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold tracking-widest mb-2" style={{ color: '#3d4a6b' }}>패시브</h4>
          <div className="space-y-2">
            {passive.map((s, i) => <SkillRow key={i} skill={s} />)}
          </div>
        </section>
      )}
    </div>
  )
}

/* ──────────────────────── 보유 원정대 탭 ──────────────────────── */
function SiblingsTab({ siblings, onSelect }: { siblings: EnrichedSibling[]; onSelect: (name: string) => void }) {
  if (siblings.length === 0) return <p className="text-sm text-center py-10" style={{ color: '#3d4a6b' }}>원정대 정보가 없습니다.</p>

  const toNum = (v?: string) => parseFloat((v ?? '0').replace(',', ''))

  const grouped = siblings.reduce<Record<string, EnrichedSibling[]>>((acc, s) => {
    const key = s.serverName ?? '알 수 없음'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const sortByLevel = (list: EnrichedSibling[]) =>
    [...list].sort((a, b) => toNum(b.itemAvgLevel) - toNum(a.itemAvgLevel))

  const servers = Object.keys(grouped).sort((a, b) => {
    const maxA = Math.max(...grouped[a].map(s => toNum(s.itemAvgLevel)))
    const maxB = Math.max(...grouped[b].map(s => toNum(s.itemAvgLevel)))
    return maxB - maxA
  })

  return (
    <div className="space-y-6">
      {servers.map(server => (
        <section key={server}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold" style={{ color: '#4f7bff' }}>{server}</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#1e2a4a' }} />
            <span className="text-xs" style={{ color: '#3d4a6b' }}>{grouped[server].length}캐릭터</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {sortByLevel(grouped[server]).map((s, i) => {
              const nodeName = s.enlightenmentNodeDesc
                ? parseEffectDesc(s.enlightenmentNodeDesc).effectName
                : null
              return (
                <div key={i}
                  className="rounded-xl overflow-hidden flex flex-col cursor-pointer transition-transform hover:scale-[1.02] hover:brightness-110"
                  style={{ backgroundColor: '#161929', border: '1px solid #252a3d' }}
                  onClick={() => onSelect(s.characterName)}>
                  {/* 캐릭터 전신 이미지 */}
                  <div className="relative overflow-hidden shrink-0"
                    style={{ height: '200px', background: 'linear-gradient(180deg,#1e2340 0%,#0d0f1e 100%)' }}>
                    {s.characterImage ? (
                      <>
                        <img
                          src={s.characterImage}
                          alt={s.characterName}
                          className="w-full h-full object-cover object-center"
                          style={{ objectPosition: 'center 10%' }}
                        />
                        <div className="absolute inset-0 pointer-events-none"
                          style={{ background: 'linear-gradient(to bottom, transparent 60%, #161929 100%)' }} />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: '#252a3d' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* 정보 */}
                  <div className="px-3 py-2.5 space-y-1">
                    <p className="text-sm font-bold truncate" style={{ color: '#e2e8f0' }}>{s.characterName}</p>
                    <p className="text-xs truncate" style={{ color: '#5a6480' }}>
                      {s.characterClassName}&nbsp;·&nbsp;Lv.{s.characterLevel}
                    </p>
                    <p className="text-sm font-bold" style={{ color: '#f5c842' }}>{s.itemAvgLevel}</p>
                    {nodeName && (
                      <p className="text-xs truncate" style={{ color: '#7a9fff' }}>{nodeName}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

/* ──────────────────────── 아크 그리드 탭 ──────────────────────── */

interface TooltipLine {
  text: string
  color?: string
}

interface TooltipSection {
  label: string
  lines: TooltipLine[]
}

/**
 * ArkGrid 툴팁 JSON → ItemPartBox 섹션 목록으로 파싱
 * 구조: { label: "코어 옵션", lines: ["[10P] 치명타 시...", ...] }
 */
function parseArkTooltip(tooltipJson: string): TooltipSection[] {
  if (!tooltipJson) return []
  try {
    const parsed = JSON.parse(tooltipJson) as Record<string, { type: string; value: unknown } | null>
    const sections: TooltipSection[] = []

    for (const key of Object.keys(parsed).sort()) {
      const el = parsed[key]
      if (!el?.type || el.type !== 'ItemPartBox') continue
      if (typeof el.value !== 'object' || el.value === null) continue

      const v = el.value as Record<string, string>
      const label = stripHtml(v.Element_000 ?? '').trim()
      const rawValue = (v.Element_001 ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<img[^>]*>/gi, '')
      const lines: TooltipLine[] = stripHtml(rawValue)
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(text => ({ text }))

      if (label && lines.length > 0) {
        sections.push({ label, lines })
      }
    }
    return sections
  } catch {
    return []
  }
}

/** 포털 기반 툴팁 — overflow 클리핑 없이 viewport 위에 표시 */
function ArkIconWithTooltip({
  icon, alt, iconClass, iconStyle, sections, wide,
}: {
  icon?: string
  alt?: string
  iconClass: string
  iconStyle: React.CSSProperties
  sections: TooltipSection[]
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const handleEnter = () => {
    if (!ref.current || sections.length === 0) return
    const r = ref.current.getBoundingClientRect()
    const tooltipW = wide ? 320 : 260
    // 오른쪽 공간 부족하면 왼쪽에 표시
    const x = r.right + tooltipW + 8 > window.innerWidth
      ? r.left - tooltipW - 8
      : r.right + 8
    setPos({ x, y: r.top })
  }
  const handleLeave = () => setPos(null)

  // 툴팁이 렌더된 뒤 실제 높이를 측정해서 뷰포트 아래로 넘치면 y 재조정
  useLayoutEffect(() => {
    if (!pos || !tooltipRef.current) return
    const el = tooltipRef.current
    const overflow = pos.y + el.offsetHeight - (window.innerHeight - 8)
    if (overflow > 0) {
      const newY = Math.max(8, pos.y - overflow)
      if (newY !== pos.y) setPos(p => p ? { ...p, y: newY } : null)
    }
  }, [pos?.x, pos?.y])

  return (
    <div ref={ref} className={iconClass} style={iconStyle}
      onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {icon && <img src={icon} alt={alt ?? ''} className="w-full h-full object-cover" />}
      {pos && sections.length > 0 && createPortal(
        <div ref={tooltipRef} style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 9999,
          width: wide ? '320px' : '260px',
          backgroundColor: '#0a0c18',
          border: `1px solid #2a3050`,
          borderRadius: '8px',
          padding: '10px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
          pointerEvents: 'none',
          fontSize: '11px',
          color: '#c9d1e8',
          lineHeight: '1.5',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}>
          {sections.map((sec, si) => (
            <div key={si} style={si > 0 ? { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #252a3d' } : {}}>
              {sec.label && <p style={{ color: '#a9d0f5', fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}>{sec.label}</p>}
              {sec.lines.map((line, li) => (
                <p key={li} style={{ color: line.color ?? '#c9d1e8', marginBottom: '1px' }}>{line.text}</p>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

function ArkGridTab({ arkGrid }: { arkGrid: ArkGrid }) {
  if (arkGrid.slots.length === 0 && arkGrid.effects.length === 0) {
    return <p className="text-sm text-center py-10" style={{ color: '#3d4a6b' }}>아크 그리드 정보가 없습니다.</p>
  }

  return (
    <div className="space-y-5">
      {/* 이펙트 요약 */}
      {arkGrid.effects.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#3d4a6b' }}>효과</h4>
          <div className="flex flex-wrap gap-2">
            {arkGrid.effects.map((e, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: '#161929', border: '1px solid #252a3d' }}>
                <span style={{ color: '#c9d1e8' }}>{e.name}</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#1e2a4a', color: '#4f7bff' }}>
                  Lv.{e.level}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 슬롯(코어) 목록 */}
      {arkGrid.slots.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#3d4a6b' }}>슬롯</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {arkGrid.slots.map((slot, i) => {
              const gs = gradeStyle[slot.grade] ?? { color: '#8892a4', bg: '#161929', border: '#252a3d' }
              const activeGems = slot.gems.filter(g => g.isActive)
              const coreSections = parseArkTooltip(slot.tooltip)
              return (
                <div key={i} className="flex items-start gap-3 px-3 py-3 rounded-lg"
                  style={{ backgroundColor: '#161929', border: `1px solid ${gs.border}` }}>
                  {/* 코어 아이콘 — hover 시 포털 툴팁 */}
                  <div className="shrink-0">
                    <ArkIconWithTooltip
                      icon={slot.icon} alt={slot.name}
                      iconClass="w-12 h-12 rounded-md overflow-hidden cursor-pointer"
                      iconStyle={{ border: `2px solid ${gs.border}`, backgroundColor: gs.bg }}
                      sections={coreSections} wide
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold truncate" style={{ color: '#c9d1e8' }}>{slot.name}</span>
                      <GradeBadge grade={slot.grade} />
                    </div>
                    <p className="text-xs mb-2" style={{ color: '#5a6480' }}>포인트 {slot.point}</p>
                    {/* 젬 — 각각 hover 시 섹션형 툴팁 */}
                    {activeGems.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {activeGems.map((gem, gi) => {
                          const ggs = gradeStyle[gem.grade] ?? { color: '#8892a4', bg: '#0d0f1a', border: '#252a3d' }
                          const gemSections = parseArkTooltip(gem.tooltip)
                          return (
                            <ArkIconWithTooltip
                              key={gi}
                              icon={gem.icon}
                              iconClass="w-7 h-7 rounded overflow-hidden cursor-pointer"
                              iconStyle={{ border: `1px solid ${ggs.border}`, backgroundColor: ggs.bg }}
                              sections={gemSections}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

/* ──────────────────────── 아크 패시브 탭 ──────────────────────── */
const arkMeta: Record<string, { color: string; border: string; bg: string }> = {
  '진화':  { color: '#e8722a', border: '#5a3014', bg: '#2a1a0e' },
  '깨달음': { color: '#4f7bff', border: '#1e2a4a', bg: '#0e1428' },
  '도약':  { color: '#4ade80', border: '#1a4a28', bg: '#0e1e14' },
}

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, '').trim()
}

/** "<FONT>진화</FONT> 1티어 치명 Lv.10" → { effectName:"치명", level:"Lv.10" } */
function parseEffectDesc(rawDesc: string) {
  const desc = stripHtml(rawDesc)
  const m = desc.match(/\d+티어\s+(.+?)\s+(Lv\.\d+)$/)
  if (m) return { effectName: m[1].trim(), level: m[2] }
  return { effectName: desc, level: '' }
}

/**
 * ToolTip JSON 문자열에서 설명 텍스트 추출
 * {"Element_002":{"type":"MultiTextBox","value":"치명이 500 증가합니다.||"}}
 */
function parseTooltipDesc(tooltipJson: string): string {
  if (!tooltipJson) return ''
  try {
    const parsed = JSON.parse(tooltipJson) as Record<string, { type: string; value: unknown }>
    for (const key of Object.keys(parsed)) {
      const el = parsed[key]
      if (el.type === 'MultiTextBox' && typeof el.value === 'string') {
        return stripHtml(el.value)
          .replace(/\|\|/g, '')
          .replace(/\n+/g, ' ')
          .trim()
      }
    }
  } catch {
    // invalid JSON
  }
  return ''
}

function ArkPassiveTab({ ark }: { ark: ArkPassive }) {
  if (!ark.isArkPassive) {
    return <p className="text-sm text-center py-10" style={{ color: '#3d4a6b' }}>아크 패시브를 사용하지 않는 캐릭터입니다.</p>
  }

  const categories = ['진화', '깨달음', '도약'] as const

  return (
    <div className="space-y-5">
      {/* 포인트 요약 */}
      {ark.points.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {ark.points.map((p, i) => {
            const m = arkMeta[p.name]
            return (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ backgroundColor: m?.bg ?? '#161929', border: `1px solid ${m?.border ?? '#252a3d'}` }}>
                <span className="text-sm font-semibold" style={{ color: m?.color ?? '#8892a4' }}>{p.name}</span>
                <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{p.value}</span>
                <span className="text-xs" style={{ color: '#5a6480' }}>{p.description}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* 카테고리별 이펙트 */}
      {categories.map(cat => {
        const effects: ArkPassiveEffect[] = ark.effects.filter(e => e.name === cat)
        if (effects.length === 0) return null
        const m = arkMeta[cat]
        return (
          <section key={cat}>
            <h4 className="text-xs font-semibold tracking-widest mb-3" style={{ color: m.color }}>{cat}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {effects.map((effect, i) => {
                const { effectName, level } = parseEffectDesc(effect.description)
                const tooltipDesc = parseTooltipDesc(effect.tooltip)
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-lg"
                    style={{ backgroundColor: m.bg, border: `1px solid ${m.border}` }}>
                    {/* 아이콘 — hover 시 툴팁 표시 */}
                    {effect.icon && (
                      <div className="shrink-0 relative group">
                        <div className="w-10 h-10 rounded-md overflow-hidden cursor-pointer"
                          style={{ border: `1px solid ${m.border}` }}>
                          <img src={effect.icon} alt={effectName} className="w-full h-full object-cover" />
                        </div>
                        {tooltipDesc && (
                          <div
                            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
                                       hidden group-hover:block w-52 px-3 py-2 rounded-lg text-xs leading-relaxed
                                       pointer-events-none"
                            style={{
                              backgroundColor: '#0d0f1a',
                              border: `1px solid ${m.border}`,
                              color: '#c9d1e8',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                            }}
                          >
                            <p className="font-semibold mb-1" style={{ color: m.color }}>{effectName}</p>
                            {tooltipDesc}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: '#c9d1e8' }}>{effectName}</p>
                      {level && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block"
                          style={{ backgroundColor: '#1e2a4a', color: m.color }}>
                          {level}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/* ──────────────────────── 카드 패널 ──────────────────────── */
const cardGradeColor: Record<string, string> = {
  '전설': '#f5a623',
  '영웅': '#c084fc',
  '희귀': '#60a5fa',
  '고급': '#4ade80',
  '일반': '#8892a4',
}

function CardPanel({ cardData }: { cardData: CardData }) {
  const [expanded, setExpanded] = useState(false)
  if (cardData.cards.length === 0 && cardData.effects.length === 0) return null

  // 활성화된 세트 효과 (items가 있는 것만)
  const activeEffects = cardData.effects.filter(e => e.items && e.items.length > 0)
  const setName = activeEffects.length > 0 ? activeEffects[activeEffects.length - 1].items[0]?.name : null

  return (
    <div className="pt-3" style={{ borderTop: '1px solid #1e2340' }}>
      {/* 카드 그리드 (3열 2행) */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {cardData.cards.map((card, i) => {
          const borderColor = cardGradeColor[card.grade] ?? '#252a3d'
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="rounded-md overflow-hidden" style={{ width: '72px', height: '72px', border: `2px solid ${borderColor}`, backgroundColor: '#0d0f1a' }}>
                {card.icon
                  ? <img src={card.icon} alt={card.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full" style={{ backgroundColor: '#1a1f3a' }} />
                }
              </div>
              {/* 각성 별 */}
              {card.awakeTotal > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: card.awakeTotal }).map((_, si) => (
                    <span key={si} style={{ fontSize: '10px', color: si < card.awakeCount ? '#f5c842' : '#2a3050' }}>★</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 세트 효과 */}
      {activeEffects.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 w-full text-left"
          >
            <span className="text-xs font-semibold truncate flex-1" style={{ color: '#a9d0f5' }}>
              {setName ?? '카드 세트'}
            </span>
            <span style={{ color: '#3d4a6b', fontSize: '11px' }}>{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && (
            <ul className="mt-1.5 space-y-1">
              {activeEffects.flatMap(e => e.items).map((item, i) => (
                <li key={i} style={{ fontSize: '11px', color: '#7a86a4', lineHeight: '1.5' }}>
                  • {item.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────── 주간 영수증 탭 ──────────────────────── */
interface RaidInfo { name: string; tradeGold: number; boundGold: number }

// 세르카 (그림자 레이드) — 거래 가능
const SERKA_RAIDS = [
  { minLevel: 1740, name: '세르카 나이트메어', tradeGold: 54000, boundGold: 0 },
  { minLevel: 1730, name: '세르카 하드',       tradeGold: 44000, boundGold: 0 },
  { minLevel: 1710, name: '세르카 노말',       tradeGold: 35000, boundGold: 0 },
] as const

// 카제로스 종막 (최후의 날) — 거래 가능
const JONGMAK_RAIDS = [
  { minLevel: 1730, name: '카제로스 종막 하드', tradeGold: 52000, boundGold: 0 },
  { minLevel: 1710, name: '카제로스 종막 노말', tradeGold: 40000, boundGold: 0 },
] as const

// 카제로스 4막 (파멸의 성채) — 거래 가능
const FOURMAK_RAIDS = [
  { minLevel: 1720, name: '파멸의 성채 하드', tradeGold: 42000, boundGold: 0 },
  { minLevel: 1700, name: '파멸의 성채 노말', tradeGold: 33000, boundGold: 0 },
] as const

// 지평의 성당 — 귀속골드
const JIPYEONG_RAIDS = [
  { minLevel: 1750, name: '지평의 성당 3단계', tradeGold: 0, boundGold: 50000 },
  { minLevel: 1720, name: '지평의 성당 2단계', tradeGold: 0, boundGold: 40000 },
  { minLevel: 1700, name: '지평의 성당 1단계', tradeGold: 0, boundGold: 30000 },
] as const

// 카제로스 서막~3막 (막별 최고 난이도) — 거래 가능
const KAZEROS_MAKS = [
  { mak: '3막', normalMin: 1680, hardMin: 1700, normalGold: 21000, hardGold: 27000 },
  { mak: '2막', normalMin: 1670, hardMin: 1690, normalGold: 16500, hardGold: 23000 },
  { mak: '1막', normalMin: 1640, hardMin: 1660, normalGold: 11500, hardGold: 18000 },
  { mak: '서막', normalMin: 1620, hardMin: 1630, normalGold: 6100,  hardGold: 7200  },
]

// 일일 카던 타입
const DAILY_TIERS = [
  { minLevel: 1730, dungeonName: '심연의 잔영',  boundGoldPerRun: 1800 },
  { minLevel: 1700, dungeonName: '쿠르잔 전선',  boundGoldPerRun: 1400 },
  { minLevel: 1640, dungeonName: '쿠르잔 전선',  boundGoldPerRun: 1000 },
  { minLevel: 1610, dungeonName: '카오스던전',   boundGoldPerRun: 800  },
  { minLevel: 1580, dungeonName: '카오스던전',   boundGoldPerRun: 600  },
  { minLevel: 0,    dungeonName: '카오스던전',   boundGoldPerRun: 400  },
]

/** 캐릭터 아이템레벨에 따른 주간 레이드 3개 목록 반환 */
function getWeeklyRaids(ilvl: number, includeJipyeong: boolean): RaidInfo[] {
  const best = <T extends { minLevel: number }>(list: readonly T[]): T | null =>
    list.find(r => ilvl >= r.minLevel) ?? null

  // 1710+ : 세르카 + 종막 + (지평 OR 4막)
  if (ilvl >= 1710) {
    const serka   = best(SERKA_RAIDS)!
    const jongmak = best(JONGMAK_RAIDS)!
    const third   = includeJipyeong ? best(JIPYEONG_RAIDS) : best(FOURMAK_RAIDS)
    return third ? [serka, jongmak, third] : [serka, jongmak]
  }

  // 1700~1709 : 4막 노말 + 3막하드 + (지평 1단계 if 포함)
  if (ilvl >= 1700) {
    const raids: RaidInfo[] = [
      { name: '파멸의 성채 노말', tradeGold: 33000, boundGold: 0 },
      { name: '카제로스 3막 하드', tradeGold: 27000, boundGold: 0 },
    ]
    if (includeJipyeong) raids.push({ name: '지평의 성당 1단계', tradeGold: 0, boundGold: 30000 })
    else raids.push({ name: '카제로스 2막 하드', tradeGold: 23000, boundGold: 0 })
    return raids
  }

  // <1700 : 상위 3 카제로스 막 (막별 최고 난이도)
  return KAZEROS_MAKS
    .filter(m => ilvl >= m.normalMin)
    .map(m => {
      const hard = ilvl >= m.hardMin
      return { name: `카제로스 ${m.mak} ${hard ? '하드' : '노말'}`, tradeGold: hard ? m.hardGold : m.normalGold, boundGold: 0 }
    })
    .slice(0, 3)
}

function WeeklyReceiptTab({ siblings }: { siblings: EnrichedSibling[] }) {
  const [includeJipyeong, setIncludeJipyeong] = useState(true)

  const toNum = (v?: string) => parseFloat((v ?? '0').replace(',', ''))
  const fmt   = (n: number)  => n.toLocaleString('ko-KR')

  if (siblings.length === 0) {
    return <p className="text-sm text-center py-10" style={{ color: '#3d4a6b' }}>원정대 정보가 없습니다.</p>
  }

  const allChars = [...siblings].sort((a, b) => toNum(b.itemAvgLevel) - toNum(a.itemAvgLevel))
  const top6     = allChars.slice(0, 6)
  const getDailyTier = (ilvl: number) => DAILY_TIERS.find(t => ilvl >= t.minLevel) ?? DAILY_TIERS[DAILY_TIERS.length - 1]

  const raidTotals = top6.map(char => {
    const ilvl  = toNum(char.itemAvgLevel)
    const raids = getWeeklyRaids(ilvl, includeJipyeong)
    return { char, raids, tradeTotal: raids.reduce((s, r) => s + r.tradeGold, 0), boundTotal: raids.reduce((s, r) => s + r.boundGold, 0) }
  })
  const grandTradeGold  = raidTotals.reduce((s, t) => s + t.tradeTotal, 0)
  const grandBoundRaid  = raidTotals.reduce((s, t) => s + t.boundTotal, 0)
  const grandDailyBound = allChars.reduce((s, c) => s + getDailyTier(toNum(c.itemAvgLevel)).boundGoldPerRun * 7, 0)

  const RaidBadge = ({ raid }: { raid: RaidInfo }) => {
    const isBound = raid.boundGold > 0
    return (
      <div className="flex items-center justify-between gap-2 px-2 py-1 rounded"
        style={{ backgroundColor: '#0d0f1a', border: `1px solid ${isBound ? '#2a3a1a' : '#1e2340'}` }}>
        <span style={{ fontSize: '11px', color: '#7a86a4' }}>{raid.name}</span>
        <span className="font-bold shrink-0"
          style={{ fontSize: '11px', color: isBound ? '#86efac' : '#f5c842' }}>
          {fmt(isBound ? raid.boundGold : raid.tradeGold)}
          <span style={{ fontSize: '9px', marginLeft: '2px', opacity: 0.7 }}>{isBound ? ' 귀속' : ' G'}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── 총합 요약 + 토글 ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold tracking-widest" style={{ color: '#3d4a6b' }}>주간 총합</h4>
          <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setIncludeJipyeong(v => !v)}>
            <div className="relative w-9 h-5 rounded-full transition-colors"
              style={{ backgroundColor: includeJipyeong ? '#1a3a2a' : '#1e2340', border: `1px solid ${includeJipyeong ? '#4ade80' : '#252a3d'}` }}>
              <div className="absolute top-0.5 rounded-full transition-all"
                style={{ width: '14px', height: '14px', left: includeJipyeong ? '18px' : '2px', backgroundColor: includeJipyeong ? '#4ade80' : '#3d4a6b' }} />
            </div>
            <span className="text-xs" style={{ color: includeJipyeong ? '#86efac' : '#5a6480' }}>지평의 성당 포함</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#161929', border: '1px solid #2a3050' }}>
            <p className="text-xs mb-1" style={{ color: '#5a6480' }}>레이드 골드 (거래가능)</p>
            <p className="text-lg font-bold" style={{ color: '#f5c842' }}>{fmt(grandTradeGold)} G</p>
            <p className="text-xs mt-0.5" style={{ color: '#3d4a6b' }}>상위 {top6.length}캐릭 기준</p>
          </div>
          <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#161929', border: '1px solid #252a3d' }}>
            <p className="text-xs mb-1" style={{ color: '#5a6480' }}>귀속 골드 (레이드+일일)</p>
            <p className="text-lg font-bold" style={{ color: '#86efac' }}>{fmt(grandBoundRaid + grandDailyBound)} G</p>
            <p className="text-xs mt-0.5" style={{ color: '#3d4a6b' }}>
              레이드 {fmt(grandBoundRaid)} · 일일 {fmt(grandDailyBound)}
            </p>
          </div>
        </div>
      </section>

      {/* ── 주간 레이드 (상위 6캐릭) ── */}
      <section>
        <h4 className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#3d4a6b' }}>
          주간 레이드 <span style={{ color: '#252a3d', fontWeight: 400 }}>— 상위 {top6.length}캐릭터</span>
        </h4>
        <div className="space-y-2">
          {raidTotals.map(({ char, raids, tradeTotal, boundTotal }, i) => (
            <div key={i} className="px-3 py-3 rounded-lg" style={{ backgroundColor: '#161929', border: '1px solid #1e2340' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold w-4 text-center shrink-0" style={{ color: '#3d4a6b' }}>{i + 1}</span>
                <span className="text-sm font-semibold flex-1 truncate" style={{ color: '#c9d1e8' }}>{char.characterName}</span>
                <span className="text-xs shrink-0" style={{ color: '#f5c842' }}>{char.itemAvgLevel}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {tradeTotal > 0 && <span className="text-sm font-bold" style={{ color: '#f5c842' }}>{fmt(tradeTotal)} G</span>}
                  {boundTotal > 0 && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: '#1a2a1a', color: '#86efac', border: '1px solid #2a4a2a' }}>
                      +{fmt(boundTotal)} 귀속
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1 pl-6">
                {raids.map((raid, ri) => <RaidBadge key={ri} raid={raid} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 일일 숙제 (전 캐릭, 1회/일) ── */}
      <section>
        <h4 className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#3d4a6b' }}>
          일일 숙제 <span style={{ color: '#252a3d', fontWeight: 400 }}>— 전체 {allChars.length}캐릭터</span>
        </h4>
        <div className="space-y-1.5">
          {allChars.map((char, i) => {
            const ilvl      = toNum(char.itemAvgLevel)
            const tier      = getDailyTier(ilvl)
            const weekBound = tier.boundGoldPerRun * 7
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: '#161929', border: '1px solid #1e2340' }}>
                <span className="text-sm font-semibold flex-1 truncate" style={{ color: '#c9d1e8' }}>{char.characterName}</span>
                <span className="text-xs shrink-0" style={{ color: '#f5c842' }}>{char.itemAvgLevel}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#1a1f3a', color: '#7a86a4', fontSize: '10px' }}>
                    {tier.dungeonName} ×1
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#1a1f3a', color: '#7a86a4', fontSize: '10px' }}>
                    가토 ×1
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold" style={{ color: '#86efac' }}>{fmt(weekBound)} G/주</p>
                  <p style={{ fontSize: '10px', color: '#3d4a6b' }}>{fmt(tier.boundGoldPerRun)} G/일 · 귀속</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

/* ──────────────────────── 메인 카드 ──────────────────────── */
type Tab = 'equipment' | 'skills' | 'siblings' | 'arkgrid' | 'arkpassive' | 'receipt'

const TABS: { id: Tab; label: string }[] = [
  { id: 'equipment',  label: '장비' },
  { id: 'skills',     label: '스킬' },
  { id: 'siblings',   label: '보유 원정대' },
  { id: 'arkgrid',    label: '아크 그리드' },
  { id: 'arkpassive', label: '아크 패시브' },
  { id: 'receipt',    label: '주간 영수증' },
]

export default function CharacterCard({ character, onSelectCharacter }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('equipment')
  const [skills, setSkills]       = useState<Skill[] | null>(null)
  const [siblings, setSiblings]   = useState<EnrichedSibling[] | null>(null)
  const [arkGrid, setArkGrid]     = useState<ArkGrid | null>(null)
  const [ark, setArk]             = useState<ArkPassive | null>(null)
  const [cardData, setCardData]   = useState<CardData | null>(null)
  const [gemData, setGemData]     = useState<GemData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [skillsError, setSkillsError]     = useState<string | null>(null)
  const [siblingsError, setSiblingsError] = useState<string | null>(null)
  const [arkGridError, setArkGridError]   = useState<string | null>(null)
  const [arkError, setArkError]           = useState<string | null>(null)

  useEffect(() => {
    fetchCards(character.characterName)
      .then(setCardData)
      .catch(() => setCardData({ cards: [], effects: [] }))
    fetchGems(character.characterName)
      .then(setGemData)
      .catch(() => setGemData({ gems: [] }))
  }, [character.characterName])

  const handleTab = async (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'skills' && skills === null) {
      setLoading(true); setSkillsError(null)
      try { setSkills(await fetchSkills(character.characterName)) }
      catch (e) { setSkillsError(e instanceof Error ? e.message : '스킬 정보를 불러오지 못했습니다.') }
      finally { setLoading(false) }
    }
    if ((tab === 'siblings' || tab === 'receipt') && siblings === null) {
      setLoading(true); setSiblingsError(null)
      try { setSiblings(await fetchEnrichedSiblings(character.characterName)) }
      catch (e) { setSiblingsError(e instanceof Error ? e.message : '원정대 정보를 불러오지 못했습니다.') }
      finally { setLoading(false) }
    }
    if (tab === 'arkgrid' && arkGrid === null) {
      setLoading(true); setArkGridError(null)
      try { setArkGrid(await fetchArkGrid(character.characterName)) }
      catch (e) { setArkGridError(e instanceof Error ? e.message : '아크 그리드 정보를 불러오지 못했습니다.') }
      finally { setLoading(false) }
    }
    if (tab === 'arkpassive' && ark === null) {
      setLoading(true); setArkError(null)
      try { setArk(await fetchArkPassive(character.characterName)) }
      catch (e) { setArkError(e instanceof Error ? e.message : '아크 패시브 정보를 불러오지 못했습니다.') }
      finally { setLoading(false) }
    }
  }

  return (
    <div className="mt-6 rounded-xl overflow-hidden" style={{ backgroundColor: '#11142a', border: '1px solid #1e2340' }}>
      <div className="flex min-h-0">
        {/* ── 좌측: 캐릭터 프로필 ── */}
        <aside className="shrink-0 flex flex-col" style={{ width: '280px', borderRight: '1px solid #1e2340' }}>
          {/* 이미지 */}
          <div className="relative overflow-hidden" style={{ height: '260px', background: 'linear-gradient(180deg,#1a1f3a 0%,#0d0f1e 100%)' }}>
            {character.characterImage ? (
              <>
                <img
                  src={character.characterImage}
                  alt={character.characterName}
                  className="w-full h-full object-cover object-top transition-transform duration-300 hover:scale-110"
                />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, transparent 60%, #11142a 100%)' }} />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: '#252a3d' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
            )}
          </div>

          {/* 텍스트 정보 */}
          <div className="flex-1 p-4 space-y-3">
            <div>
              <h2 className="text-base font-bold leading-tight" style={{ color: '#e2e8f0' }}>
                {character.characterName}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#5a6480' }}>
                {character.serverName}
              </p>
              <p className="text-xs" style={{ color: '#7a86a4' }}>
                {character.characterClassName}
              </p>
            </div>

            <div className="pt-2" style={{ borderTop: '1px solid #1e2340' }}>
              <p className="text-xs mb-1" style={{ color: '#3d4a6b' }}>아이템 레벨</p>
              <p className="text-lg font-bold" style={{ color: '#f5c842' }}>
                {character.itemAvgLevel}
              </p>
            </div>

            {cardData && <CardPanel cardData={cardData} />}
          </div>
        </aside>

        {/* ── 우측: 탭 + 콘텐츠 ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 탭 바 */}
          <div className="flex shrink-0" style={{ borderBottom: '1px solid #1e2340' }}>
            {TABS.map(({ id, label }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => handleTab(id)}
                  className="px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap"
                  style={{
                    color: isActive ? '#e2e8f0' : '#5a6480',
                    borderBottom: isActive ? '2px solid #4f7bff' : '2px solid transparent',
                    backgroundColor: 'transparent',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 p-5 overflow-y-auto" style={{ minHeight: '300px' }}>
            {loading ? (
              <Spinner />
            ) : (
              <>
                {activeTab === 'equipment'  && <EquipmentTab character={character} gemData={gemData} />}
                {activeTab === 'skills'     && (skillsError   ? <TabError message={skillsError} />   : skills   !== null && <SkillsTab skills={skills} />)}
                {activeTab === 'siblings'   && (siblingsError ? <TabError message={siblingsError} /> : siblings !== null && <SiblingsTab siblings={siblings} onSelect={onSelectCharacter} />)}
                {activeTab === 'arkgrid'    && (arkGridError  ? <TabError message={arkGridError} />  : arkGrid  !== null && <ArkGridTab arkGrid={arkGrid} />)}
                {activeTab === 'arkpassive' && (arkError      ? <TabError message={arkError} />      : ark      !== null && <ArkPassiveTab ark={ark} />)}
                {activeTab === 'receipt'    && (siblingsError ? <TabError message={siblingsError} /> : siblings !== null && <WeeklyReceiptTab siblings={siblings} />)}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
