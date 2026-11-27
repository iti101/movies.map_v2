import { cn } from '../lib/format.js'
import ResultView from './randomizer/ResultView.jsx'
import SetupPanel from './randomizer/SetupPanel.jsx'
import { STEPS, useRandomizer } from './randomizer/useRandomizer.js'
import './Randomizer.css'

function Randomizer({ onSelect }) {
  const randomizer = useRandomizer()
  const { stepIndex, phase, hasResult, goToStep } = randomizer

  return (
    <div className={cn('randomizer', hasResult && 'randomizer--has-pick')}>
      <header className="randomizer__intro">
        <h2 className={cn('ui-display', hasResult ? 'ui-display--page' : 'ui-display--feature')}>
          Randomizer
        </h2>
        <p className="randomizer__lead">
          {hasResult
            ? 'Here’s a pick from your filters. Browse nearby titles or roll again.'
            : 'Answer a few quick prompts — then we’ll surprise you.'}
        </p>
      </header>

      <nav className="randomizer__steps" aria-label="Filter steps">
        {STEPS.map((entry, stepPosition) => {
          const done = stepPosition < stepIndex || phase === 'result'
          const current = phase === 'setup' && stepPosition === stepIndex
          return (
            <button
              key={entry.id}
              type="button"
              className={cn(
                'randomizer__step',
                current && 'randomizer__step--current',
                done && 'randomizer__step--done',
              )}
              onClick={() => goToStep(stepPosition)}
              aria-current={current ? 'step' : undefined}
            >
              <span className="randomizer__step-number" aria-hidden="true">
                {entry.number}
              </span>
              <span className="randomizer__step-label">{entry.label}</span>
            </button>
          )
        })}
      </nav>

      {phase === 'setup' ? (
        <SetupPanel randomizer={randomizer} />
      ) : (
        <ResultView randomizer={randomizer} onSelect={onSelect} />
      )}
    </div>
  )
}

export default Randomizer
