import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { 
  Card, Title, Paragraph, Text, FAB, Modal, 
  Portal, Button, TextInput, RadioButton, Divider, Dialog 
} from 'react-native-paper';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { formatCurrency } from '../utils/formatters';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:5000';

const LoansScreen = ({ user }) => {
  const [loans, setLoans] = useState({ loansGiven: [], loansReceived: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userSearchModal, setUserSearchModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [actionType, setActionType] = useState('');

  // Tab navigation state
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'received', title: 'Recibidos' },
    { key: 'given', title: 'Otorgados' },
  ]);

  // Form states for new loan
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

  useEffect(() => {
    fetchLoansData();
  }, []);


  const approveLoan = async (loanId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.put(`${API_URL}/api/loans/${loanId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (response.data.success) {
        Alert.alert('Éxito', 'Préstamo aprobado correctamente');
        fetchLoansData();
      }
    } catch (error) {
      console.error('Error approving loan:', error);
      Alert.alert('Error', 'No se pudo aprobar el préstamo');
    }
  };

  const makePayment = async (loanId, amount) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.post(`${API_URL}/api/loans/${loanId}/payment`, {
        amount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (response.data.success) {
        Alert.alert('Éxito', 'Pago realizado correctamente');
        fetchLoansData();
      }
    } catch (error) {
      console.error('Error making payment:', error);
      Alert.alert('Error', 'No se pudo realizar el pago');
    }
  };

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

  const searchUsers = async () => {
    if (searchTerm.length < 3) {
      showMessage({
        message: 'Ingresa al menos 3 caracteres para buscar',
        type: 'info',
      });
      return;
    }

    setLoadingUsers(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/users/search?term=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setSearchResults(response.data.data.filter(u => u._id !== user._id));
      }
    } catch (error) {
      console.error('Error searching users:', error);
      showMessage({
        message: 'Error',
        description: 'No se pudo realizar la búsqueda de usuarios',
        type: 'danger',
      });
    } finally {
      setLoadingUsers(false);
    }
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

  const handlePayment = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token || !selectedLoan) return;

      const paymentData = {
        amount: parseFloat(paymentAmount),
      };

      const response = await axios.post(
        `${API_URL}/api/loans/${selectedLoan._id}/payment`,
        paymentData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showMessage({
          message: 'Éxito',
          description: 'Pago realizado correctamente',
          type: 'success',
        });
        setPaymentModalVisible(false);
        setPaymentAmount('');
        setSelectedLoan(null);
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
      if (!token || !selectedLoan) return;

      const endpoint = approve ? 
        `${API_URL}/api/loans/${selectedLoan._id}/approve` : 
        `${API_URL}/api/loans/${selectedLoan._id}/reject`;

      const response = await axios.put(
        endpoint,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showMessage({
          message: 'Éxito',
          description: approve ? 
            'Préstamo aprobado correctamente' : 
            'Préstamo rechazado correctamente',
          type: 'success',
        });
        setConfirmDialogVisible(false);
        setSelectedLoan(null);
        fetchLoansData();
      }
    } catch (error) {
      console.error('Error updating loan status:', error);
      showMessage({
        message: 'Error',
        description: 'No se pudo actualizar el estado del préstamo',
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

  const selectUser = (user) => {
    setNewLoan({
      ...newLoan,
      lenderId: user._id,
      lenderName: user.name
    });
    setUserSearchModal(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleLoanPressed = (loan) => {
    setSelectedLoan(loan);
    
    // Determine which actions are available based on loan status and user role
    if (loan.borrower._id === user._id && 
       (loan.status === 'APPROVED' || loan.status === 'ACTIVE' || loan.status === 'LATE')) {
      setPaymentModalVisible(true);
    } else if (loan.lender._id === user._id && loan.status === 'PENDING') {
      setConfirmDialogVisible(true);
      setActionType('approval');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleLoanPressed(item)}>
      <Card style={styles.loanCard}>
        <Card.Content>
          <View style={styles.loanHeader}>
            <Title>{item.description}</Title>
            <Text style={getLoanStatusStyle(item.status)}>
              {getLoanStatusText(item.status)}
            </Text>
          </View>
          
          <View style={styles.loanParties}>
            <Text>
              {item.borrower._id === user._id 
                ? `Prestamista: ${item.lender.name}` 
                : `Prestatario: ${item.borrower.name}`}
            </Text>
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
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const onChangeDatePicker = (event, selectedDate) => {
    const currentDate = selectedDate || newLoan.dueDate;
    setShowDatePicker(false);
    setNewLoan({ ...newLoan, dueDate: currentDate });
  };

  // Helper function for status styles
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

  // Tab view rendering
  const renderReceivedLoans = () => (
    <FlatList
      data={loans.loansReceived}
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
      data={loans.loansGiven}
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
      indicatorStyle={{ backgroundColor: '#4CAF50' }}
      style={{ backgroundColor: 'white' }}
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

      {/* Modal para buscar usuarios */}
      <Portal>
        <Modal
          visible={userSearchModal}
          onDismiss={() => setUserSearchModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>Buscar prestamista</Title>
          <View style={styles.searchContainer}>
            <TextInput
              label="Buscar por nombre o email"
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
              right={
                <TextInput.Icon
                  icon="magnify"
                  onPress={searchUsers}
                  disabled={loadingUsers}
                />
              }
            />
          </View>

          {loadingUsers ? (
            <View style={styles.loadingUsers}>
              <Text>Buscando usuarios...</Text>
            </View>
          ) : (
            <>
              {searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => selectUser(item)}>
                      <View style={styles.userItem}>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <Divider />}
                  style={styles.usersList}
                />
              ) : (
                searchTerm.length >= 3 && (
                  <Text style={styles.noResults}>No se encontraron resultados</Text>
                )
              )}
            </>
          )}

          <Button 
            mode="outlined" 
            onPress={() => setUserSearchModal(false)}
            style={styles.cancelButton}
          >
            Cancelar
          </Button>
        </Modal>
      </Portal>

      {/* Modal para crear préstamo */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>Solicitar préstamo</Title>
          
          <TouchableOpacity
            style={styles.lenderSelector}
            onPress={() => setUserSearchModal(true)}
          >
            <Text style={styles.lenderSelectorLabel}>
              {newLoan.lenderName || 'Seleccionar prestamista'}
            </Text>
            <Text style={styles.lenderSelectorIcon}>👤</Text>
          </TouchableOpacity>

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

      {/* Modal para pagos */}
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

      {/* Diálogo de confirmación para aprobar/rechazar */}
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
              <Paragraph>
                ¿Deseas aprobar o rechazar esta solicitud de préstamo?
              </Paragraph>
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
    paddingBottom: 80, // Space for FAB
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
  lenderSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  lenderSelectorLabel: {
    color: '#757575',
  },
  lenderSelectorIcon: {
    fontSize: 18,
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 8,
  },
  loadingUsers: {
    padding: 16,
    alignItems: 'center',
  },
  usersList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  userItem: {
    padding: 12,
  },
  userName: {
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#757575',
    fontSize: 12,
  },
  noResults: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#757575',
  },
  paymentLoanInfo: {
    fontSize: 16,
    marginBottom: 8,
  },
  paymentAmountInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  paymentPendingInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#f44336',
  },
});

export default LoansScreen;