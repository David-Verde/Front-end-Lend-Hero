import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Title, Paragraph } from 'react-native-paper';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export default function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupsData();
  }, []);

  const fetchGroupsData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/sign-in');
        return;
      }

      const response = await axios.get(`${API_URL}/api/groups/mygroups`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setGroups(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching groups data:', error);
    } finally {
      setLoading(false);
    }
  };
  const createGroup = async (name, description, memberIds) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.post(`${API_URL}/api/groups`, {
        name,
        description,
        memberIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (response.data.success) {
        Alert.alert('Éxito', 'Grupo creado correctamente');
        fetchGroupsData();
      }
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'No se pudo crear el grupo');
    }
  };
  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => router.push(`/group-details/${item._id}`)}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{item.name}</Title>
          <Paragraph>{item.description}</Paragraph>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Grupos</Text>
      <FlatList
        data={groups}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  card: {
    marginBottom: 10,
  },
});