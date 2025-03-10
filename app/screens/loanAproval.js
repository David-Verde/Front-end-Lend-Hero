import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoanApprovalScreen = ({ route, navigation }) => {
  const { loanId } = route.params;
  const [loading, setLoading] = useState(false);

  const handleApproveReject = async (approve) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.put(
        `http://localhost:5000/api/loans/${loanId}/${approve ? 'approve' : 'reject'}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error updating loan status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text>¿Deseas aprobar o rechazar este préstamo?</Text>
      <Button
        title="Aprobar"
        onPress={() => handleApproveReject(true)}
        disabled={loading}
      />
      <Button
        title="Rechazar"
        onPress={() => handleApproveReject(false)}
        disabled={loading}
      />
    </View>
  );
};

export default LoanApprovalScreen;