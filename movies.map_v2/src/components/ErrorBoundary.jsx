import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      this.props.fallback ?? (
        <p className="app-error" role="alert">
          Something went wrong. Reload the page and try again.
        </p>
      )
    )
  }
}
