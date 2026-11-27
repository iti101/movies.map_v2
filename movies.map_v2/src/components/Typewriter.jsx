import { useEffect, useState } from 'react'
import logoIcon from '../assets/logo_ICON.png'
import moviesLogo from '../assets/moviesLOGO.png'
import { delay, isAbortError } from '../lib/async.js'
import { scrollToSection } from '../lib/scroll.js'
import { randomBetween } from '../lib/shuffle.js'
import Button from './Button.jsx'
import './Typewriter.css'

const FINAL = 'Find any episode'
const ARROW_BARS = 4

/**
 * Home intro: types “movie / show / episode”, then the logo, then Get Started.
 * Skips the typing show when the OS asks for reduced motion.
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Typewriter() {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState(() => (prefersReducedMotion() ? 'brand' : 'typing'))
  const [showCta, setShowCta] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (prefersReducedMotion()) return undefined

    const ac = new AbortController()
    const { signal } = ac
    let current = ''

    const type = async (chunk) => {
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i]
        current += ch
        setText(current)

        let ms = randomBetween(38, 82)
        if (ch === ' ') ms = randomBetween(80, 160)
        else if (i === 0) ms = randomBetween(60, 120)
        else if (Math.random() < 0.14) ms = randomBetween(120, 240)
        await delay(ms, signal)
      }
    }

    const backspace = async (count) => {
      await delay(randomBetween(60, 140), signal)
      for (let i = 0; i < count; i++) {
        current = current.slice(0, -1)
        setText(current)
        const ms = i === 0 ? randomBetween(50, 90) : i === 1 ? randomBetween(36, 58) : randomBetween(16, 34)
        await delay(ms, signal)
      }
    }

    ;(async () => {
      try {
        await type('Find any')
        await delay(randomBetween(160, 280), signal)
        await type(' movie')
        await delay(randomBetween(380, 520), signal)
        await backspace(5)
        await delay(randomBetween(70, 140), signal)
        await type('show')
        await delay(500, signal)
        await backspace(4)
        await delay(randomBetween(80, 150), signal)
        await type('episode')
        await delay(randomBetween(420, 580), signal)
        await backspace(current.length)
        await delay(320, signal)
        setPhase('brand')
        await delay(1300, signal)
        setShowCta(true)
      } catch (error) {
        if (isAbortError(error)) return
        setPhase('brand')
        setShowCta(true)
      }
    })()

    return () => ac.abort()
  }, [])

  return (
    <div className="intro" aria-label="Movies.map">
      {phase === 'typing' && (
        <h1 className="typewriter ui-display" aria-label={FINAL}>
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
              <Button
                variant="ghost"
                size="lg"
                className="intro__start"
                onClick={() => scrollToSection('search')}
              >
                Get Started
              </Button>
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
