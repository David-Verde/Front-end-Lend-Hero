import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { 
  Card, Title, Text, FAB, Modal, 
  Portal, Button, TextInput, RadioButton, Dialog 
} from 'react-native-paper';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { formatCurrency } from '../utils/formatters';
import userStore from '../store/userStore';
import groupStore from '../store/groupStore';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:5000';

const LoansScreen = ({ navigation, user }) => {
  const [loans, setLoans] = useState({ loansGiven: [], loansReceived: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [actionType, setActionType] = useState('');
  const { groups } = groupStore();
  const { user: userfruta } = userStore();

  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'received', title: 'Recibidos' },
    { key: 'given', title: 'Otorgados' },
  ]);

  const [newLoan, setNewLoan] = useState({
    lenderId: '',
    lenderName: '',
    amount: '',
    description: '',
    dueDate: new Date(),
    paymentType: 'LUMP_SUM',
    installmentsCount: '1',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUsersList, setShowUsersList] = useState(false);

  useEffect(() => {
    fetchLoansData();
    loadAvailableLenders();
  }, []);

  const fetchLoansData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/loans/myloans`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setLoans(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching loans data:', error);
      showMessage({
        message: 'Error',
        description: 'No se pudo cargar los préstamos',
        type: 'danger',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAvailableLenders = async () => {
    setLoadingUsers(true);
    try {
      if (!groups || !Array.isArray(groups) || groups.length === 0) {
        console.log('No hay grupos disponibles o groups no es un array.');
        return;
      }

      const members = groups.flatMap(group => 
        group.members
          .filter(member => member.user !== null)
          .map(member => member.user)
      );

      setUsersList(members);
    } catch (error) {
      console.error('Error loading users:', error);
      showMessage({
        message: 'Error',
        description: 'No se pudo cargar la lista de prestamistas',
        type: 'danger',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const selectUser = (user) => {
    setNewLoan({
      ...newLoan,
      lenderId: user._id,
      lenderName: user.name,
    });
    setSearchTerm(user.name);
    setShowUsersList(false);
  };

  const handleCreateLoan = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      if (!newLoan.lenderId || !newLoan.amount || !newLoan.description) {
        showMessage({
          message: 'Datos incompletos',
          description: 'Por favor completa todos los campos requeridos',
          type: 'warning',
        });
        return;
      }

      const loanData = {
        lenderId: newLoan.lenderId,
        amount: parseFloat(newLoan.amount),
        description: newLoan.description,
        dueDate: newLoan.dueDate.toISOString(),
        paymentType: newLoan.paymentType,
        installmentsCount: parseInt(newLoan.installmentsCount, 10)
      };

      const response = await axios.post(`${API_URL}/api/loans/request`, loanData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        showMessage({
          message: 'Éxito',
          description: 'Solicitud de préstamo enviada correctamente',
          type: 'success',
        });
        setModalVisible(false);
        resetLoanForm();
        fetchLoansData();
      }
    } catch (error) {
      console.error('Error creating loan:', error);
      showMessage({
        message: 'Error',
        description: 'No se pudo crear la solicitud de préstamo',
        type: 'danger',
      });
    }
  };

  const resetLoanForm = () => {
    setNewLoan({
      lenderId: '',
      lenderName: '',
      amount: '',
      description: '',
      dueDate: new Date(),
      paymentType: 'LUMP_SUM',
      installmentsCount: '1',
    });
    setSearchTerm('');
    setShowUsersList(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoansData();
  };

  const getLoanStatusText = (status) => {
    const statusMap = {
      'PENDING': 'Pendiente',
      'APPROVED': 'Aprobado',
      'REJECTED': 'Rechazado',
      'ACTIVE': 'Activo',
      'COMPLETED': 'Completado',
      'LATE': 'Atrasado'
    };
    return statusMap[status] || status;
  };

  const handleLoanPressed = (loan) => {
    console.log('Loan:', loan); // Depuración
    console.log('Userfruta:', userfruta); // Depuración
  
    if (!loan || !loan.borrower || !loan.lender || !userfruta) {
      console.error('Loan object or user is undefined or missing required properties');
      return;
    }
  
    setSelectedLoan(loan);
  
    // Verifica si el prestamista es el usuario actual
    const isLender = loan.lender === userfruta._id;
  
    // Verifica si el prestatario es el usuario actual
    const isBorrower = loan.borrower._id === userfruta._id;
  
    if (isBorrower && (loan.status === 'APPROVED' || loan.status === 'ACTIVE' || loan.status === 'LATE')) {
      setPaymentModalVisible(true);
    } else if (isLender && loan.status === 'PENDING') {
      setConfirmDialogVisible(true);
      setActionType('approval');
    }
  };
  const handlePayment = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token || !selectedLoan) return;
  
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        showMessage({
          message: 'Error',
          description: 'Por favor ingresa un monto válido',
          type: 'warning',
        });
        return;
      }
  
      const response = await axios.post(
        `${API_URL}/api/loans/${selectedLoan._id}/payment`,
        { amount: parseFloat(paymentAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      if (response.data.success) {
        showMessage({
          message: 'Éxito',
          description: 'Pago realizado correctamente',
          type: 'success',
        });
        setPaymentModalVisible(false);
        setPaymentAmount('');
        fetchLoansData();
      }
    } catch (error) {
      console.error('Error making payment:', error);
      showMessage({
        message: 'Error',
        description: 'No se pudo realizar el pago',
        type: 'danger',
      });
    }
  };

  const handleApproveReject = async (approve) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.put(
        `${API_URL}/api/loans/${selectedLoan._id}/${approve ? 'approve' : 'reject'}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showMessage({
          message: 'Éxito',
          description: `Préstamo ${approve ? 'aprobado' : 'rechazado'} correctamente`,
          type: 'success',
        });
        setConfirmDialogVisible(false);
        fetchLoansData();
      }
    } catch (error) {
      console.error('Error updating loan status:', error);
      showMessage({
        message: 'Error',
        description: `No se pudo ${approve ? 'aprobar' : 'rechazar'} el préstamo`,
        type: 'danger',
      });
    }
  };

  const renderItem = ({ item }) => {
    console.log('Rendering item:', item); // Depuración
    console.log('Userfruta:', userfruta); // Depuración
  
    if (!item || !item.borrower || !item.lender || !userfruta) {
      console.error('Item or userfruta is undefined or missing required properties');
      return null;
    }
  
    // Verificar si el usuario actual es el prestamista o el prestatario
    const isLender = item.lender._id === userfruta._id; // El usuario actual es el prestamista
    const isBorrower = item.borrower === userfruta._id; // El usuario actual es el prestatario
  
    // Obtener el nombre del prestamista
    const lenderName = isLender ? 'Usted es el prestamista' : userfruta.name;
  
    // Obtener el nombre del prestatario
    const borrowerName = isBorrower ? 'Usted es el prestatario' : item.borrower.name;
  
    return (
      <TouchableOpacity onPress={() => handleLoanPressed(item)}>
        <Card style={styles.loanCard}>
          <Card.Content>
            <View style={styles.loanHeader}>
              <Title>{item.description || 'Sin descripción'}</Title>
              <Text style={getLoanStatusStyle(item.status)}>
                {getLoanStatusText(item.status)}
              </Text>
            </View>
  
            <View style={styles.loanParties}>
              {/* Mostrar "Usted es el prestamista" o el nombre del prestamista */}
              <Text>Prestamista: {lenderName}</Text>
              {/* Mostrar "Prestatario: [nombre]" */}
              <Text>Prestatario: {borrowerName}</Text>
            </View>
  
            <View style={styles.loanDetails}>
              <Text style={styles.amountText}>Monto: {formatCurrency(item.amount)}</Text>
              <Text>Fecha límite: {new Date(item.dueDate).toLocaleDateString()}</Text>
  
              {(item.status === 'ACTIVE' || item.status === 'COMPLETED' || item.status === 'LATE') && (
                <View style={styles.paymentProgress}>
                  <Text>Pagado: {formatCurrency(item.payments.reduce((sum, p) => sum + p.amount, 0))}</Text>
                  <Text>Restante: {formatCurrency(item.amount - item.payments.reduce((sum, p) => sum + p.amount, 0))}</Text>
                </View>
              )}
            </View>
  
            {item.lender._id === userfruta._id && item.status === 'PENDING' && (
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={() => handleApproveReject(true)}
                  style={styles.approveButton}
                >
                  Aprobar
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleApproveReject(false)}
                  style={styles.rejectButton}
                >
                  Rechazar
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };
  const onChangeDatePicker = (event, selectedDate) => {
    const currentDate = selectedDate || newLoan.dueDate;
    setShowDatePicker(false);
    setNewLoan({ ...newLoan, dueDate: currentDate });
  };

  const getLoanStatusStyle = (status) => {
    let backgroundColor;
    switch (status) {
      case 'PENDING': backgroundColor = '#FFC107'; break;
      case 'APPROVED': backgroundColor = '#4CAF50'; break;
      case 'ACTIVE': backgroundColor = '#2196F3'; break;
      case 'COMPLETED': backgroundColor = '#8BC34A'; break;
      case 'REJECTED': backgroundColor = '#F44336'; break;
      case 'LATE': backgroundColor = '#FF5722'; break;
      default: backgroundColor = '#9E9E9E';
    }
    
    return {
      color: '#fff',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      fontSize: 12,
      backgroundColor
    };
  };

  const renderReceivedLoans = () => (
    <FlatList
      data={loans?.loansReceived || []}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.loansList}
      ListEmptyComponent={
        <View style={styles.emptyList}>
          <Text style={styles.emptyText}>
            {loading ? 'Cargando préstamos...' : 'No hay préstamos recibidos para mostrar'}
          </Text>
        </View>
      }
    />
  );

  const renderGivenLoans = () => (
    <FlatList
      data={loans?.loansGiven || []}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.loansList}
      ListEmptyComponent={
        <View style={styles.emptyList}>
          <Text style={styles.emptyText}>
            {loading ? 'Cargando préstamos...' : 'No hay préstamos otorgados para mostrar'}
          </Text>
        </View>
      }
    />
  );

  const renderScene = SceneMap({
    received: renderReceivedLoans,
    given: renderGivenLoans,
  });

  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: 'black' }}
      style={{ backgroundColor: 'black' }}
      labelStyle={{ color: 'black' }}
    />
  );

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index: tabIndex, routes }}
        renderScene={renderScene}
        onIndexChange={setTabIndex}
        renderTabBar={renderTabBar}
        initialLayout={{ width: 100 }}
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setModalVisible(true)}
        label="Solicitar préstamo"
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>Solicitar préstamo</Title>
          
          <TextInput
            label="Buscar prestamista"
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              setShowUsersList(text.length > 0);
            }}
            onFocus={() => setShowUsersList(true)}
            style={styles.input}
          />

          {showUsersList && (
            <FlatList
              data={usersList.filter(user => 
                user.name.toLowerCase().startsWith(searchTerm.toLowerCase())
              )}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => selectUser(item)}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
              style={styles.usersList}
            />
          )}

          <TextInput
            label="Monto"
            value={newLoan.amount}
            onChangeText={text => setNewLoan({ ...newLoan, amount: text })}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <TextInput
            label="Descripción"
            value={newLoan.description}
            onChangeText={text => setNewLoan({ ...newLoan, description: text })}
            style={styles.input}
          />

          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateSelectorLabel}>Fecha de vencimiento</Text>
            <Text>{newLoan.dueDate.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={newLoan.dueDate}
              mode="date"
              display="default"
              onChange={onChangeDatePicker}
              minimumDate={new Date()}
            />
          )}

          <View style={styles.paymentTypeContainer}>
            <Text style={styles.paymentTypeLabel}>Tipo de pago:</Text>
            <RadioButton.Group
              onValueChange={value => setNewLoan({ ...newLoan, paymentType: value })}
              value={newLoan.paymentType}
            >
              <View style={styles.radioOption}>
                <RadioButton value="LUMP_SUM" />
                <Text>Pago único</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="INSTALLMENTS" />
                <Text>Plazos</Text>
              </View>
            </RadioButton.Group>
          </View>

          {newLoan.paymentType === 'INSTALLMENTS' && (
            <TextInput
              label="Número de plazos"
              value={newLoan.installmentsCount}
              onChangeText={text => setNewLoan({ ...newLoan, installmentsCount: text })}
              keyboardType="numeric"
              style={styles.input}
            />
          )}

          <View style={styles.modalButtons}>
            <Button 
              mode="outlined" 
              onPress={() => setModalVisible(false)}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button 
              mode="contained" 
              onPress={handleCreateLoan}
              style={styles.submitButton}
            >
              Solicitar
            </Button>
          </View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={paymentModalVisible}
          onDismiss={() => {
            setPaymentModalVisible(false);
            setSelectedLoan(null);
            setPaymentAmount('');
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>Realizar pago</Title>
          
          {selectedLoan && (
            <>
              <Text style={styles.paymentLoanInfo}>
                Préstamo: {selectedLoan.description}
              </Text>
              <Text style={styles.paymentAmountInfo}>
                Monto total: {formatCurrency(selectedLoan.amount)}
              </Text>
              <Text style={styles.paymentPendingInfo}>
                Pendiente: {formatCurrency(selectedLoan.amount - selectedLoan.payments.reduce((sum, p) => sum + p.amount, 0))}
              </Text>
              
              <TextInput
                label="Monto a pagar"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              
              <View style={styles.modalButtons}>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setPaymentModalVisible(false);
                    setSelectedLoan(null);
                    setPaymentAmount('');
                  }}
                  style={styles.cancelButton}
                >
                  Cancelar
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handlePayment}
                  style={styles.submitButton}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  Pagar
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>

      <Portal>
        <Dialog
          visible={confirmDialogVisible}
          onDismiss={() => {
            setConfirmDialogVisible(false);
            setSelectedLoan(null);
          }}
        >
          <Dialog.Title>Confirmar acción</Dialog.Title>
          <Dialog.Content>
            {actionType === 'approval' && (
              <Text>
                ¿Deseas aprobar o rechazar esta solicitud de préstamo?
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setConfirmDialogVisible(false);
              setSelectedLoan(null);
            }}>
              Cancelar
            </Button>
            {actionType === 'approval' && (
              <>
                <Button 
                  onPress={() => handleApproveReject(false)}
                  color="#f44336"
                >
                  Rechazar
                </Button>
                <Button 
                  onPress={() => handleApproveReject(true)}
                  color="#4CAF50"
                >
                  Aprobar
                </Button>
              </>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loansList: {
    padding: 16,
    paddingBottom: 80,
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
  loanParties: {
    marginBottom: 8,
  },
  loanDetails: {
    marginTop: 8,
  },
  amountText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  paymentProgress: {
    marginTop: 8,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#757575',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  usersList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  userItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#bdbdbd',
  },
  dateSelector: {
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  dateSelectorLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  paymentTypeContainer: {
    marginBottom: 16,
  },
  paymentTypeLabel: {
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginRight: 5,
  },
  rejectButton: {
    backgroundColor: '#F44336',
    flex: 1,
    marginLeft: 5,
  },
});

export default LoansScreen;