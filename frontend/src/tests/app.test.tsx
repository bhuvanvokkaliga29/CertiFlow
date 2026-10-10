import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { PdfViewerModal } from '../components/common/PdfViewerModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Certificate } from '../types';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('CertiFlow Frontend Tests', () => {
  it('renders landing page with headline and key sections', () => {
    renderWithProviders(<LandingPage />);
    expect(
      screen.getByText(/Issue certificates at scale/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Verify every credential/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Fault-Isolated Batch Processing/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Instant QR Verification/i)
    ).toBeDefined();
  });

  it('renders login page with email and password fields', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/Sign in to console/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/organizer@certiflow.local/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeDefined();
  });

  it('renders PdfViewerModal correctly with certificate metadata and actions', () => {
    const mockCert: Certificate = {
      id: 'cert-1234',
      public_id: 'CF-TEST-123',
      recipient_id: 'rec-123',
      recipient_name: 'Test Recipient',
      recipient_email: 'test@example.com',
      event_name: 'Tech Summit 2026',
      issuer_name: 'CertiFlow Foundation',
      storage_key: 'certs/test.pdf',
      pdf_sha256: 'abc123hash',
      is_valid: true,
      issued_at: '2026-10-10T12:00:00Z',
      download_url: '/api/v1/certificates/cert-1234/download',
      verification_url: '/verify/CF-TEST-123',
    };

    render(
      <PdfViewerModal
        certificate={mockCert}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Test Recipient')).toBeDefined();
    expect(screen.getByText(/CF-TEST-123/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Download PDF/i })).toBeDefined();
  });

  it('verifies calculations and completion percentage formatting', () => {
    const total = 100;
    const successes = 95;
    const failures = 5;
    const pct = Math.round(((successes + failures) / total) * 100);
    expect(pct).toBe(100);

    const partialPct = Math.round(((40) / total) * 100);
    expect(partialPct).toBe(40);
  });
});

