<template>
  <div class="simulator-page">
    <h1>数据模拟器控制</h1>
    
    <div class="simulator-info">
      <div class="info-card">
        <div class="info-icon">📊</div>
        <div class="info-content">
          <div class="info-value">{{ status.isRunning ? '运行中' : '已停止' }}</div>
          <div class="info-label">模拟器状态</div>
        </div>
      </div>
      
      <div class="info-card">
        <div class="info-icon">👥</div>
        <div class="info-content">
          <div class="info-value">{{ status.studentCount || 0 }}</div>
          <div class="info-label">模拟学生</div>
        </div>
      </div>
      
      <div class="info-card">
        <div class="info-icon">📱</div>
        <div class="info-content">
          <div class="info-value">{{ status.deviceCount || 0 }}</div>
          <div class="info-label">模拟设备</div>
        </div>
      </div>
    </div>
    
    <div class="control-panel">
      <div class="control-section">
        <h3>基础控制</h3>
        
        <div class="control-group">
          <label>模拟间隔 (毫秒)</label>
          <input 
            v-model="interval" 
            type="number" 
            min="1000" 
            max="30000" 
            step="1000"
            :disabled="isRunning"
          />
        </div>
        
        <div class="control-buttons">
          <button 
            class="btn btn-start" 
            @click="startSimulator"
            :disabled="isRunning"
          >
            🚀 启动模拟器
          </button>
          
          <button 
            class="btn btn-stop" 
            @click="stopSimulator"
            :disabled="!isRunning"
          >
            ⏹️ 停止模拟器
          </button>
          
          <button 
            class="btn btn-generate" 
            @click="generateOnce"
          >
            🔄 生成一次数据
          </button>
        </div>
      </div>
      
      <div class="control-section">
        <h3>模拟选项</h3>
        
        <div class="checkbox-group">
          <label class="checkbox">
            <input type="checkbox" v-model="options.simulateHeartRate" />
            <span>模拟心率数据</span>
          </label>
          
          <label class="checkbox">
            <input type="checkbox" v-model="options.simulateTemperature" />
            <span>模拟体温数据</span>
          </label>
          
          <label class="checkbox">
            <input type="checkbox" v-model="options.simulateLocation" />
            <span>模拟位置数据</span>
          </label>
          
          <label class="checkbox">
            <input type="checkbox" v-model="options.simulateEmotion" />
            <span>模拟情绪数据</span>
          </label>
          
          <label class="checkbox">
            <input type="checkbox" v-model="options.simulateAlerts" />
            <span>模拟预警触发</span>
          </label>
        </div>
      </div>
      
      <div class="control-section">
        <h3>实时日志</h3>
        
        <div class="log-container">
          <div v-for="(log, index) in logs" :key="index" class="log-entry">
            <span class="log-time">[{{ log.time }}]</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
        
        <div class="log-controls">
          <button class="btn btn-small" @click="clearLogs">清空日志</button>
          <button class="btn btn-small" @click="startLogging" v-if="!isLogging">开始记录</button>
          <button class="btn btn-small" @click="stopLogging" v-else>停止记录</button>
        </div>
      </div>
    </div>
    
    <div class="simulation-stats">
      <h3>模拟统计</h3>
      
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ stats.dataGenerated || 0 }}</div>
          <div class="stat-label">数据生成次数</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-value">{{ stats.alertsTriggered || 0 }}</div>
          <div class="stat-label">预警触发次数</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-value">{{ stats.errors || 0 }}</div>
          <div class="stat-label">错误次数</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-value">{{ stats.runtime || '0:00' }}</div>
          <div class="stat-label">运行时间</div>
        </div>
      </div>
    </div>
    
    <div class="warning">
      <p>⚠️ 注意：此功能仅用于演示和测试，生产环境请勿开启。</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import apiService from '../services/api';

export default {
  name: 'Simulator',
  setup() {
    const isRunning = ref(false);
    const interval = ref(5000);
    const status = ref({});
    const logs = ref([]);
    const isLogging = ref(true);
    const stats = ref({});
    
    const options = ref({
      simulateHeartRate: true,
      simulateTemperature: true,
      simulateLocation: true,
      simulateEmotion: true,
      simulateAlerts: true
    });
    
    let runtimeTimer = null;
    let startTime = null;
    
    // 获取模拟器状态
    const getSimulatorStatus = async () => {
      try {
        const response = await apiService.getSimulatorStatus();
        status.value = response.data;
        isRunning.value = response.data.isRunning;
      } catch (error) {
        addLog('获取模拟器状态失败', 'error');
      }
    };
    
    // 启动模拟器
    const startSimulator = async () => {
      try {
        await apiService.startSimulator({ interval: interval.value });
        addLog(`模拟器已启动，间隔: ${interval.value}ms`, 'success');
        
        isRunning.value = true;
        startTime = new Date();
        startRuntimeTimer();
        
        // 更新状态
        setTimeout(getSimulatorStatus, 1000);
      } catch (error) {
        addLog('启动模拟器失败', 'error');
      }
    };
    
    // 停止模拟器
    const stopSimulator = async () => {
      try {
        await apiService.stopSimulator();
        addLog('模拟器已停止', 'info');
        
        isRunning.value = false;
        stopRuntimeTimer();
        
        // 更新状态
        setTimeout(getSimulatorStatus, 1000);
      } catch (error) {
        addLog('停止模拟器失败', 'error');
      }
    };
    
    // 生成一次数据
    const generateOnce = async () => {
      try {
        await apiService.generateSimulatorData();
        addLog('已生成一次模拟数据', 'success');
        stats.value.dataGenerated = (stats.value.dataGenerated || 0) + 1;
      } catch (error) {
        addLog('生成数据失败', 'error');
        stats.value.errors = (stats.value.errors || 0) + 1;
      }
    };
    
    // 添加日志
    const addLog = (message, type = 'info') => {
      if (!isLogging.value) return;
      
      const time = new Date().toLocaleTimeString();
      logs.value.unshift({
        time,
        message,
        type
      });
      
      // 限制日志数量
      if (logs.value.length > 100) {
        logs.value.pop();
      }
    };
    
    // 清空日志
    const clearLogs = () => {
      logs.value = [];
    };
    
    // 开始记录日志
    const startLogging = () => {
      isLogging.value = true;
      addLog('开始记录日志', 'info');
    };
    
    // 停止记录日志
    const stopLogging = () => {
      isLogging.value = false;
      addLog('停止记录日志', 'info');
    };
    
    // 开始运行时间计时
    const startRuntimeTimer = () => {
      if (runtimeTimer) clearInterval(runtimeTimer);
      
      runtimeTimer = setInterval(() => {
        if (startTime) {
          const diff = new Date() - startTime;
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          stats.value.runtime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    };
    
    // 停止运行时间计时
    const stopRuntimeTimer = () => {
      if (runtimeTimer) {
        clearInterval(runtimeTimer);
        runtimeTimer = null;
      }
    };
    
    // 模拟WebSocket消息
    const setupMockWebSocket = () => {
      // 模拟实时数据
      setInterval(() => {
        if (isRunning.value) {
          const mockData = {
            type: 'biometric_update',
            data: {
              studentId: 1,
              heartRate: Math.floor(Math.random() * 80) + 60,
              temperature: 36.5 + Math.random() * 1.0,
              timestamp: new Date().toISOString()
            }
          };
          
          addLog(`模拟数据: 心率${mockData.data.heartRate}BPM, 体温${mockData.data.temperature.toFixed(1)}°C`, 'info');
          stats.value.dataGenerated = (stats.value.dataGenerated || 0) + 1;
          
          // 模拟预警
          if (Math.random() < 0.1 && options.value.simulateAlerts) {
            const alertTypes = ['心率过高', '体温异常', '离开安全区域'];
            const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
            
            addLog(`触发预警: ${randomAlert}`, 'warning');
            stats.value.alertsTriggered = (stats.value.alertsTriggered || 0) + 1;
          }
        }
      }, interval.value);
    };
    
    onMounted(() => {
      getSimulatorStatus();
      setupMockWebSocket();
      
      // 添加初始日志
      addLog('数据模拟器控制界面已加载', 'success');
      addLog('使用管理员账号登录以控制模拟器', 'info');
    });
    
    onUnmounted(() => {
      stopRuntimeTimer();
    });
    
    return {
      isRunning,
      interval,
      status,
      logs,
      isLogging,
      stats,
      options,
      getSimulatorStatus,
      startSimulator,
      stopSimulator,
      generateOnce,
      addLog,
      clearLogs,
      startLogging,
      stopLogging
    };
  }
};
</script>

<style scoped>
.simulator-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.simulator-page h1 {
  margin-bottom: 30px;
  color: #333;
  border-bottom: 3px solid #667eea;
  padding-bottom: 10px;
}

.simulator-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.info-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.info-icon {
  font-size: 40px;
}

.info-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.info-label {
  color: #666;
  font-size: 14px;
}

.control-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 30px;
}

.control-section {
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.control-section h3 {
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
}

.control-group {
  margin-bottom: 20px;
}

.control-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
}

.control-group input {
  width: 100%;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 16px;
}

.control-group input:focus {
  outline: none;
  border-color: #667eea;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-start {
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  color: white;
}

.btn-stop {
  background: linear-gradient(135deg, #F44336 0%, #C62828 100%);
  color: white;
}

.btn-generate {
  background: linear-gradient(135deg, #2196F3 0%, #0D47A1 100%);
  color: white;
}

.btn-small {
  padding: 8px 16px;
  font-size: 14px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox input {
  width: 18px;
  height: 18px;
}

.log-container {
  height: 200px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
  padding: 15px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  margin-bottom: 15px;
}

.log-entry {
  padding: 5px 0;
  border-bottom: 1px solid #2d2d2d;
}

.log-time {
  color: #6a9955;
  margin-right: 10px;
}

.log-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.simulation-stats {
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 10px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.warning {
  background: #fff3e0;
  border-left: 4px solid #ff9800;
  padding: 15px;
  border-radius: 6px;
}

.warning p {
  margin: 0;
  color: #ff9800;
  font-weight: 500;
}

/* 滚动条样式 */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #2d2d2d;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>