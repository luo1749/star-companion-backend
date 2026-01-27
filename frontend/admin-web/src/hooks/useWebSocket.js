import { ref, onMounted, onUnmounted } from 'vue';
import webSocketService from '../services/websocket';

export function useWebSocket(studentId = null) {
  const isConnected = ref(false);
  const realtimeData = ref(null);
  const alerts = ref([]);
  
  // 连接到WebSocket
  const connect = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('未找到token，无法连接WebSocket');
        return false;
      }
      
      await webSocketService.connect(token, studentId);
      isConnected.value = true;
      
      // 订阅学生数据
      if (studentId) {
        webSocketService.subscribe(studentId);
      }
      
      return true;
    } catch (error) {
      console.error('连接WebSocket失败:', error);
      isConnected.value = false;
      return false;
    }
  };
  
  // 断开连接
  const disconnect = () => {
    webSocketService.disconnect();
    isConnected.value = false;
  };
  
  // 监听实时数据
  const setupListeners = () => {
    webSocketService.on('biometric_update', (data) => {
      realtimeData.value = data;
    });
    
    webSocketService.on('alert', (data) => {
      alerts.value.unshift({
        ...data,
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString()
      });
      
      // 只保留最近的10条预警
      if (alerts.value.length > 10) {
        alerts.value = alerts.value.slice(0, 10);
      }
    });
    
    webSocketService.on('error', (error) => {
      console.error('WebSocket错误:', error);
    });
  };
  
  // 发送模拟数据
  const sendMockData = () => {
    if (!isConnected.value || !studentId) return;
    
    const mockData = {
      studentId,
      heartRate: Math.floor(Math.random() * 80) + 60, // 60-140
      temperature: 36.5 + Math.random() * 1.0, // 36.5-37.5
      timestamp: new Date().toISOString()
    };
    
    webSocketService.sendBiometricData(mockData);
  };
  
  // 发送模拟预警
  const sendMockAlert = () => {
    if (!isConnected.value || !studentId) return;
    
    const mockAlert = {
      studentId,
      message: '模拟预警：心率异常',
      severity: 'high',
      timestamp: new Date().toISOString()
    };
    
    webSocketService.sendAlert(mockAlert);
  };
  
  onMounted(() => {
    setupListeners();
    connect();
  });
  
  onUnmounted(() => {
    disconnect();
  });
  
  return {
    isConnected,
    realtimeData,
    alerts,
    connect,
    disconnect,
    sendMockData,
    sendMockAlert
  };
}