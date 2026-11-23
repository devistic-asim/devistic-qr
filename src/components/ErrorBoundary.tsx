import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="fatal" role="alert">
          This page hit a problem while drawing. Reload it to try again. Your saved codes are still in this browser.
        </p>
      );
    }
    return this.props.children;
  }
}
