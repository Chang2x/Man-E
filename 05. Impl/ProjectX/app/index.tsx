import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ActivityIndicator, Image, Dimensions, SafeAreaView, Animated } from 'react-native';
import { router } from 'expo-router';
import { authenticateUser, resetPassword } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [fontsLoaded] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  React.useEffect(() => {
    console.log('Font loading status:', fontsLoaded);
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [userData, setUserData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isNavigating = useRef(false);
  const [selectedRole, setSelectedRole] = useState('student');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;

  // Forgot password states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    Animated.spring(menuAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    toggleMenu();
  };

  const showNotification = (title: string, message: string, type: 'success' | 'error', data?: any) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setUserData(data);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (modalType === 'success' && userData) {
      switch (userData.role) {
        case 'admin':
          router.push('/admin-dashboard');
          break;
        case 'lecturer':
          router.push(`/lecturer-dashboard?id=${userData._id}`);
          break;
        case 'student':
          router.push(`/student-dashboard?id=${userData._id}`);
          break;
      }
    }
  };

  const handleLogin = async () => {
    if (isLoading || isNavigating.current) return;
    
    try {
      setIsLoading(true);
      const response = await authenticateUser(username, password, selectedRole);
      
      if (response.success) {
        setUserData(response.user);
        setModalTitle('Success');
        setModalMessage('Login successful!');
        setModalType('success');
        setShowModal(true);
        isNavigating.current = true;
      } else {
        setModalTitle('Error');
        setModalMessage(response.error || 'Invalid credentials');
        setModalType('error');
        setShowModal(true);
      }
    } catch (error) {
      setModalTitle('Error');
      setModalMessage('An error occurred during login');
      setModalType('error');
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!email || !username) {
      showNotification('Error', 'Please enter both email and username', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Error', 'Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showNotification('Error', 'Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setIsResettingPassword(true);
      await resetPassword(email, username, newPassword);
      showNotification('Success', 'Password reset successful!', 'success');
      setShowForgotPasswordModal(false);
      setEmail('');
      setUsername('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showNotification('Error', error instanceof Error ? error.message : 'Failed to reset password', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const menuTranslateY = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 0],
  });

  const menuOpacity = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.backgroundGradient, { backgroundColor: '#000000' }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.leftHeader}>
            <TouchableOpacity onPress={toggleMenu} style={styles.burgerButton}>
              <Ionicons name="menu" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.rightHeader}>
            <Text style={styles.appName}>CLASSTRACK</Text>
          </View>
        </View>

        <Animated.View 
          style={[
            styles.menuContainer,
            {
              transform: [{ translateY: menuTranslateY }],
              opacity: menuOpacity,
            },
          ]}
        >
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Select Role</Text>
            <TouchableOpacity 
              style={[styles.menuItem, selectedRole === 'student' && styles.selectedMenuItem]} 
              onPress={() => handleRoleSelect('student')}
            >
              <Ionicons name="person-outline" size={24} color="#fff" />
              <Text style={[styles.menuItemText, selectedRole === 'student' && styles.selectedMenuItemText]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, selectedRole === 'lecturer' && styles.selectedMenuItem]} 
              onPress={() => handleRoleSelect('lecturer')}
            >
              <Ionicons name="school-outline" size={24} color="#fff" />
              <Text style={[styles.menuItemText, selectedRole === 'lecturer' && styles.selectedMenuItemText]}>Lecturer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, selectedRole === 'admin' && styles.selectedMenuItem]} 
              onPress={() => handleRoleSelect('admin')}
            >
              <Ionicons name="shield-outline" size={24} color="#fff" />
              <Text style={[styles.menuItemText, selectedRole === 'admin' && styles.selectedMenuItemText]}>Admin</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.formCard}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.loginText}>Sign in as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#000000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#666666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#000000" style={styles.inputIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#666666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <View style={[styles.buttonGradient, { backgroundColor: '#000000' }]}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[
              styles.modalIconContainer,
              modalType === 'success' ? styles.successIcon : styles.errorIcon
            ]}>
              <Ionicons
                name={modalType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={40}
                color="#fff"
              />
            </View>
            <Text style={[
              styles.modalTitle,
              modalType === 'success' ? styles.successTitle : styles.errorTitle
            ]}>
              {modalTitle}
            </Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                modalType === 'success' ? styles.successButton : styles.errorButton
              ]}
              onPress={handleModalClose}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalMessage}>Enter your email, username, and new password</Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#000000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isResettingPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#000000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#666666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isResettingPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#000000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#666666"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                editable={!isResettingPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#000000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#666666"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!isResettingPassword}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowForgotPasswordModal(false);
                  setEmail('');
                  setUsername('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isResettingPassword}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleResetPassword}
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    marginTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    width: '100%',
    zIndex: 1,
  },
  leftHeader: {
    flex: 1,
  },
  rightHeader: {
    flex: 1,
    alignItems: 'flex-end',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  loginText: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#000000',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    color: '#000000',
    fontSize: 16,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    color: '#000000',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  successIcon: {
    backgroundColor: '#000000',
  },
  errorIcon: {
    backgroundColor: '#FF3D00',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000000',
  },
  successTitle: {
    color: '#000000',
  },
  errorTitle: {
    color: '#000000',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#000000',
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  successButton: {
    backgroundColor: '#000000',
  },
  errorButton: {
    backgroundColor: '#FF3D00',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#000000',
  },
  submitButton: {
    backgroundColor: '#000000',
    flex: 1,
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  burgerButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 1000,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#000000',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
  },
  selectedMenuItem: {
    backgroundColor: '#000000',
  },
  selectedMenuItemText: {
    color: '#FFFFFF',
  },
  menuItemText: {
    color: '#000000',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
}); 