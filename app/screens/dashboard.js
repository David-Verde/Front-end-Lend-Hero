import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Text, Button, Divider, useTheme } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';
import Constants from 'expo-constants';
import { formatCurrency } from '../utils/formatters';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:5000';

const DashboardScreen = ({ user }) => {
  const [summary, setSummary] = useState({
    loansGiven: [],
    loansReceived: [],
    totalLent: 0,
    totalBorrowed: 0,
    pendingPayments: 0,
    upcomingPayments: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Fetch loans data
      const response = await axios.get(`${API_URL}/api/loans/myloans`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const { loansGiven, loansReceived } = response.data.data;
        
        // Calculate totals
        const totalLent = loansGiven.reduce((acc, loan) => {
          if (loan.status === 'APPROVED' || loan.status === 'ACTIVE' || loan.status === 'LATE') {
            return acc + loan.amount;
          }
          return acc;
        }, 0);
        
        const totalBorrowed = loansReceived.reduce((acc, loan) => {
          if (loan.status === 'APPROVED' || loan.status === 'ACTIVE' || loan.status === 'LATE') {
            return acc + loan.amount;
          }
          return acc;
        }, 0);
        
        // Calculate pending payments
        const pendingPayments = loansReceived.reduce((acc, loan) => {
          if (loan.status === 'APPROVED' || loan.status === 'ACTIVE' || loan.status === 'LATE') {
            const totalPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
            return acc + (loan.amount - totalPaid);
          }
          return acc;
        }, 0);
        
        // Get upcoming payments (loans with due dates in the next 7 days)
        const now = new Date();
        const next7Days = new Date();
        next7Days.setDate(now.getDate() + 7);
        
        const upcomingPayments = loansReceived.filter(loan => {
          if (loan.status === 'APPROVED' || loan.status === 'ACTIVE') {
            const dueDate = new Date(loan.dueDate);
            return dueDate >= now && dueDate <= next7Days;
          }
          return false;
        });
        
        setSummary({
          loansGiven,
          loansReceived,
          totalLent,
          totalBorrowed,
          pendingPayments,
          upcomingPayments,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showMessage({
        message: 'Error',
        description: 'No se pudo cargar los datos del dashboard',
        type: 'danger',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Hola, {user?.name || 'Usuario'}</Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.summaryCards}>
        <Card style={[styles.summaryCard, { backgroundColor: theme.colors.primary }]}>
          <Card.Content>
            <Title style={styles.cardTitle}>Total prestado</Title>
            <Paragraph style={styles.cardAmount}>
              {formatCurrency(summary.totalLent)}
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, { backgroundColor: theme.colors.accent }]}>
          <Card.Content>
            <Title style={styles.cardTitle}>Total recibido</Title>
            <Paragraph style={styles.cardAmount}>
              {formatCurrency(summary.totalBorrowed)}
            </Paragraph>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.activityCard}>
        <Card.Content>
          <Title>Pagos pendientes</Title>
          <Paragraph style={styles.pendingAmount}>
            {formatCurrency(summary.pendingPayments)}
          </Paragraph>
        </Card.Content>
      </Card>

      {summary.upcomingPayments.length > 0 && (
        <Card style={styles.activityCard}>
          <Card.Content>
            <Title>Próximos pagos</Title>
            {summary.upcomingPayments.map((loan, index) => (
              <View key={loan._id || index}>
                <View style={styles.paymentItem}>
                  <View>
                    <Text>{loan.description}</Text>
                    <Text style={styles.paymentDate}>
                      Vence: {new Date(loan.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(loan.amount)}
                  </Text>
                </View>
                {index < summary.upcomingPayments.length - 1 && <Divider />}
              </View>
            ))}
          </Card.Content>
          <Card.Actions>
            <Button>Ver todos</Button>
          </Card.Actions>
        </Card>
      )}

      <View style={styles.recentActivity}>
        <Title>Actividad reciente</Title>
        
        {summary.loansReceived.length === 0 && summary.loansGiven.length === 0 ? (
          <Text style={styles.noActivityText}>No hay actividad reciente</Text>
        ) : (
          <>
            {summary.loansReceived.slice(0, 3).map((loan, index) => (
              <Card key={`received-${loan._id || index}`} style={styles.loanCard}>
                <Card.Content>
                  <View style={styles.loanHeader}>
                    <Title>Préstamo recibido</Title>
                    <Text style={styles.statusBadge(loan.status)}>
                      {loan.status === 'PENDING' ? 'Pendiente' : 
                       loan.status === 'APPROVED' ? 'Aprobado' : 
                       loan.status === 'ACTIVE' ? 'Activo' : 
                       loan.status === 'COMPLETED' ? 'Completado' : 
                       loan.status === 'REJECTED' ? 'Rechazado' : 
                       loan.status === 'LATE' ? 'Atrasado' : loan.status}
                    </Text>
                  </View>
                  <Paragraph>{loan.description}</Paragraph>
                  <View style={styles.loanDetails}>
                    <Text>Monto: {formatCurrency(loan.amount)}</Text>
                    <Text>Fecha límite: {new Date(loan.dueDate).toLocaleDateString()}</Text>
                  </View>
                </Card.Content>
              </Card>
            ))}

            {summary.loansGiven.slice(0, 3).map((loan, index) => (
              <Card key={`given-${loan._id || index}`} style={styles.loanCard}>
                <Card.Content>
                  <View style={styles.loanHeader}>
                    <Title>Préstamo otorgado</Title>
                    <Text style={styles.statusBadge(loan.status)}>
                      {loan.status === 'PENDING' ? 'Pendiente' : 
                       loan.status === 'APPROVED' ? 'Aprobado' : 
                       loan.status === 'ACTIVE' ? 'Activo' : 
                       loan.status === 'COMPLETED' ? 'Completado' : 
                       loan.status === 'REJECTED' ? 'Rechazado' : 
                       loan.status === 'LATE' ? 'Atrasado' : loan.status}
                    </Text>
                  </View>
                  <Paragraph>{loan.description}</Paragraph>
                  <View style={styles.loanDetails}>
                    <Text>Monto: {formatCurrency(loan.amount)}</Text>
                    <Text>Fecha límite: {new Date(loan.dueDate).toLocaleDateString()}</Text>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom:.16,
  },
  summaryCard: {
    width: '48%',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
  },
  cardAmount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  activityCard: {
    marginBottom: 16,
  },
  pendingAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentDate: {
    fontSize: 12,
    color: '#666',
  },
  paymentAmount: {
    fontWeight: 'bold',
  },
  recentActivity: {
    marginBottom: 16,
  },
  noActivityText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  loanCard: {
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: (status) => ({
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    backgroundColor: 
      status === 'PENDING' ? '#FFC107' : 
      status === 'APPROVED' ? '#4CAF50' : 
      status === 'ACTIVE' ? '#2196F3' : 
      status === 'COMPLETED' ? '#8BC34A' : 
      status === 'REJECTED' ? '#F44336' : 
      status === 'LATE' ? '#FF5722' : '#9E9E9E',
  }),
  loanDetails: {
    marginTop: 8,
  },
});

export default DashboardScreen;