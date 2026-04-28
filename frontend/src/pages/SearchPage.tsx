import { useState } from 'react'
import CharacterCard from '@/components/CharacterCard'
import RecentSearchList from '@/components/RecentSearchList'
import { fetchCharacter } from '@/services/api'
import type { CharacterInfo } from '@/types/character'

function SearchPage() {
  const [query, setQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('recentSearches') ?? '[]') as string[]
  )
  const [character, setCharacter] = useState<CharacterInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (name?: string) => {
    const target = (name ?? query).trim()
    if (!target) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCharacter(target)
      setCharacter(data)
      saveRecentSearch(target)
    } catch (e) {
      setError(e instanceof Error ? e.message : '캐릭터를 찾을 수 없습니다.')
      setCharacter(null)
    } finally {
      setLoading(false)
    }
  }

  const saveRecentSearch = (name: string) => {
    const updated = [name, ...recentSearches.filter((n) => n !== name)].slice(0, 10)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
    setRecentSearches(updated)
  }

  const deleteRecentSearch = (name: string) => {
    const updated = recentSearches.filter((n) => n !== name)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
    setRecentSearches(updated)
  }

  return (
    <div>
      {/* 검색 히어로 영역 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#c9d1e8' }}>
          캐릭터 정보 조회
        </h1>
        <p className="text-sm" style={{ color: '#5a6480' }}>
          로스트아크 캐릭터명을 입력하세요
        </p>
      </div>

      {/* 검색바 */}
      <div
        className="flex gap-2 mb-6 p-2 rounded-xl"
        style={{ backgroundColor: '#11142a', border: '1px solid #1e2340' }}
      >
        <input
          type="text"
          className="flex-1 px-4 py-3 rounded-lg bg-transparent outline-none text-base placeholder-gray-600"
          style={{ color: '#c9d1e8' }}
          placeholder="캐릭터 이름 입력..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          className="px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4f7bff, #7c3aed)', color: '#fff' }}
          onClick={() => handleSearch()}
        >
          검색
        </button>
      </div>

      <RecentSearchList searches={recentSearches} onSelect={(name) => { setQuery(name); handleSearch(name) }} onDelete={deleteRecentSearch} />

      {loading && (
        <div className="flex justify-center items-center py-16">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: '#1e2340', borderTopColor: '#4f7bff' }}
          />
        </div>
      )}

      {error && (
        <div
          className="text-center py-6 rounded-xl text-sm mt-4"
          style={{ backgroundColor: '#1e1520', border: '1px solid #3d1f2e', color: '#f87171' }}
        >
          {error}
        </div>
      )}

      {character && (
        <CharacterCard
          key={character.characterName}
          character={character}
          onSelectCharacter={(name) => { setQuery(name); handleSearch(name) }}
        />
      )}
    </div>
  )
}

export default SearchPage
