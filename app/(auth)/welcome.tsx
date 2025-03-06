import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Title, Paragraph } from 'react-native-paper';
import { formatCurrency } from '../utils/formatters';
import userStore from '../store/userStore';
import groupStore from '../store/groupStore'
const {EXPO_PUBLIC_API_URL: API_URL} = process.env || 'http://localhost:5000';

export default function Welcome() {
  const [user, setUser] = useState(null);
  const {setUser: setUserStore } = userStore();
  const {setGroup: setGroupStore } = groupStore();
  const [summary, setSummary] = useState({
    totalLent: 0,
    totalBorrowed: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/sign-in');
        return;
      }
  
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.data.success) {
        setUser(response.data.data);
        setUserStore(response.data.data);
  
        // Obtener los detalles completos de los grupos
        if (response.data.data.groups && response.data.data.groups.length > 0) {
          const groupDetails = await Promise.all(
            response.data.data.groups.map(async (group) => {
              const groupResponse = await axios.get(`${API_URL}/api/groups/${group._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              return groupResponse.data.data;
            })
          );
  
          // Guardar los grupos en el groupStore como un array
          setGroupStore(groupDetails);
        } else {
          console.log('El usuario no pertenece a ningún grupo.');
        }
  
        fetchSummaryData(token);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      router.replace('/sign-in');
    } finally {
      setLoading(false);
    }
  };


  const fetchSummaryData = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/api/loans/myloans`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const { loansGiven, loansReceived } = response.data.data;

        const totalLent = loansGiven.reduce((acc, loan) => acc + loan.amount, 0);
        const totalBorrowed = loansReceived.reduce((acc, loan) => acc + loan.amount, 0);
        const pendingPayments = loansReceived.reduce((acc, loan) => {
          const totalPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
          return acc + (loan.amount - totalPaid);
        }, 0);

        setSummary({ totalLent, totalBorrowed, pendingPayments });
      }
    } catch (error) {
      console.error('Error fetching summary data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      router.replace('/sign-in');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>¡Bienvenido, {user?.name}!</Text>

      <View style={styles.summaryContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Total Prestado</Title>
            <Paragraph>{formatCurrency(summary.totalLent)}</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Total Recibido</Title>
            <Paragraph>{formatCurrency(summary.totalBorrowed)}</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Pagos Pendientes</Title>
            <Paragraph>{formatCurrency(summary.pendingPayments)}</Paragraph>
          </Card.Content>
        </Card>
      </View>

      <TouchableOpacity style={styles.button}  onPress={() => router.push('/screens/loans')}>
        <Text style={styles.buttonText}>Ver Préstamos</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/screens/groups')}>
        <Text style={styles.buttonText}>Ver Grupos</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/screens/dashboard')}>
  <Text style={styles.buttonText}>Ir al Dashboard</Text>
</TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  summaryContainer: {
    marginBottom: 20,
  },
  card: {
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});