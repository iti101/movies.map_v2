import { useId, useState } from 'react'
import Button from './Button.jsx'
import Field from './Field.jsx'
import { fieldClass } from './field-class.js'
import Modal from './Modal.jsx'
import { createAccount, login } from '../API/novi.js'
import { useSession } from '../context/session-context.js'
import { useTask } from '../hooks/useTask.js'
import visibilityIcon from '../assets/visibility_opsz24.svg'
import visibilityOffIcon from '../assets/visibility_off_opsz24.svg'
import './AuthModal.css'

function EyeIcon({ slashed }) {
  return (
    <img
      src={slashed ? visibilityOffIcon : visibilityIcon}
      alt=""
      aria-hidden="true"
    />
  )
}

function PasswordField({ id, label, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <Field id={id} label={label}>
      <div className="auth-password-wrap">
        <input
          id={id}
          className={fieldClass('tall')}
          type={visible ? 'text' : 'password'}
          {...props}
        />
        <Button
          className="auth-visibility"
          variant="icon"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <EyeIcon slashed={!visible} />
        </Button>
      </div>
    </Field>
  )
}

const INITIAL_FORM = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function isStrongPassword(password) {
  return password.length >= 8 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
}

function AuthModal() {
  const titleId = useId()
  const emailId = useId()
  const passwordId = useId()
  const usernameId = useId()
  const confirmId = useId()
  const { authOpen: open, closeAuth, signIn } = useSession()

  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(INITIAL_FORM)
  const { status, error, setError, run, reset } = useTask()

  const isSignIn = mode === 'signin'
  const submitting = status === 'loading'
  const submitLabel = submitting
    ? isSignIn
      ? 'Signing in…'
      : 'Creating account…'
    : isSignIn
      ? 'Sign in'
      : 'Create account'

  function handleClose() {
    setMode('signin')
    setForm(INITIAL_FORM)
    reset()
    closeAuth()
  }

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

    const result = await run(() =>
      isSignIn ? login({ email, password }) : createAccount({ username, email, password }),
    )
    if (result.aborted || result.error) return
    signIn(result.value)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      labelledBy={titleId}
      dialogClass="auth-dialog"
    >
      <Button className="auth-close" variant="icon" aria-label="Close" onClick={handleClose}>
        ×
      </Button>

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
          <Field
            id={usernameId}
            label="Username"
            variant="tall"
            type="text"
            value={form.username}
            onChange={updateField('username')}
            placeholder="Choose a username"
            autoComplete="username"
            minLength={2}
            maxLength={40}
            disabled={submitting}
          />
        )}

        <Field
          id={emailId}
          label="Email"
          variant="tall"
          type="email"
          value={form.email}
          onChange={updateField('email')}
          placeholder={isSignIn ? undefined : 'you@example.com'}
          autoComplete="email"
          disabled={submitting}
        />

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
          <p className="ui-error" role="alert">
            {error}
          </p>
        )}

        <Button
          className="auth-submit"
          type="submit"
          variant="solid"
          disabled={submitting}
        >
          {submitLabel}
        </Button>
      </form>

      <div className="auth-footer">
        {isSignIn ? (
          <p>
            Don&apos;t have an account?{' '}
            <Button variant="link" className="auth-link" onClick={() => switchMode('signup')}>
              Create an account
            </Button>
          </p>
        ) : (
          <>
            <p>
              Already have an account?{' '}
              <Button variant="link" className="auth-link" onClick={() => switchMode('signin')}>
                Sign in
              </Button>
            </p>
            <Button variant="link" className="auth-link" onClick={handleClose}>
              Back to home
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}

export default AuthModal
