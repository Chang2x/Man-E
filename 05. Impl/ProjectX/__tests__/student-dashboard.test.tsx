import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { getCourses } from '../lib/api';
import StudentDashboard from '../app/student-dashboard';

// Mock the router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: '123' }),
}));

// Mock the API functions
jest.mock('../lib/api', () => ({
  getCourses: jest.fn(),
}));

// Mock the Camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  },
  CameraView: 'CameraView',
}));

// Mock the Audio
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn(),
          unloadAsync: jest.fn(),
        },
      }),
    },
  },
}));

describe('StudentDashboard', () => {
  const mockCourses = [
    {
      _id: '1',
      courseCode: 'CS101',
      courseName: 'Introduction to Computer Science',
      students: ['123'],
      schedules: [
        {
          days: ['Monday', 'Wednesday'],
          startTime: '09:00',
          endTime: '10:30',
        },
      ],
      lecturerId: {
        firstName: 'John',
        lastName: 'Doe',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getCourses as jest.Mock).mockResolvedValue(mockCourses);
  });

  it('renders dashboard correctly', async () => {
    const { getByText, findByText } = render(<StudentDashboard />);
    
    expect(getByText('CLASSTRACK')).toBeTruthy();
    expect(getByText('Student Dashboard')).toBeTruthy();
    
    // Wait for courses to load
    const courseTitle = await findByText('Introduction to Computer Science');
    expect(courseTitle).toBeTruthy();
    expect(getByText('CS101')).toBeTruthy();
  });

  it('handles course loading error', async () => {
    (getCourses as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch courses'));

    const { findByText } = render(<StudentDashboard />);
    
    const errorMessage = await findByText('Failed to fetch courses. Please try again.');
    expect(errorMessage).toBeTruthy();
  });

  it('shows empty state when no courses are enrolled', async () => {
    (getCourses as jest.Mock).mockResolvedValueOnce([]);

    const { findByText } = render(<StudentDashboard />);
    
    const emptyStateMessage = await findByText('No enrolled courses found');
    expect(emptyStateMessage).toBeTruthy();
  });

  it('handles logout confirmation', async () => {
    const { getByText, findByText } = render(<StudentDashboard />);
    
    // Click logout button
    fireEvent.press(getByText('Logout'));
    
    // Check if confirmation modal appears
    const confirmText = await findByText('Are you sure you want to log out?');
    expect(confirmText).toBeTruthy();
    
    // Confirm logout
    fireEvent.press(getByText('Logout'));
    
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('handles QR code scanning', async () => {
    const { getByText, findByText } = render(<StudentDashboard />);
    
    // Wait for courses to load
    await findByText('Introduction to Computer Science');
    
    // Click scan button
    fireEvent.press(getByText('Scan QR Code'));
    
    // Check if scanner modal appears
    const scannerTitle = await findByText('Scan QR Code');
    expect(scannerTitle).toBeTruthy();
    
    // Mock successful scan
    const mockScanResult = { data: 'test-qr-data' };
    const mockResponse = { ok: true, json: () => Promise.resolve({ success: true }) };
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);
    
    // Simulate scan
    const cameraView = getByText('CameraView');
    fireEvent(cameraView, 'onBarcodeScanned', mockScanResult);
    
    // Check if success modal appears
    const successMessage = await findByText('Attendance marked successfully');
    expect(successMessage).toBeTruthy();
  });

  it('handles QR code scanning error', async () => {
    const { getByText, findByText } = render(<StudentDashboard />);
    
    // Wait for courses to load
    await findByText('Introduction to Computer Science');
    
    // Click scan button
    fireEvent.press(getByText('Scan QR Code'));
    
    // Mock failed scan
    const mockScanResult = { data: 'test-qr-data' };
    const mockResponse = { 
      ok: false, 
      json: () => Promise.resolve({ message: 'Invalid QR code' }) 
    };
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);
    
    // Simulate scan
    const cameraView = getByText('CameraView');
    fireEvent(cameraView, 'onBarcodeScanned', mockScanResult);
    
    // Check if error modal appears
    const errorMessage = await findByText('Invalid QR code');
    expect(errorMessage).toBeTruthy();
  });
}); 