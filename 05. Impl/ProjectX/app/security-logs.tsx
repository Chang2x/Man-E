import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface LoginLog {
  _id: string;
  userId?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  username: string;
  role: string;
  loginTime: string;
}

export default function SecurityLogs() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLoginLogs();
  }, []);

  const fetchLoginLogs = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError('Failed to load login logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

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
          <Text style={styles.title}>Security Logs</Text>
        </View>
        <Text style={styles.subtitle}>Login Activity</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.logsContainer}>
          {logs.map((log) => (
            <View key={log._id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {log.userId ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() || log.username : log.username}
                  </Text>
                  <Text style={styles.userRole}>{log.role}</Text>
                </View>
                <Text style={styles.timestamp}>{formatDate(log.loginTime)}</Text>
              </View>
              <View style={styles.logDetails}>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Username: </Text>
                  {log.username}
                </Text>
                {log.userId?.email && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Email: </Text>
                    {log.userId.email}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    marginLeft: 10,
    fontSize: 16,
  },
  logsContainer: {
    flex: 1,
    padding: 20,
  },
  logItem: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#999',
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: 14,
    color: '#999',
  },
  logDetails: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#fff',
  },
});
