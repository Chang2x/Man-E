import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { authenticateUser, resetPassword } from '../lib/api';
import LoginScreen from '../app/index';

// Mock the router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

// Mock the API functions
jest.mock('../lib/api', () => ({
  authenticateUser: jest.fn(),
  resetPassword: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    expect(getByPlaceholderText('Username')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Forgot Password?')).toBeTruthy();
  });

  it('handles successful login', async () => {
    const mockUser = { _id: '123', role: 'student' };
    (authenticateUser as jest.Mock).mockResolvedValueOnce({ success: true, user: mockUser });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Username'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(authenticateUser).toHaveBeenCalledWith('testuser', 'password123', 'student');
      expect(router.push).toHaveBeenCalledWith('/student-dashboard?id=123');
    });
  });

  it('handles failed login', async () => {
    (authenticateUser as jest.Mock).mockResolvedValueOnce({ 
      success: false, 
      error: 'Invalid credentials' 
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Username'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Error')).toBeTruthy();
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('handles password reset', async () => {
    (resetPassword as jest.Mock).mockResolvedValueOnce({ success: true });

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    
    // Open forgot password modal
    fireEvent.press(getByText('Forgot Password?'));

    // Fill in reset password form
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Username'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('New Password'), 'newpassword123');
    fireEvent.changeText(getByPlaceholderText('Confirm New Password'), 'newpassword123');

    // Submit reset password form
    fireEvent.press(getByText('Reset Password'));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith(
        'test@example.com',
        'testuser',
        'newpassword123'
      );
    });
  });

  it('validates password reset form', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    
    // Open forgot password modal
    fireEvent.press(getByText('Forgot Password?'));

    // Try to submit without filling required fields
    fireEvent.press(getByText('Reset Password'));

    await waitFor(() => {
      expect(getByText('Please enter both email and username')).toBeTruthy();
    });

    // Try with mismatched passwords
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Username'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('New Password'), 'newpassword123');
    fireEvent.changeText(getByPlaceholderText('Confirm New Password'), 'differentpassword');

    fireEvent.press(getByText('Reset Password'));

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });
}); 