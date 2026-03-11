import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    renderWithRouter(
      <ProtectedRoute isAuthenticated={true} user={{ role: 'user' }}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects when not authenticated', () => {
    renderWithRouter(
      <ProtectedRoute isAuthenticated={false} user={null}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children for admin when requireAdmin is true', () => {
    renderWithRouter(
      <ProtectedRoute isAuthenticated={true} user={{ role: 'admin' }} requireAdmin={true}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('redirects non-admin when requireAdmin is true', () => {
    renderWithRouter(
      <ProtectedRoute isAuthenticated={true} user={{ role: 'user' }} requireAdmin={true}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});
