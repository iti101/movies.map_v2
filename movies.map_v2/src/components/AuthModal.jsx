import { useEffect, useId, useRef, useState } from 'react'
import Button from './Button.jsx'
import { createAccount, login } from '../API/novi.js'
import visibilityIcon from '../assets/visibility_opsz24.svg'
import visibilityOffIcon from '../assets/visibility_off_opsz24.svg'
import './AuthModal.css'

/** Show/hide icon for the password field. */
function EyeIcon({ slashed }) {
  return (
    <img
      src={slashed ? visibilityOffIcon : visibilityIcon}
      alt=""
      aria-hidden="true"
    />
  )
}

/** Password input plus a visibility toggle (tabIndex -1 so tab skips the eye). */
function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password-wrap">
        <input
          id={id}
          className="auth-input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          className="auth-visibility"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <EyeIcon slashed={!visible} />
        </button>
      </div>
    </div>
  )
}

const INITIAL_FORM = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

/** Signup rule: 8+ chars, a digit, and a non-alphanumeric character. */
function isStrongPassword(password) {
  return password.length >= 8 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
}

/** Sign-in / create-account dialog. Escape or backdrop click closes it. */
function AuthModal({ open, onClose, onAuthenticated }) {
  const titleId = useId()
  const emailId = useId()
  const passwordId = useId()
  const usernameId = useId()
  const confirmId = useId()
  const firstFieldRef = useRef(null)

  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSignIn = mode === 'signin'

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => firstFieldRef.current?.focus(), 0)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, mode, onClose])

  useEffect(() => {
    if (!open) {
      setMode('signin')
      setForm(INITIAL_FORM)
      setError('')
      setSubmitting(false)
    }
  }, [open])

  function updateField(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
      if (error) setError('')
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setForm((current) => ({
      ...INITIAL_FORM,
      email: current.email,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const email = form.email.trim()
    const password = form.password
    const username = form.username.trim()

    if (!email || !password) {
      setError('Please fill in your email and password.')
      return
    }

    if (!isSignIn) {
      if (username.length < 2 || username.length > 40) {
        setError('Username must be between 2 and 40 characters.')
        return
      }
      if (!isStrongPassword(password)) {
        setError('Please choose a password that meets the requirements.')
        return
      }
      if (password !== form.confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setSubmitting(true)
    setError('')

    try {
      const session = isSignIn
        ? await login({ email, password })
        : await createAccount({ username, email, password })
      onAuthenticated(session)
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="auth-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        <h2 id={titleId} className="auth-title">
          {isSignIn ? 'Sign in' : 'Create account'}
        </h2>

        {!isSignIn && (
          <p className="auth-subtitle">
            Register with your email to save watchlists and write reviews.
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isSignIn && (
            <div className="auth-field">
              <label htmlFor={usernameId}>Username</label>
              <input
                ref={firstFieldRef}
                id={usernameId}
                className="auth-input"
                type="text"
                value={form.username}
                onChange={updateField('username')}
                placeholder="Choose a username"
                autoComplete="username"
                minLength={2}
                maxLength={40}
                disabled={submitting}
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor={emailId}>Email</label>
            <input
              ref={isSignIn ? firstFieldRef : undefined}
              id={emailId}
              className="auth-input"
              type="email"
              value={form.email}
              onChange={updateField('email')}
              placeholder={isSignIn ? undefined : 'you@example.com'}
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <PasswordField
            id={passwordId}
            label="Password"
            value={form.password}
            onChange={updateField('password')}
            placeholder={isSignIn ? undefined : 'Create a strong password'}
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            disabled={submitting}
          />

          {!isSignIn && (
            <>
              <ul className="auth-requirements">
                <li>At least 8 characters</li>
                <li>At least 1 number</li>
                <li>At least 1 special character</li>
              </ul>

              <PasswordField
                id={confirmId}
                label="Confirm password"
                value={form.confirmPassword}
                onChange={updateField('confirmPassword')}
                placeholder="Repeat your password"
                autoComplete="new-password"
                disabled={submitting}
              />
            </>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <Button
            className="auth-submit"
            type="submit"
            variant="solid"
            disabled={submitting}
          >
            {submitting
              ? isSignIn
                ? 'Signing in…'
                : 'Creating account…'
              : isSignIn
                ? 'Sign in'
                : 'Create account'}
          </Button>
        </form>

        <div className="auth-footer">
          {isSignIn ? (
            <p>
              Don&apos;t have an account?{' '}
              <button type="button" className="auth-link" onClick={() => switchMode('signup')}>
                Create an account
              </button>
            </p>
          ) : (
            <>
              <p>
                Already have an account?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </p>
              <button type="button" className="auth-link" onClick={onClose}>
                Back to home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
