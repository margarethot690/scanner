import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useLanguage } from './LanguageContext';

// Test component that exposes the context
function TestConsumer() {
  const { language, changeLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="translated">{t('appName')}</span>
      <span data-testid="missing">{t('nonexistent_key')}</span>
      <button onClick={() => changeLanguage('es')}>Switch to ES</button>
      <button onClick={() => changeLanguage('en')}>Switch to EN</button>
    </div>
  );
}

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to English', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
  });

  it('translates known keys', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId('translated')).toHaveTextContent('DecentralChain');
  });

  it('returns key as fallback for missing translations', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId('missing')).toHaveTextContent('nonexistent_key');
  });

  it('changes language to Spanish', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    await user.click(screen.getByText('Switch to ES'));
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
  });

  it('persists language choice in localStorage', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    await user.click(screen.getByText('Switch to ES'));
    expect(localStorage.getItem('language')).toBe('es');
  });

  it('reads language from localStorage on mount', () => {
    localStorage.setItem('language', 'es');
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
  });

  it('throws when useLanguage is used outside provider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useLanguage must be used within a LanguageProvider');
    consoleSpy.mockRestore();
  });
});
