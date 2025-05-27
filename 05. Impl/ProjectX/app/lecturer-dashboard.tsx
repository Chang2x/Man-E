import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal, BackHandler, Alert, TextInput, RefreshControl, Platform, Vibration } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Course, getCourses } from '../lib/api';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { API_CONFIG } from '../config';
import { LinearGradient } from 'expo-linear-gradient';

// Function to get current Philippine time
const getPhilippineTime = () => {
  const now = new Date();
  // Get the current UTC time
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  // Convert to Philippine time (UTC+8)
  const phTime = new Date(utcTime + (8 * 60 * 60 * 1000));

  // Format the time to ensure accuracy
  const hours = phTime.getHours().toString().padStart(2, '0');
  const minutes = phTime.getMinutes().toString().padStart(2, '0');
  const seconds = phTime.getSeconds().toString().padStart(2, '0');

  // Create a new date with the exact Philippine time
  const exactPhTime = new Date(phTime.getFullYear(), phTime.getMonth(), phTime.getDate(),
    parseInt(hours), parseInt(minutes), parseInt(seconds));

  return exactPhTime;
};

// WebSocket connection setup
const setupWebSocket = (courseId: string, onNewScan: () => void) => {
  // Remove /api from the base URL for WebSocket connection
  const wsUrl = API_CONFIG.baseURL.replace('/api', '').replace('http', 'ws');
  console.log('Connecting to WebSocket:', `${wsUrl}/attendance/${courseId}`);
  
  const ws = new WebSocket(`${wsUrl}/attendance/${courseId}`);

  ws.onopen = () => {
    console.log('WebSocket connected successfully');
  };

  ws.onmessage = (event) => {
    try {
    const data = JSON.parse(event.data);
    if (data.type === 'new_scan') {
      onNewScan();
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    // Attempt to reconnect after 5 seconds
    setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      setupWebSocket(courseId, onNewScan);
    }, 5000);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
    // Attempt to reconnect after 5 seconds
    setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      setupWebSocket(courseId, onNewScan);
    }, 5000);
  };

  return ws;
};

SplashScreen.preventAutoHideAsync();

export default function LecturerDashboard() {
  const params = useLocalSearchParams();
  const currentUserId = params.id as string;

  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      fetchAssignedCourses();
    }
  }, [currentUserId]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogoutConfirm(true);
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

  const fetchAssignedCourses = async () => {
    try {
      setIsLoading(true);
      const allCourses = await getCourses();
      console.log('Current Lecturer ID:', currentUserId);
      console.log('All Courses:', allCourses);

      const assignedCourses = allCourses.filter((course: Course) => {
        console.log('Course Lecturer ID:', course.lecturerId?._id);
        return course.lecturerId?._id === currentUserId;
      });

      console.log('Assigned Courses:', assignedCourses);
      setCourses(assignedCourses);
      setError(null);
    } catch (error) {
      console.error('Error fetching assigned courses:', error);
      setError('Failed to fetch courses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    router.replace('/');
  };

  const handleRefresh = () => {
    fetchAssignedCourses();
  };

  const generateQRData = (course: Course) => {
    const phTime = getPhilippineTime();
    const expiryTime = new Date(phTime.getTime() + (60 * 60 * 1000)); // 1 hour from now

    return JSON.stringify({
      courseId: course._id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      generatedAt: phTime.toISOString(),
      expiresAt: expiryTime.toISOString()
    });
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>CLASSTRACK</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.headerLogoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.welcomeText}>Lecturer Dashboard</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={['#fff']}
            tintColor="#fff"
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#fff" style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : courses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color="#fff" />
            <Text style={styles.emptyStateText}>No assigned courses found</Text>
          </View>
        ) : (
          courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))
        )}
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <Text style={styles.confirmTitle}>Logout</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to log out?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmConfirmButton]}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.confirmConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CourseCard = ({ course }: { course: Course }) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [qrData, setQRData] = useState<{ data: string; expiresAt: string } | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [newScans, setNewScans] = useState(0);
  const qrRef = useRef<any>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval>>(null as unknown as ReturnType<typeof setInterval>);
  const wsRef = useRef<WebSocket | null>(null as WebSocket | null);
  const setupWebSocket = (courseId: string, onScan: () => void) => {
    const ws = new WebSocket(`${API_CONFIG.wsURL}/attendance/${courseId}`);
    ws.onmessage = () => onScan();
    return ws;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const lastCheckTime = useRef<Date>(new Date());

  // Setup WebSocket connection
  useEffect(() => {
    const handleNewScan = async () => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/attendance/course/${course._id}`);
        if (!response.ok) return;

        const records = await response.json();
        const now = new Date();
        const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

        // Count scans in the last 5 minutes
        const recentScans = records.reduce((count: number, record: any) => {
          const recordTime = new Date(record.generatedAt);
          const timeDiff = phTime.getTime() - recordTime.getTime();
          if (timeDiff <= 5 * 60 * 1000) { // 5 minutes
            return count + record.scannedBy.length;
          }
          return count;
        }, 0);

        setNewScans(recentScans);
      } catch (error) {
        console.error('Error checking new scans:', error);
      }
    };

    // Initialize WebSocket connection
    wsRef.current = setupWebSocket(course._id, handleNewScan);

    // Cleanup WebSocket connection
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [course._id]);

  // Check for existing valid QR code
  const checkExistingQRCode = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/attendance/course/${course._id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      const records = await response.json();

      // Find the most recent valid QR code
      const now = new Date();
      const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Current PH time
      const validRecord = records.find((record: any) => new Date(record.expiresAt) > phTime);

      if (validRecord) {
        setQRData({
          data: validRecord.qrCodeData,
          expiresAt: validRecord.expiresAt
        });
        setShowQRModal(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking existing QR code:', error);
      return false;
    }
  };

  useEffect(() => {
    if (qrData) {
      // Start countdown timer
      countdownInterval.current = setInterval(() => {
        const now = new Date();
        const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Current PH time
        const expiryTime = new Date(qrData.expiresAt);
        const diffInMinutes = Math.floor((expiryTime.getTime() - phTime.getTime()) / (1000 * 60));

        if (diffInMinutes <= 0) {
          setRemainingTime('expired');
          if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
          }
          setShowQRModal(false);
          setQRData(null);
        } else {
          setRemainingTime(`${diffInMinutes} minutes`);
        }
      }, 1000);
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, [qrData]);

  const generateQRData = async () => {
    try {
      setIsLoading(true);
      if (!course.lecturerId?._id) {
        throw new Error('Lecturer ID not found');
      }

      const response = await fetch(`${API_CONFIG.baseURL}/attendance/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course._id,
          lecturerId: course.lecturerId._id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      return {
        data: data.qrData,
        expiresAt: data.expiresAt
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    const hasValidQR = await checkExistingQRCode();
    if (!hasValidQR) {
    const newQRData = await generateQRData();
    if (newQRData) {
      setQRData(newQRData);
        setShowQRModal(true);
      }
    } else {
      setShowQRModal(true);
    }
  };

  // Check for new scans
  useEffect(() => {
    const checkNewScans = async () => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/attendance/course/${course._id}`);
        if (!response.ok) return;

        const records = await response.json();
        const now = new Date();
        const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

        // Get the most recent record
        const mostRecentRecord = records.sort((a: any, b: any) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
        )[0];

        if (mostRecentRecord) {
          const recordTime = new Date(mostRecentRecord.generatedAt);
          const timeDiff = phTime.getTime() - recordTime.getTime();

          // If the record is from the last 5 minutes
          if (timeDiff <= 5 * 60 * 1000) {
            const scanCount = mostRecentRecord.scannedBy.length;
            if (scanCount > newScans) {
              setNewScans(scanCount);
              // Vibrate or play sound to notify
              if (Platform.OS === 'android') {
                Vibration.vibrate(500);
              }
            }
          } else {
            setNewScans(0);
          }
        }

        lastCheckTime.current = now;
      } catch (error) {
        console.error('Error checking new scans:', error);
      }
    };

    // Check every 3 seconds
    const interval = setInterval(checkNewScans, 3000);
    return () => clearInterval(interval);
  }, [course._id]);

  // Reset new scans count when viewing attendance
  const handleGenerateReports = () => {
    if (!course.lecturerId) {
      console.error('Lecturer ID not found');
      return;
    }

    router.push({
      pathname: '/course-reports',
      params: {
        courseId: course._id,
        courseName: course.courseName,
        lecturerId: course.lecturerId._id
      }
    });
  };

  const handleViewAttendance = async () => {
    setNewScans(0);
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/attendance/course/${course._id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      const records = await response.json();

      // Sort records by generation time (most recent first)
      const sortedRecords = records.sort((a: any, b: any) =>
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );

      setAttendanceRecords(sortedRecords);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      Alert.alert('Error', 'Failed to fetch attendance records. Please try again.');
    }
  };

  const handleSaveQRCode = async () => {
    try {
      // Request permission to access media library
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant permission to save QR code to your gallery.');
        return;
      }

      if (qrRef.current) {
        const uri = await qrRef.current.capture();
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('CHEQR', asset, false);

        Alert.alert('Success', 'QR code saved to gallery successfully!');
      }
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code to gallery.');
    }
  };

  const filteredRecords = attendanceRecords.map(record => {
    const filteredScans = record.scannedBy.filter((scan: any) => {
      const fullName = `${scan.studentId.firstName} ${scan.studentId.lastName}`.toLowerCase();
      const idNumber = scan.studentId.idNumber.toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || idNumber.includes(query);
    });
    return { ...record, scannedBy: filteredScans };
  }).filter(record => record.scannedBy.length > 0);

  const handleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <View style={styles.courseCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderContent}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseCode}>{course.courseCode}</Text>
            <Text style={styles.courseTitle}>{course.courseName}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleGenerateQR}
            >
              <Ionicons name="qr-code-outline" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleViewAttendance}
            >
              <Ionicons name="list-outline" size={24} color="#fff" />
              {newScans > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>{newScans}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleGenerateReports}
            >
              <Ionicons name="document-text-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.scheduleSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color="#2E3192" />
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>
          <View style={styles.scheduleGrid}>
          {course.schedules.map((schedule, index) => (
              <View key={index} style={styles.scheduleItem}>
                <Text style={styles.scheduleDays}>{schedule.days.join(', ')}</Text>
                <Text style={styles.scheduleTime}>{schedule.startTime} - {schedule.endTime}</Text>
            </View>
          ))}
        </View>
      </View>
            </View>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Course QR Code</Text>
                <Text style={styles.courseSubtitle}>{course.courseName}</Text>
                {/* Course code and section */}
                <Text style={styles.qrDetailText}>Course Code: <Text style={{fontWeight:'bold'}}>{course.courseCode}</Text></Text>
                {/* Lecturer name */}
                {course.lecturerId && (
                  <Text style={styles.qrDetailText}>
                    Lecturer: <Text style={{fontWeight:'bold'}}>{course.lecturerId.firstName} {course.lecturerId.lastName}</Text>
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color="#2E3192" />
              </TouchableOpacity>
            </View>

            {/* QR Code and status */}
            <View style={{alignItems:'center', marginBottom:16}}>
            <ViewShot ref={qrRef} style={styles.qrContainer}>
              {qrData && (
                <QRCode
                  value={qrData.data}
                    size={250}
                    color="#2E3192"
                  backgroundColor="white"
                />
              )}
            </ViewShot>
              {/* Status indicator */}
              <View style={{flexDirection:'row', alignItems:'center', marginTop:8}}>
                <View style={{width:10, height:10, borderRadius:5, backgroundColor: remainingTime !== 'expired' ? '#4CAF50' : '#F44336', marginRight:6}} />
                <Text style={{color: remainingTime !== 'expired' ? '#4CAF50' : '#F44336', fontWeight:'bold'}}>
                  {remainingTime !== 'expired' ? 'Active' : 'Expired'}
            </Text>
              </View>
            </View>

            {/* QR Info: Generation, Expiry, Session ID */}
            <View style={styles.qrInfoContainer}>
              {qrData && (
                <View style={styles.qrInfoItem}>
                  <Text style={styles.qrStatusText}>Active</Text>
                  <Text style={styles.qrExpiryText}>
                    Expires in {remainingTime}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        visible={showAttendanceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttendanceModal(false)}
      >
        <View style={[styles.modalOverlay, isFullScreen && styles.fullScreenModal]}>
          <View style={[styles.modalContent, isFullScreen && styles.fullScreenContent]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Attendance Records</Text>
                <Text style={styles.courseSubtitle}>{course.courseName}</Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={handleFullScreen} style={styles.fullScreenButton}>
                  <Ionicons
                    name={isFullScreen ? "contract-outline" : "expand-outline"}
                    size={24}
                    color="#2E3192"
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAttendanceModal(false)}>
                  <Ionicons name="close" size={24} color="#2E3192" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              {searchQuery ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.sessionTabs}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.sessionTab, !selectedSession && styles.selectedSessionTab]}
                  onPress={() => setSelectedSession(null)}
                >
                  <Text style={[styles.sessionTabText, !selectedSession && styles.selectedSessionTabText]}>
                    All Sessions
                  </Text>
                </TouchableOpacity>
                {attendanceRecords.map((record, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.sessionTab, selectedSession === record._id && styles.selectedSessionTab]}
                    onPress={() => setSelectedSession(record._id)}
                  >
                    <Text style={[styles.sessionTabText, selectedSession === record._id && styles.selectedSessionTabText]}>
                      {new Date(record.generatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView style={styles.attendanceList}>
              {filteredRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.noAttendanceText}>
                    {searchQuery ? 'No matching students found' : 'No attendance records found'}
                  </Text>
                </View>
              ) : (
                filteredRecords
                  .filter(record => !selectedSession || record._id === selectedSession)
                  .map((record, index) => (
                    <View key={index} style={styles.attendanceSession}>
                      <View style={styles.sessionHeader}>
                        <View style={styles.sessionHeaderContent}>
                        <Text style={styles.sessionDate}>
                          {new Date(record.generatedAt).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                        <Text style={styles.sessionTime}>
                          {new Date(record.generatedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      </View>
                      <View style={styles.studentsList}>
                        {record.scannedBy.map((scan: any, scanIndex: number) => (
                          <View key={scanIndex} style={styles.studentItem}>
                            <View style={styles.studentInfo}>
                              <Text style={styles.studentName}>
                                {scan.studentId.firstName} {scan.studentId.lastName}
                              </Text>
                              <Text style={styles.studentId}>
                                ID: {scan.studentId.idNumber}
                              </Text>
                            </View>
                            <View style={styles.scanTimeContainer}>
                              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.checkmarkIcon} />
                              <Text style={styles.scanTime}>
                                {new Date(scan.scannedAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create<any>({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitleContainer: {
    alignItems: 'center',
    minWidth: 150,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'THEDISPLAYFONT',
    color: '#fff',
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 10,
    opacity: 0.9,
  },
  headerLogoutButton: {
    padding: 8,
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loader: {
    marginTop: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  confirmModal: {
    alignItems: 'center',
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  confirmText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  cancelConfirmButton: {
    backgroundColor: '#111',
  },
  confirmConfirmButton: {
    backgroundColor: '#fff',
  },
  cancelConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmConfirmText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  courseCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#111',
  },
  cardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  generateQRButton: {
    flex: 1,
  },
  viewAttendanceButton: {
    flex: 1,
  },
  reportsButton: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    textAlign: 'center',
  },
  cardBody: {
    backgroundColor: '#111',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 20,
  },
  scheduleSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 26,
  },
  scheduleItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: '48%',
  },
  scheduleDays: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#000',
  },
  modalTitleContainer: {
    flex: 1,
  },
  courseSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fullScreenButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 12,
    color: '#fff',
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#fff',
  },
  clearSearchButton: {
    padding: 8,
  },
  sessionTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sessionTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  selectedSessionTab: {
    backgroundColor: '#fff',
  },
  sessionTabText: {
    fontSize: 14,
    color: '#999',
  },
  selectedSessionTabText: {
    color: '#000',
    fontWeight: '600',
  },
  attendanceList: {
    flex: 1,
    padding: 16,
  },
  noAttendanceText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 24,
    textAlign: 'center',
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  studentId: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  scanTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  checkmarkIcon: {
    marginRight: 6,
  },
  scanTime: {
    fontSize: 14,
    color: '#999',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenContent: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  notificationText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  qrInfoContainer: {
    width: '100%',
    marginTop: 16,
  },
  qrInfoItem: {
    marginBottom: 12,
  },
  qrStatusText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
  qrExpiryText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  qrDetailText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  attendanceSession: {
    marginBottom: 24,
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionHeader: {
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#222',
  },
  sessionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sessionTime: {
    fontSize: 14,
    color: '#999',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  studentsList: {
    padding: 16,
  },
}); 