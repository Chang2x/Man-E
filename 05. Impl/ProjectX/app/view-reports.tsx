import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface Report {
  _id: string;
  courseName: string;
  courseCode: string;
  generatedDate: string;
  dateRange: {
    start: string;
    end: string;
  };
  attendanceSummary: {
    totalSessions: number;
    studentStats: Array<{
      fullName: string;
      totalPresent: number;
      totalAbsent: number;
      totalLate: number;
      attendancePercentage: number;
    }>;
  };
  format: string;
}

export default function ViewReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [searchQuery, reports]);

  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/reports');
      const data = await response.json();
      setReports(data);
      setFilteredReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    const filtered = reports.filter(report => 
      report.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredReports(filtered);
  };

  const exportReport = async (report: Report) => {
    try {
      const reportData = {
        courseName: report.courseName,
        courseCode: report.courseCode,
        generatedDate: format(new Date(report.generatedDate), 'yyyy-MM-dd'),
        dateRange: {
          start: format(new Date(report.dateRange.start), 'yyyy-MM-dd'),
          end: format(new Date(report.dateRange.end), 'yyyy-MM-dd'),
        },
        attendanceSummary: report.attendanceSummary,
      };

      const fileUri = `${FileSystem.documentDirectory}report_${report._id}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(reportData, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const renderReportCard = (report: Report) => (
    <View key={report._id} style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View>
          <Text style={styles.courseName}>{report.courseName}</Text>
          <Text style={styles.courseCode}>{report.courseCode}</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => exportReport(report)}
        >
          <Ionicons name="download-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.reportDetails}>
        <Text style={styles.detailText}>
          Generated: {format(new Date(report.generatedDate), 'MMM dd, yyyy')}
        </Text>
        <Text style={styles.detailText}>
          Period: {format(new Date(report.dateRange.start), 'MMM dd')} - {format(new Date(report.dateRange.end), 'MMM dd, yyyy')}
        </Text>
        <Text style={styles.detailText}>
          Total Sessions: {report.attendanceSummary.totalSessions}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Student Statistics</Text>
        {report.attendanceSummary.studentStats.map((stat, index) => (
          <View key={index} style={styles.studentStat}>
            <Text style={styles.studentName}>{stat.fullName}</Text>
            <View style={styles.statRow}>
              <Text style={styles.statText}>Present: {stat.totalPresent}</Text>
              <Text style={styles.statText}>Absent: {stat.totalAbsent}</Text>
              <Text style={styles.statText}>Late: {stat.totalLate}</Text>
            </View>
            <Text style={styles.attendancePercentage}>
              Attendance: {stat.attendancePercentage.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Reports</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by course name or code..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        ) : filteredReports.length === 0 ? (
          <Text style={styles.noReports}>No reports found</Text>
        ) : (
          filteredReports.map(renderReportCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    margin: 20,
    paddingHorizontal: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
    color: '#fff',
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loader: {
    marginTop: 50,
  },
  noReports: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 50,
  },
  reportCard: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  courseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  courseCode: {
    fontSize: 16,
    color: '#999',
    marginTop: 4,
  },
  exportButton: {
    padding: 8,
  },
  reportDetails: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  statsContainer: {
    marginTop: 10,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  studentStat: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statText: {
    fontSize: 14,
    color: '#999',
  },
  attendancePercentage: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 5,
  },
});
