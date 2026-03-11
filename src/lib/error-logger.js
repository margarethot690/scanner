/**
 * Error logger with Sentry integration.
 *
 * Set VITE_SENTRY_DSN in your .env to enable Sentry reporting.
 * Errors are always stored in an in-memory ring buffer for local debugging.
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env?.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env?.MODE || 'production',
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

const MAX_LOG_SIZE = 100;
const errorLog = [];

function logToService(error, context) {
  if (SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export function logError(error, context = {}) {
  const entry = {
    message: error?.message || String(error),
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Keep in-memory ring buffer for debugging
  errorLog.push(entry);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.shift();
  }

  console.error('[ErrorLogger]', entry.message, context);
  logToService(error, context);
}

export function getErrorLog() {
  return [...errorLog];
}

// Global unhandled error & rejection handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logError(event.error || event.message, { type: 'unhandled_error', filename: event.filename, lineno: event.lineno });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, { type: 'unhandled_rejection' });
  });

  // Expose logger for ErrorBoundary
  window.__ERROR_LOGGER__ = (error, errorInfo) => {
    logError(error, { type: 'react_error_boundary', componentStack: errorInfo?.componentStack });
  };
}
