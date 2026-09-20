import { useEffect, useState } from 'react'
import logoIcon from '../assets/logo_ICON.png'
import moviesLogo from '../assets/moviesLOGO.png'
import { scrollToSection } from '../scrollToSection.js'
import './Typewriter.css'

const FINAL = 'Find any episode'
const ARROW_BARS = 4

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

function Typewriter() {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('typing')
  const [showCta, setShowCta] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('brand')
      setShowCta(true)
      return
    }

    const ac = new AbortController()
    const { signal } = ac
    let current = ''

    const type = async (chunk) => {
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i]
        current += ch
        setText(current)

        let delay = rand(38, 82)
        if (ch === ' ') delay = rand(80, 160)
        else if (i === 0) delay = rand(60, 120)
        else if (Math.random() < 0.14) delay = rand(120, 240)
        await wait(delay, signal)
      }
    }

    const backspace = async (count) => {
      await wait(rand(60, 140), signal)
      for (let i = 0; i < count; i++) {
        current = current.slice(0, -1)
        setText(current)
        const delay = i === 0 ? rand(50, 90) : i === 1 ? rand(36, 58) : rand(16, 34)
        await wait(delay, signal)
      }
    }

    ;(async () => {
      try {
        await type('Find any')
        await wait(rand(160, 280), signal)
        await type(' movie')
        await wait(rand(380, 520), signal)
        await backspace(5)
        await wait(rand(70, 140), signal)
        await type('show')
        await wait(500, signal)
        await backspace(4)
        await wait(rand(80, 150), signal)
        await type('episode')
        await wait(rand(420, 580), signal)
        await backspace(current.length)
        await wait(320, signal)
        setPhase('brand')
        await wait(1300, signal)
        setShowCta(true)
      } catch {
        // unmounted
      }
    })()

    return () => ac.abort()
  }, [])

  return (
    <div className="intro" aria-label="Movies.map">
      {phase === 'typing' && (
        <h1 className="typewriter section-title" aria-label={FINAL}>
          {text}
          <span className="typewriter__cursor" aria-hidden="true">
            |
          </span>
        </h1>
      )}

      {phase === 'brand' && (
        <div className="intro__lockup">
          <div className="intro__brand" role="img" aria-label="Movies.map">
            <img
              className="intro__icon"
              src={logoIcon}
              alt=""
              width={160}
              height={160}
              decoding="async"
            />
            <div className="intro__wordmark-clip">
              <div className="intro__wordmark-inner">
                <img
                  className="intro__wordmark"
                  src={moviesLogo}
                  alt=""
                  width={320}
                  height={32}
                  decoding="async"
                />
              </div>
            </div>
          </div>

          {showCta && (
            <div className="intro__cta">
              <button
                type="button"
                className="intro__start"
                onClick={() => scrollToSection('search')}
              >
                Get Started
              </button>
              <div className="intro__arrow" aria-hidden="true">
                {Array.from({ length: ARROW_BARS }, (_, i) => (
                  <span key={i} className="intro__arrow-bar" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Typewriter
