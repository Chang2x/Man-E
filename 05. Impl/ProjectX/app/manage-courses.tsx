import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Image, ImageBackground, FlatList, Dimensions, Animated, PanResponder } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { User, getUsers, createCourse, Course, getCourses, deleteCourse, updateCourse } from '../lib/api';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

interface ScheduleEntry {
  days: string[];
  startTime: string;
  endTime: string;
}

export default function ManageCourses() {
  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    description: '',
    lecturerId: '',
    schedules: [] as ScheduleEntry[],
  });
  const [showLecturerModal, setShowLecturerModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState<ScheduleEntry>({
    days: [],
    startTime: '',
    endTime: '',
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourseId, setNewCourseId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerHeight] = useState(new Animated.Value(0));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreCourses, setHasMoreCourses] = useState(true);
  const ITEMS_PER_PAGE = 20;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) { // Only allow dragging down
        drawerHeight.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeDrawer();
      } else {
        Animated.spring(drawerHeight, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  useEffect(() => {
    fetchLecturers();
    fetchCourses();
  }, []);

  const fetchLecturers = async () => {
    try {
      setIsLoading(true);
      const users = await getUsers();
      const lecturerUsers = users.filter(user => user.role === 'lecturer');
      setLecturers(lecturerUsers);
    } catch (error) {
      console.error('Error fetching lecturers:', error);
      setError('Failed to fetch lecturers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async (pageNumber = 1, shouldAppend = false) => {
    try {
      if (pageNumber === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const coursesData = await getCourses();
      
      if (shouldAppend) {
        // Filter out any potential duplicates before appending
        setCourses(prevCourses => {
          const existingIds = new Set(prevCourses.map(course => course._id));
          const newCourses = coursesData.filter((course: Course) => !existingIds.has(course._id));
          return [...prevCourses, ...newCourses];
        });
      } else {
        // For fresh loads, just set the data directly
        setCourses(coursesData);
      }

      // Check if we have more courses to load
      setHasMoreCourses(coursesData.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch courses. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleBack = () => {
    router.push('/admin-dashboard');
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.spring(drawerHeight, {
      toValue: screenHeight * 0.9,
      useNativeDriver: false,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerHeight, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setIsDrawerOpen(false);
      setFormData({
        courseCode: '',
        courseName: '',
        description: '',
        lecturerId: '',
        schedules: [],
      });
      setSelectedCourse(null);
    });
  };

  const handleAddCourse = () => {
    setError(null);
    setFormData({
      courseCode: '',
      courseName: '',
      description: '',
      lecturerId: '',
      schedules: [],
    });
    openDrawer();
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      courseCode: course.courseCode,
      courseName: course.courseName,
      description: course.description,
      lecturerId: course.lecturerId?._id || '',
      schedules: course.schedules,
    });
    openDrawer();
  };

  const handleDeletePress = (course: Course) => {
    setCourseToDelete(course);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;

    try {
      setIsDeleting(true);
      await deleteCourse(courseToDelete._id);
      setSuccessMessage('Course deleted successfully!');
      await fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete course');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
    }
  };

  const handleSubmit = async () => {
    if (selectedCourse) {
      setShowEditConfirm(true);
    } else {
      await saveCourse();
    }
  };

  const handleConfirmEdit = async () => {
    setShowEditConfirm(false);
    await saveCourse();
  };

  const saveCourse = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Validate required fields
      if (!formData.courseCode || !formData.courseName || !formData.lecturerId || formData.schedules.length === 0) {
        setError('Course code, name, lecturer, and at least one schedule are required');
        return;
      }

      let updatedCourse;
      if (selectedCourse) {
        // Update existing course
        const lecturer = lecturers.find(l => l._id === formData.lecturerId);
        updatedCourse = await updateCourse(selectedCourse._id, {
          ...formData,
          lecturerId: lecturer ? { _id: lecturer._id, firstName: lecturer.firstName, lastName: lecturer.lastName } : undefined
        });
        setSuccessMessage('Course updated successfully!');
      } else {
        // Create new course
        updatedCourse = await createCourse(formData);
        setSuccessMessage('Course added successfully!');
      }

      // Refresh the course list
      await fetchCourses();

      // Set new course ID for highlighting
      setNewCourseId(updatedCourse._id);

      // Reset form and close modal
      setShowModal(false);
      setSelectedCourse(null);
      setFormData({
        courseCode: '',
        courseName: '',
        description: '',
        lecturerId: '',
        schedules: [],
      });

      // Scroll to the course after a short delay
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error saving course:', error);
      setError(error instanceof Error ? error.message : 'Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimeInput = (text: string) => {
    // Remove any non-numeric characters
    const numbers = text.replace(/[^0-9]/g, '');
    
    // Format as HH:MM
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
    }
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
  };

  const validateTime = (time: string) => {
    if (!time) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return false;
    if (hours < 0 || hours > 23) return false;
    if (minutes < 0 || minutes > 59) return false;
    
    return true;
  };

  const handleAddSchedule = () => {
    if (newSchedule.days.length === 0) {
      setError('Please select at least one day');
      return;
    }

    if (!validateTime(newSchedule.startTime) || !validateTime(newSchedule.endTime)) {
      setError('Please enter valid start and end times');
      return;
    }

    // Validate that end time is after start time
    const [startHours, startMinutes] = newSchedule.startTime.split(':').map(Number);
    const [endHours, endMinutes] = newSchedule.endTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    if (endTotalMinutes <= startTotalMinutes) {
      setError('End time must be after start time');
      return;
    }

    setFormData({
      ...formData,
      schedules: [...formData.schedules, newSchedule],
    });
    setNewSchedule({
      days: [],
      startTime: '',
      endTime: '',
    });
    setShowScheduleModal(false);
    setError(null);
  };

  const handleRemoveSchedule = (index: number) => {
    const updatedSchedules = [...formData.schedules];
    updatedSchedules.splice(index, 1);
    setFormData({
      ...formData,
      schedules: updatedSchedules,
    });
  };

  const handleAssignStudents = (course: Course) => {
    // Store the current page before navigation
    const currentPage = page;
    
    // Navigate to assign students
    router.push(`/assign-students?courseId=${course._id}`);
    
    // When returning, we'll refresh the list through the focus effect
  };

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Clear highlight after 2 seconds
  useEffect(() => {
    if (newCourseId) {
      const timer = setTimeout(() => {
        setNewCourseId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newCourseId]);

  const generateUniqueKey = (prefix: string, id: string, index?: number) => {
    return `${prefix}-${id}${index !== undefined ? `-${index}` : ''}`;
  };

  const renderCourseCard = ({ item: course, index }: { item: Course; index: number }) => (
    <View 
      key={generateUniqueKey('course', course._id, index)}
      style={[
        styles.courseCard,
        newCourseId === course._id && styles.highlightedCard
      ]}
    >
      <View style={[styles.cardHeader, { backgroundColor: '#111' }]}>
        <View style={styles.cardHeaderContent}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseCode}>{course.courseCode}</Text>
            <Text style={styles.courseTitle}>{course.courseName}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => handleEditCourse(course)}
              >
                <Ionicons name="create-outline" size={20} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => handleAssignStudents(course)}
              >
                <Ionicons name="people-outline" size={20} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => handleDeletePress(course)}
                disabled={isDeleting}
              >
                <Ionicons name="trash-outline" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.instructorSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={18} color="#fff" />
            <Text style={styles.sectionTitle}>Instructor</Text>
          </View>
            <Text style={styles.instructorText}>
              {course.lecturerId ? `${course.lecturerId.firstName} ${course.lecturerId.lastName}` : 'Not assigned'}
            </Text>
        </View>
        
        <View style={styles.scheduleSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color="#4A00E0" />
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>
          <View style={styles.scheduleGrid}>
          {course.schedules.map((schedule, scheduleIndex) => (
            <View 
              key={generateUniqueKey('schedule', course._id, scheduleIndex)} 
                style={styles.scheduleItem}
            >
                <Text style={styles.scheduleDays}>{schedule.days.join(', ')}</Text>
                <Text style={styles.scheduleTime}>{schedule.startTime} - {schedule.endTime}</Text>
            </View>
          ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyState}>
      <Ionicons name="book-outline" size={48} color="#ccc" />
      <Text style={styles.emptyStateText}>No courses found</Text>
    </View>
  );

  const renderListHeader = () => (
    <>
      {successMessage && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}
    </>
  );

  const renderDrawer = () => (
    <Animated.View
      style={[
        styles.drawerOverlay,
        styles.drawer,
        {
          height: drawerHeight,
        },
      ]}
    >
      <View style={styles.drawerHeader} {...panResponder.panHandlers}>
        <View style={styles.drawerHandle} />
        <View style={styles.drawerTitleContainer}>
          <Ionicons 
            name={selectedCourse ? "create" : "add-circle"} 
            size={24} 
            color="#4A00E0" 
          />
        <Text style={styles.drawerTitle}>
          {selectedCourse ? 'Edit Course' : 'Add New Course'}
        </Text>
        </View>
        <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#4A00E0" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.drawerContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
        <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <Text style={styles.formSectionTitle}>Course Details</Text>
          </View>

            <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Course Code</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={formData.courseCode}
                onChangeText={(text) => setFormData({ ...formData, courseCode: text })}
                    placeholder="e.g., CS101"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Course Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={formData.courseName}
                onChangeText={(text) => setFormData({ ...formData, courseName: text })}
                    placeholder="e.g., Introduction to Programming"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter course description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
                </View>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Instructor</Text>
          </View>

          <TouchableOpacity
              style={styles.lecturerSelector}
            onPress={() => setShowLecturerModal(true)}
          >
              <View style={styles.lecturerSelectorContent}>
                <View style={styles.lecturerInfo}>
                  <Text style={styles.lecturerSelectorText}>
                    {formData.lecturerId
                      ? lecturers.find(l => l._id === formData.lecturerId)?.firstName + ' ' + 
                        lecturers.find(l => l._id === formData.lecturerId)?.lastName
                      : 'Select instructor'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </View>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>

            <View style={styles.scheduleList}>
            {formData.schedules.map((schedule, index) => (
                <View key={index} style={styles.formScheduleItem}>
                  <View style={styles.formScheduleDays}>
                    {schedule.days.map((day, i) => (
                      <View key={i} style={styles.dayTag}>
                        <Text style={styles.formScheduleDays}>{day}</Text>
                </View>
                    ))}
                  </View>
                  <Text style={styles.formScheduleTime}>
                    {schedule.startTime} - {schedule.endTime}
                  </Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addScheduleButton}
              onPress={() => setShowScheduleModal(true)}
            >
              <Text style={styles.addScheduleText}>Add Schedule</Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.drawerActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.formCancelButton]}
            onPress={closeDrawer}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Course</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Add Lecturer Selection Modal
  const renderLecturerModal = () => (
    <Modal
      visible={showLecturerModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLecturerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Lecturer</Text>
            <TouchableOpacity onPress={() => setShowLecturerModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalList}>
            {lecturers.map((lecturer) => (
              <TouchableOpacity
                key={generateUniqueKey('lecturer', lecturer._id)}
                style={[
                  styles.modalItem,
                  formData.lecturerId === lecturer._id && styles.selectedItem
                ]}
                onPress={() => {
                  setFormData({ ...formData, lecturerId: lecturer._id });
                  setShowLecturerModal(false);
                }}
              >
                <View style={styles.lecturerInfo}>
                  <View style={styles.modalLecturerDetails}>
                    <Text style={styles.modalLecturerName}>
                      {lecturer.firstName} {lecturer.lastName}
                    </Text>
                    <Text style={styles.modalLecturerEmail}>{lecturer.email}</Text>
                  </View>
                </View>
                {formData.lecturerId === lecturer._id && (
                  <Ionicons name="checkmark-circle" size={24} color="#1a73e8" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Add Schedule Modal
  const renderScheduleModal = () => (
    <Modal
      visible={showScheduleModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowScheduleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Schedule</Text>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.scheduleForm}>
            <Text style={styles.inputLabel}>Days</Text>
            <View style={styles.daysContainer}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <TouchableOpacity
                  key={generateUniqueKey('day', day)}
                  style={[
                    styles.dayButton,
                    newSchedule.days.includes(day) && styles.selectedDay
                  ]}
                  onPress={() => {
                    const updatedDays = newSchedule.days.includes(day)
                      ? newSchedule.days.filter(d => d !== day)
                      : [...newSchedule.days, day];
                    setNewSchedule({ ...newSchedule, days: updatedDays });
                  }}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      newSchedule.days.includes(day) && styles.selectedDayText
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeContainer}>
              <View style={styles.timeInput}>
                <Text style={styles.inputLabel}>Start Time</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="time-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newSchedule.startTime}
                    onChangeText={(text) => {
                      const formattedTime = formatTimeInput(text);
                      setNewSchedule({ ...newSchedule, startTime: formattedTime });
                    }}
                    placeholder="HH:MM"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                {newSchedule.startTime && !validateTime(newSchedule.startTime) && (
                  <Text style={styles.errorText}>Invalid time format</Text>
                )}
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.inputLabel}>End Time</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="time-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newSchedule.endTime}
                    onChangeText={(text) => {
                      const formattedTime = formatTimeInput(text);
                      setNewSchedule({ ...newSchedule, endTime: formattedTime });
                    }}
                    placeholder="HH:MM"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                {newSchedule.endTime && !validateTime(newSchedule.endTime) && (
                  <Text style={styles.errorText}>Invalid time format</Text>
                )}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.formCancelButton]}
                onPress={() => setShowScheduleModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (!validateTime(newSchedule.startTime) || !validateTime(newSchedule.endTime)) && styles.disabledButton
                ]}
                onPress={handleAddSchedule}
                disabled={!validateTime(newSchedule.startTime) || !validateTime(newSchedule.endTime)}
              >
                <Text style={styles.saveButtonText}>Add Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Add this function to handle refresh
  const handleRefresh = async () => {
    setPage(1);
    setHasMoreCourses(true);
    await fetchCourses(1, false);
  };

  // Add this function to handle load more
  const handleLoadMore = async () => {
    if (!isLoadingMore && hasMoreCourses) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchCourses(nextPage, true);
    }
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGradient} />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, styles.headerTitleChe]}>CLASS</Text>
              <Text style={[styles.headerTitle, styles.headerTitleQr]}>TRACK</Text>
            </View>
            <TouchableOpacity onPress={handleAddCourse} style={styles.addButton}>
              <Ionicons name="add-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#4A00E0" style={styles.loader} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#D32F2F" style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={courses}
            renderItem={renderCourseCard}
            keyExtractor={(item, index) => generateUniqueKey('course', item._id, index)}
            contentContainerStyle={styles.courseList}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmptyList}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: 220,
              offset: 220 * index,
              index,
            })}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshing={isLoading && page === 1}
            onRefresh={handleRefresh}
            ListFooterComponent={() => (
              isLoadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#4A00E0" />
                  <Text style={styles.loadingMoreText}>Loading more courses...</Text>
                </View>
              ) : null
            )}
          />
        )}
      </View>

      {isDrawerOpen && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={closeDrawer}
          />
          {renderDrawer()}
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <View style={styles.confirmHeader}>
              <Ionicons name="warning" size={48} color="#dc3545" />
              <Text style={styles.confirmTitle}>Delete Course</Text>
            </View>
            
            <Text style={styles.confirmText}>
              Are you sure you want to delete{'\n'}
              <Text style={styles.confirmHighlight}>
                {courseToDelete?.courseName} ({courseToDelete?.courseCode})
              </Text>?
              {'\n'}This action cannot be undone.
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setCourseToDelete(null);
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Confirmation Modal */}
      <Modal
        visible={showEditConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <View style={styles.confirmHeader}>
              <Ionicons name="warning" size={48} color="#1a73e8" />
              <Text style={styles.confirmTitle}>Confirm Edit</Text>
            </View>
            
            <Text style={styles.confirmText}>
              Are you sure you want to update{'\n'}
              <Text style={styles.confirmHighlight}>
                {selectedCourse?.courseName} ({selectedCourse?.courseCode})
              </Text>?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => {
                  setShowEditConfirm(false);
                }}
                disabled={isSaving}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.saveConfirmButton]}
                onPress={handleConfirmEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveConfirmText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {renderLecturerModal()}
      {renderScheduleModal()}
    </View>
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
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    position: 'relative',
    paddingRight: 20,
  },
  headerRight: {
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerTitleChe: {
    marginRight: 2,
  },
  headerTitleQr: {
    color: '#ccc',
  },
  welcomeText: {
    fontSize: 18,
    color: '#000',
    marginTop: 10,
    textAlign: 'center',
  },
  backButton: {
    padding: 10,
    position: 'absolute',
    left: 0,
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
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  confirmModal: {
    alignItems: 'center',
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E3192',
    marginTop: 10,
  },
  confirmText: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#fff',
  },
  deleteConfirmButton: {
    backgroundColor: '#000',
  },
  cancelConfirmText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveConfirmButton: {
    backgroundColor: '#fff',
  },
  saveConfirmText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  courseCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
  },
  cardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseInfo: {
    flex: 1,
  },
  courseCode: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cardBody: {
    padding: 16,
  },
  scheduleSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
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
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
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
  highlightedCard: {
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ scale: 1.02 }],
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#fff',
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  drawerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 5,
  },
  drawerContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#000',
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  inputGroup: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  lecturerSelector: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    marginTop: 8,
  },
  lecturerSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  lecturerInfo: {
    alignItems: 'flex-start',
  },
  lecturerSelectorText: {
    fontSize: 16,
    color: '#fff',
  },
  scheduleList: {
    gap: 12,
  },
  formScheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  formScheduleDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formScheduleTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dayTag: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedDay: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  dayButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#000',
  },
  addScheduleButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: '#fff',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  addScheduleText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  drawerActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    justifyContent: 'space-between',
  },
  formCancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    gap: 8,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E3192',
  },
  courseSubtitle: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#fff',
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
    color: '#666',
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 8,
  },
  sessionTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
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
    backgroundColor: '#2E3192',
  },
  sessionTabText: {
    fontSize: 14,
    color: '#666',
  },
  selectedSessionTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  attendanceList: {
    flex: 1,
    padding: 16,
  },
  noAttendanceText: {
    fontSize: 16,
    color: '#666',
    marginTop: 24,
    textAlign: 'center',
  },
  attendanceSession: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2E3192',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sessionHeader: {
    padding: 16,
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
    color: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  studentsList: {
    padding: 16,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 8,
  },
  studentInfo: {
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#999',
  },
  scanTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  checkmarkIcon: {
    marginRight: 2,
  },
  scanTime: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  fullScreenModal: {
    backgroundColor: '#000',
  },
  fullScreenContent: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    borderRadius: 0,
    padding: 0,
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#111',
    borderRadius: 16,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E3192',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  qrInfoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  qrInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrInfoText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  qrDetailText: {
    fontSize: 14,
    color: '#999',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  courseList: {
    paddingBottom: 20,
  },
  addButton: {
    marginTop: 10,
    padding: 5,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalList: {
    maxHeight: 400,
    backgroundColor: '#000',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedModalItem: {
    backgroundColor: '#222',
  },
  modalLecturerDetails: {
    flex: 1,
  },
  modalLecturerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalLecturerEmail: {
    fontSize: 14,
    color: '#999',
  },
  selectedItem: {
    backgroundColor: '#222',
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },

  scheduleForm: {
    padding: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  timeInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 12,
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  instructorSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  instructorText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 26,
  },
  confirmHighlight: {
    fontWeight: 'bold',
    color: '#fff',
  },
}); 