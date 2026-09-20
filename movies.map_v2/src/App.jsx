import './App.css'
import SearchSection from './SearchSection.jsx'

function App() {
  return (
    <main className="snap-container">
      <section className="snap-section snap-section-1">
        Hero page
      </section>
      <section className="snap-section snap-section-2">
        <SearchSection />
      </section>
      <section className="snap-section snap-section-3">
        Random page
      </section>
    </main>
  )
}

export default App
