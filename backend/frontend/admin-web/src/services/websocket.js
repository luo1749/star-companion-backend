class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
  }

  // 连接到WebSocket服务器
  connect(token, studentId = null) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return Promise.resolve(this.socket);
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://localhost:3000?token=${token}${studentId ? `&studentId=${studentId}` : ''}`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket连接成功');
          this.reconnectAttempts = 0;
          
          // 重新订阅之前的主题
          this.subscriptions.forEach((data, studentId) => {
            this.subscribe(studentId);
          });
          
          resolve(this.socket);
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket错误:', error);
          reject(error);
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket连接关闭:', event.code, event.reason);
          
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 尝试重新连接
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        const token = localStorage.getItem('token');
        if (token) {
          this.connect(token);
        }
      }, delay);
    } else {
      console.error('达到最大重连次数，连接失败');
    }
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, '用户主动断开');
      this.socket = null;
      this.subscriptions.clear();
    }
  }

  // 订阅学生数据
  subscribe(studentId) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接，无法订阅');
      return false;
    }

    const message = {
      type: 'subscribe',
      payload: { studentId }
    };

    this.socket.send(JSON.stringify(message));
    this.subscriptions.set(studentId, true);
    return true;
  }

  // 取消订阅
  unsubscribe(studentId) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const message = {
      type: 'unsubscribe',
      payload: { studentId }
    };

    this.socket.send(JSON.stringify(message));
    this.subscriptions.delete(studentId);
    return true;
  }

  // 发送实时数据
  sendBiometricData(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const message = {
      type: 'biometric_data',
      payload: data
    };

    this.socket.send(JSON.stringify(message));
    return true;
  }

  // 发送预警
  sendAlert(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const message = {
      type: 'alert',
      payload: data
    };

    this.socket.send(JSON.stringify(message));
    return true;
  }

  // 处理收到的消息
  handleMessage(message) {
    const { type, data } = message;

    switch (type) {
      case 'welcome':
        console.log('WebSocket欢迎消息:', data.message);
        this.triggerEvent('welcome', data);
        break;

      case 'subscribed':
        console.log('订阅成功:', data.studentId);
        this.triggerEvent('subscribed', data);
        break;

      case 'biometric_update':
        this.triggerEvent('biometric_update', data);
        break;

      case 'alert_notification':
        console.log('收到预警:', data);
        this.triggerEvent('alert', data);
        
        // 显示浏览器通知（如果支持）
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('星伴平台 - 预警通知', {
            body: data.message,
            icon: '/favicon.ico'
          });
        }
        break;

      case 'error':
        console.error('WebSocket错误:', data.message);
        this.triggerEvent('error', data);
        break;

      default:
        console.warn('未知的消息类型:', type);
    }
  }

  // 注册消息处理器
  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);
  }

  // 移除消息处理器
  off(event, handler) {
    if (this.messageHandlers.has(event)) {
      const handlers = this.messageHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 触发事件
  triggerEvent(event, data) {
    if (this.messageHandlers.has(event)) {
      this.messageHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error);
        }
      });
    }
  }

  // 获取连接状态
  getState() {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

// 创建单例
const webSocketService = new WebSocketService();

export default webSocketService;