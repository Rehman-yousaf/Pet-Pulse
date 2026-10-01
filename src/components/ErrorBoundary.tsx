/**
 * Catches React errors (Firebase, network, Groq, Maps, etc.) and shows fallback UI instead of crashing.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('ErrorBoundary caught:', error.message, errorInfo.componentStack);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const msg = this.state.error.message || 'Something went wrong.';
      const isNetwork = /network|fetch|failed to load/i.test(msg);
      const isFirebase = /firebase|permission|unavailable/i.test(msg);
      const isAuth = /auth|unauthorized|sign in/i.test(msg);
      const friendly = isNetwork
        ? 'Network error. Check your connection and try again.'
        : isFirebase
        ? 'Service temporarily unavailable. Please try again.'
        : isAuth
        ? 'Please sign in again.'
        : 'Something went wrong. Please try again.';

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops</Text>
          <Text style={styles.message}>{friendly}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FB',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2D3436',
  },
  message: {
    fontSize: 16,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#FF8C42',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
