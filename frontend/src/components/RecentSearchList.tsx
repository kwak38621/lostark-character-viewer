interface Props {
  searches: string[]
  onSelect: (name: string) => void
  onDelete: (name: string) => void
}

function RecentSearchList({ searches, onSelect, onDelete }: Props) {
  if (searches.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#3d4a6b' }}>
        최근 검색
      </p>
      <div className="flex flex-wrap gap-2">
        {searches.map((name, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1 rounded-full text-sm"
            style={{ backgroundColor: '#161929', border: '1px solid #252a3d' }}
          >
            <button
              className="pl-3 pr-1 py-1 transition-opacity hover:opacity-80"
              style={{ color: '#8892a4' }}
              onClick={() => onSelect(name)}
            >
              {name}
            </button>
            <button
              className="pr-2 py-1 transition-colors hover:text-red-400"
              style={{ color: '#3d4a6b', fontSize: '12px', lineHeight: 1 }}
              onClick={(e) => { e.stopPropagation(); onDelete(name) }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentSearchList
