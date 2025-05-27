import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Animated, Dimensions, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { User, Course, getUsers, updateCourse, getCourses } from '../lib/api';

const ITEMS_PER_PAGE = 50;
const WINDOW_HEIGHT = Dimensions.get('window').height;

export default function AssignStudents() {
  const params = useLocalSearchParams();
  const courseId = params.courseId as string;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('enrolled');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Memoize filtered students to prevent unnecessary recalculations
  const filteredStudents = useMemo(() => {
    return students.filter(student => 
      (student.lastName.toLowerCase() + ', ' + student.firstName.toLowerCase())
        .includes(searchQuery.toLowerCase()) ||
      student.idNumber.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [students, searchQuery]);

  // Memoize displayed students based on active tab
  const displayedStudents = useMemo(() => {
    return filteredStudents.filter(student => 
      activeTab === 'enrolled' 
        ? selectedStudents.includes(student._id)
        : !selectedStudents.includes(student._id)
    );
  }, [filteredStudents, selectedStudents, activeTab]);

  // Memoize paginated students
  const paginatedStudents = useMemo(() => {
    return displayedStudents.slice(0, page * ITEMS_PER_PAGE);
  }, [displayedStudents, page]);

  useEffect(() => {
    fetchStudents();
    fetchCourse();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchStudents = async () => {
    try {
      const users = await getUsers();
      const studentUsers = users.filter(user => user.role === 'student');
      setStudents(studentUsers);
      setHasMore(studentUsers.length > ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students. Please try again.');
    }
  };

  const fetchCourse = async () => {
    try {
      const courses = await getCourses();
      const course = courses.find((c: Course) => c._id === courseId);
      if (course) {
        setCurrentCourse(course);
        setSelectedStudents(course.students || []);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      setError('Failed to fetch course details.');
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
      setHasMore(displayedStudents.length > page * ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, displayedStudents.length, page]);

  const handleSaveAssignments = async () => {
    if (!currentCourse) return;

    try {
      setIsLoading(true);
      await updateCourse(currentCourse._id, {
        ...currentCourse,
        students: selectedStudents
      });
      setSuccessMessage('Students assigned successfully!');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error assigning students:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign students');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStudentItem = useCallback(({ item: student }: { item: User }) => (
    <View
      key={student._id}
      style={[
        styles.studentItem,
        activeTab === 'enrolled' && styles.selectedStudent
      ]}
    >
      <View style={styles.studentInfo}>
        <View style={styles.studentHeader}>
          <View style={styles.studentIdContainer}>
            <Ionicons name="id-card-outline" size={16} color="#4A00E0" />
          <Text style={styles.studentId}>{student.idNumber}</Text>
          </View>
          {activeTab === 'enrolled' && (
            <View style={styles.enrolledBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.enrolledText}>Enrolled</Text>
            </View>
          )}
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.studentName}>
          {student.lastName}, {student.firstName}
        </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.actionButton,
          activeTab === 'enrolled' ? styles.removeButton : styles.addButton
        ]}
        onPress={() => {
          if (activeTab === 'enrolled') {
            setSelectedStudents(prev => prev.filter(id => id !== student._id));
          } else {
            setSelectedStudents(prev => [...prev, student._id]);
          }
        }}
      >
        <View style={styles.actionButtonGradient}>
          <Ionicons 
            name={activeTab === 'enrolled' ? 'remove' : 'add'} 
            size={24} 
            color="#fff" 
          />
        </View>
      </TouchableOpacity>
    </View>
  ), [activeTab, selectedStudents]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'enrolled' ? 'people' : 'person-add'} 
        size={48} 
        color="#ccc" 
      />
      <Text style={styles.emptyStateText}>
        {activeTab === 'enrolled' 
          ? 'No students enrolled in this course yet'
          : 'No available students found'}
      </Text>
    </View>
  ), [activeTab]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#1a73e8" />
      </View>
    );
  }, [isLoadingMore]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Approximate height of each item
    offset: 80 * index,
    index,
  }), []);

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Enrollment</Text>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSaveAssignments}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {currentCourse && (
          <View style={styles.courseInfoCard}>
            <View style={styles.courseIconContainer}>
              <Ionicons name="book" size={32} color="#4A00E0" />
            </View>
            <View style={styles.courseDetails}>
            <Text style={styles.courseCode}>{currentCourse.courseCode}</Text>
              <Text style={styles.courseTitle}>{currentCourse.courseName}</Text>
          </View>
          </View>
        )}

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#2E3192" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#2E3192" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'enrolled' && styles.activeTab]}
            onPress={() => setActiveTab('enrolled')}
          >
            <Text style={[styles.tabText, activeTab === 'enrolled' && styles.activeTabText]}>
              Enrolled Students
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.activeTab]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
              Available Students
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={paginatedStudents}
          renderItem={renderStudentItem}
          keyExtractor={item => item._id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#111',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  courseInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  courseIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  courseDetails: {
    flex: 1,
  },
  courseCode: {
    fontSize: 16,
    color: '#999',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 20,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedStudent: {
    borderWidth: 1,
    borderColor: '#333',
  },
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  studentIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentId: {
    fontSize: 14,
    color: '#999',
    marginLeft: 5,
    fontWeight: '600',
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  enrolledText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginLeft: 15,
  },
  actionButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#000',
  },
  removeButton: {
    backgroundColor: '#333',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
}); 