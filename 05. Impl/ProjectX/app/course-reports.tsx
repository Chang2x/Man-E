import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_CONFIG } from '../config';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function CourseReports() {
  const params = useLocalSearchParams();
  const { courseId, courseName, lecturerId } = params;

  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    endDate: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateInput, setActiveDateInput] = useState<'start' | 'end'>('start');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [error, setError] = useState('');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      if (activeDateInput === 'start' && selectedDate > dateRange.endDate) {
        setError('Start date cannot be after end date');
        return;
      }
      if (activeDateInput === 'end' && selectedDate < dateRange.startDate) {
        setError('End date cannot be before start date');
        return;
      }

      setDateRange(prev => ({
        ...prev,
        [activeDateInput === 'start' ? 'startDate' : 'endDate']: selectedDate
      }));
      setError('');
    }

    // For iOS, we need to handle the cancel case
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const showDatepicker = (type: 'start' | 'end') => {
    setActiveDateInput(type);
    setShowDatePicker(true);
  };

  const validateDateRange = () => {
    const now = new Date();
    const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));

    if (dateRange.startDate < oneYearAgo) {
      setError('Start date cannot be more than 1 year ago');
      return false;
    }

    if (dateRange.endDate > new Date()) {
      setError('End date cannot be in the future');
      return false;
    }

    if (dateRange.startDate > dateRange.endDate) {
      setError('Start date cannot be after end date');
      return false;
    }

    return true;
  };

  const generateReport = async () => {
    if (!validateDateRange()) {
      return;
    }
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_CONFIG.baseURL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          lecturerId,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          format
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      
      // Handle the report based on format
      if (format === 'pdf') {
        // Open PDF viewer or download
        router.push({
          pathname: '/report-viewer',
          params: {
            reportId: data.reportId
          }
        });
      } else {
        // Handle CSV download
        // Implementation depends on your file handling approach
      }
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error('Generate report error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGradient} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Course Reports</Text>
        </View>
        <Text style={styles.subtitle}>{courseName}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          
          <View style={styles.dateContainer}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatepicker('start')}
            >
              <Ionicons name="calendar-outline" size={24} color="#2E3192" />
              <Text style={styles.dateText}>
                {dateRange.startDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <Text style={styles.dateSeperator}>to</Text>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatepicker('end')}
            >
              <Ionicons name="calendar-outline" size={24} color="#2E3192" />
              <Text style={styles.dateText}>
                {dateRange.endDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Format</Text>
          <View style={styles.formatContainer}>
            <TouchableOpacity
              style={[
                styles.formatButton,
                format === 'pdf' && styles.formatButtonActive
              ]}
              onPress={() => setFormat('pdf')}
            >
              <Ionicons 
                name="document-text-outline" 
                size={24} 
                color={format === 'pdf' ? '#fff' : '#2E3192'} 
              />
              <Text style={[
                styles.formatText,
                format === 'pdf' && styles.formatTextActive
              ]}>PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.formatButton,
                format === 'csv' && styles.formatButtonActive
              ]}
              onPress={() => setFormat('csv')}
            >
              <Ionicons 
                name="grid-outline" 
                size={24} 
                color={format === 'csv' ? '#fff' : '#2E3192'} 
              />
              <Text style={[
                styles.formatText,
                format === 'csv' && styles.formatTextActive
              ]}>CSV</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateReport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={24} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={activeDateInput === 'start' ? dateRange.startDate : dateRange.endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
          style={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
  },
  dateSeperator: {
    marginHorizontal: 12,
    color: '#fff',
    fontSize: 16,
  },
  formatContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  formatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formatButtonActive: {
    backgroundColor: '#333',
    borderColor: '#fff',
  },
  formatText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  formatTextActive: {
    color: '#fff',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    color: '#ff4444',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  iosDatePicker: {
    width: '100%',
    height: 200,
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});
