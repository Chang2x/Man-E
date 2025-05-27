import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, BackHandler, Animated } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

export default function AdminDashboard() {
  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [cardScale] = useState(new Animated.Value(1));

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogoutConfirm(true);
      return true;
    });

    return () => backHandler.remove();
  }, []);

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleLogout = () => {
    setShowSettingsMenu(false); // Close the settings menu
    setShowLogoutConfirm(true); // Show the confirmation modal
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false); // Hide the confirmation modal
    router.replace('/'); // Navigate to login page
  };

  const handleManageUsers = () => {
    router.push('/manage-users');
  };

  const handleManageCourses = () => {
    router.push('/manage-courses');
  };

  const handleViewReports = () => {
    router.push('/view-reports');
  };

  const handleViewSecurityLogs = () => {
    router.push('/security-logs');
    setShowSettingsMenu(false); // Close the settings menu
  };

  const handlePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.backgroundGradient, { backgroundColor: '#000000' }]} />

      {/* Settings Dropdown Portal */}
      {showSettingsMenu && (
        <View style={styles.dropdownOverlay}>
          <View style={[styles.settingsDropdown, { top: 100, right: 20 }]}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={24} color="#000000" />
              <Text style={styles.dropdownText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={24} color="#000000" />
              <Text style={styles.dropdownText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={handleViewSecurityLogs}
            >
              <Ionicons name="shield-outline" size={24} color="#000000" />
              <Text style={styles.dropdownText}>Security Logs</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.dropdownBackdrop}
            onPress={() => setShowSettingsMenu(false)}
            activeOpacity={1}
          />
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.appName}>CLASSTRACK</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.iconWrapper}
              onPress={() => setShowSettingsMenu(!showSettingsMenu)}
            >
              <Ionicons name="menu" size={28} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.welcomeText}>Admin Dashboard</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          <View style={{ width: '48%', marginBottom: 16 }}>
          <Animated.View style={{ transform: [{ scale: cardScale }] }}>
            <TouchableOpacity 
              style={styles.card}
              onPress={handleManageUsers}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>

                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>Manage Users</Text>
                    <Text style={styles.cardSubtitle}>User Management</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardAction}>View Details</Text>

                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          </View>

          <View style={{ width: '48%', marginBottom: 16 }}>
          <Animated.View style={{ transform: [{ scale: cardScale }] }}>
            <TouchableOpacity 
              style={styles.card}
              onPress={handleManageCourses}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>

                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>Manage Courses</Text>
                    <Text style={styles.cardSubtitle}>Course Management</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardAction}>View Details</Text>

                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          </View>

          <View style={{ width: '48%', marginBottom: 16 }}>
          <Animated.View style={{ transform: [{ scale: cardScale }] }}>
            <TouchableOpacity 
              style={styles.card}
              onPress={handleViewReports}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>

                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>View & Export Reports</Text>
                    <Text style={styles.cardSubtitle}>Reports Management</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardAction}>View Details</Text>

                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          </View>

        </View>
      </ScrollView>

      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={40} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
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
    backgroundColor: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 10,
  },
  content: {
    flex: 1,
  },
  cardContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  usersIconContainer: {
    backgroundColor: 'rgba(46, 49, 146, 0.1)',
  },
  coursesIconContainer: {
    backgroundColor: 'rgba(46, 49, 146, 0.1)',
  },
  reportsIconContainer: {
    backgroundColor: 'rgba(46, 49, 146, 0.1)',
  },

  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  cardContent: {
    marginBottom: 15,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(46, 49, 146, 0.1)',
    paddingTop: 15,
  },
  cardAction: {
    fontSize: 14,
    color: '#2E3192',
    fontWeight: '600',
  },
  logoutButtonContainer: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(46, 49, 146, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  settingsDropdown: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 4,
  },
  dropdownText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#000000',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    marginRight: 15,
  },
  logoutButton: {
    backgroundColor: '#000000',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButtonContainer: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
});