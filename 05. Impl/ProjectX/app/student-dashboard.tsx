import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal, BackHandler, Alert, Animated, Dimensions, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Course, getCourses } from '../lib/api';
import { CameraView, BarcodeScanningResult, Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { API_CONFIG } from '../config';

SplashScreen.preventAutoHideAsync();

export default function StudentDashboard() {
  const params = useLocalSearchParams();
  const currentUserId = params.id as string;
  
  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogoutConfirm(true);
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    if (isScannerVisible) {
      startScanAnimation();
    }
  }, [isScannerVisible]);

  const fetchEnrolledCourses = async () => {
    try {
      setIsLoading(true);
      const allCourses = await getCourses();
      console.log('Current Student ID:', currentUserId);
      console.log('All Courses:', allCourses);
      
      const enrolledCourses = allCourses.filter((course: Course) => {
        console.log('Course Students:', course.students);
        return course.students && course.students.includes(currentUserId);
      });
      
      console.log('Enrolled Courses:', enrolledCourses);
      setCourses(enrolledCourses);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      setError('Failed to fetch courses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (err) {
      console.error('Error checking permissions:', err);
      Alert.alert('Error', 'Failed to access camera');
    }
  };

  const playBeep = async () => {
    try {
      // Using a simple beep sound from expo-av
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/buttons/sounds/beep-01a.mp3' }
      );
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    try {
      setScanned(true);
      await playBeep();

      // Send scan to backend
      const response = await fetch(`${API_CONFIG.baseURL}/attendance/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          qrData: data,
          studentId: currentUserId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to record attendance');
      }

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        setScannerVisible(false);
        setScanned(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error scanning QR code:', error);
      setErrorMessage(error.message === 'Network request failed' 
        ? 'Unable to connect to the server. Please check your internet connection.'
        : error.message || 'Failed to record attendance');
      setShowErrorModal(true);
      setScanned(false);
    }
  };

  const handleScanPress = () => {
    if (hasPermission === null) {
      Alert.alert('Error', 'Requesting camera permission...');
      return;
    }
    if (hasPermission === false) {
      Alert.alert('Error', 'No access to camera');
      return;
    }
    setScannerVisible(true);
  };

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const CourseCard = ({ course }: { course: Course }) => {
    return (
      <View style={styles.courseCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderContent}>
            <View style={styles.courseInfo}>
              <Text style={styles.courseCode}>{course.courseCode}</Text>
              <Text style={styles.courseTitle} numberOfLines={1}>{course.courseName}</Text>
            </View>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={handleScanPress}
            >
              <Ionicons name="scan-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.scheduleSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={18} color="#fff" />
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
          
          <View style={styles.instructorSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={18} color="#fff" />
              <Text style={styles.sectionTitle}>Instructor</Text>
                </View>
            <View style={styles.instructorInfo}>
              <Text style={styles.instructorName}>
                {course.lecturerId ? `${course.lecturerId.firstName} ${course.lecturerId.lastName}` : 'Not assigned'}
              </Text>
                </View>
          </View>
        </View>
      </View>
    );
  };

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
        <Text style={styles.welcomeText}>Student Dashboard</Text>
      </View>

      <ScrollView style={styles.content}>
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
            <Text style={styles.emptyStateText}>No enrolled courses found</Text>
          </View>
        ) : (
          courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))
        )}
      </ScrollView>

      {isScannerVisible && (
        <View style={styles.scannerOverlayContainer}>
          <View style={styles.scannerGradient}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity
                style={styles.closeScannerButton}
                onPress={() => {
                  setScannerVisible(false);
                  setScanned(false);
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scan QR Code</Text>
              <View style={styles.closeScannerButton} />
            </View>
            
            <View style={styles.scannerContent}>
              <View style={styles.scannerInfo}>
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle-outline" size={24} color="#fff" />
                  <Text style={styles.infoText}>
                    Position the QR code within the frame to mark your attendance
                  </Text>
                </View>
              </View>

              <View style={styles.scannerBox}>
                <CameraView
                  style={styles.camera}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />
                <View style={styles.scannerIndicator}>
                  <View style={[styles.scannerCorner, styles.topLeft]} />
                  <View style={[styles.scannerCorner, styles.topRight]} />
                  <View style={[styles.scannerCorner, styles.bottomLeft]} />
                  <View style={[styles.scannerCorner, styles.bottomRight]} />
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: scanLineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 280],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.scannerGuide}>
                <View style={styles.guideIcon}>
                  <Ionicons name="scan-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.scanText}>
                  Make sure the QR code is well lit and clearly visible
                </Text>
              </View>
            </View>

            <View style={styles.scannerFooter}>
              {scanned ? (
                <TouchableOpacity
                  style={styles.scanAgainButton}
                  onPress={() => setScanned(false)}
                >
                  <Ionicons name="refresh" size={20} color="#4A00E0" />
                  <Text style={styles.scanAgainText}>Scan Again</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.scannerHint}>
                  <Ionicons name="time-outline" size={20} color="#fff" />
                  <Text style={styles.hintText}>
                    QR codes expire after 1 hour. Make sure to scan during class time.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.successModal]}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successText}>Attendance marked successfully</Text>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.errorModal]}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={64} color="#D32F2F" />
            </View>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessageText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                style={[styles.confirmButton, styles.logoutConfirmButton]}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    opacity: 0.9,
    fontWeight: 'bold',
  },
  headerLogoutButton: {
    padding: 8,
    marginTop: 8,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#2E3192',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  courseCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardHeader: {
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    padding: 16,
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
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 24,
  },
  scanButton: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 8,
  },
  cardBody: {
    padding: 16,
  },
  scheduleSection: {
    gap: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 26,
  },
  scheduleItem: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduleDays: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  scheduleTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  instructorSection: {
    gap: 12,
  },
  instructorInfo: {
    marginLeft: 26,
  },
  instructorName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  scannerOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  scannerGradient: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'THEDISPLAYFONT',
  },
  closeScannerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scannerInfo: {
    width: '100%',
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  scannerBox: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').width * 0.8,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  scannerIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
    borderWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#fff',
    opacity: 0.8,
  },
  topLeft: {
    top: 20,
    left: 20,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 20,
    right: 20,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 20,
    right: 20,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scannerGuide: {
    alignItems: 'center',
    marginTop: 30,
  },
  guideIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  scannerFooter: {
    padding: 20,
    alignItems: 'center',
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  hintText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  successModal: {
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  errorModal: {
    alignItems: 'center',
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  errorMessageText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModal: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    backgroundColor: '#111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 16,
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
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelConfirmButton: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutConfirmButton: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 24,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 10,
  },
  statIconContainer: {
    backgroundColor: 'rgba(46, 49, 146, 0.1)',
  },
  statValue: {
    color: '#2E3192',
  },
  refreshButton: {
    backgroundColor: 'rgba(46, 49, 146, 0.1)',
  },
  className: {
    color: '#2E3192',
  },
  statusBadge: {
    backgroundColor: 'rgba(46, 49, 146, 0.1)',
  },
  statusText: {
    color: '#2E3192',
  },
  modalIconContainer: {
    backgroundColor: 'rgba(46, 49, 146, 0.1)',
  },
  modalTitle: {
    color: '#2E3192',
  },
  modalText: {
    color: '#2E3192',
  },
}); 