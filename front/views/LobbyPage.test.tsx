import { render, screen, fireEvent } from '@testing-library/react';
import { LobbyPage } from './LobbyPage';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth.store';

// Mock the hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../store/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../services/billing.service', () => ({
  billingApi: {
    getWallet: jest.fn().mockResolvedValue({ balance: 100 })
  }
}));

describe('Student Dashboard - LobbyPage', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        role: 'STUDENT',
        userId: '1',
        displayName: 'John Doe',
        token: 'fake-token',
        clearAuth: jest.fn()
      };
      return selector(state);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders student greeting', () => {
    render(<LobbyPage />);
    expect(screen.getByText(/Good/i)).toBeInTheDocument();
    expect(screen.getByText(/John/i)).toBeInTheDocument();
  });

  it('navigates to room on join', () => {
    render(<LobbyPage />);
    const joinInput = screen.getByPlaceholderText('abc-def-ghi');
    fireEvent.change(joinInput, { target: { value: 'test-room' } });
    
    const joinButton = screen.getByRole('button', { name: /Join/i });
    fireEvent.click(joinButton);
    
    expect(mockPush).toHaveBeenCalledWith('/room/test-room');
  });
  
  it('navigates to catalog', () => {
    render(<LobbyPage />);
    const catalogBtn = screen.getByRole('button', { name: /Explore Catalog/i });
    fireEvent.click(catalogBtn);
    expect(mockPush).toHaveBeenCalledWith('/sessions');
  });
});
