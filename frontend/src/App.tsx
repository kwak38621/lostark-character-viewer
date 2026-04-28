import SearchPage from '@/pages/SearchPage'

function App() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d0f1a', color: '#e2e8f0' }}>
      <header style={{ backgroundColor: '#11142a', borderBottom: '1px solid #1e2340' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #4f7bff, #7c3aed)', color: '#fff' }}
          >
            LA
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: '#c9d1e8' }}>
            로아 정보 검색 사이트
          </span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <SearchPage />
      </main>
    </div>
  )
}

export default App
