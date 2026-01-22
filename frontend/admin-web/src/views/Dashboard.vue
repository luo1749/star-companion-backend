<template>
  <div class="dashboard">
    <h1>仪表盘</h1>
    <p>欢迎来到星伴平台管理后台</p>
  </div>
  <!-- 在原有内容后添加图表区域 -->
  <div class="charts-section">
    <div class="chart-group">
      <div class="chart-card full-width">
        <h3>实时数据监控</h3>
        <HeartRateChart 
          v-if="selectedStudent && heartRateData.length"
          :data="heartRateData"
          :student-name="selectedStudent.name"
        />
        <div v-else class="no-data">
          <p>请选择一个学生查看实时数据</p>
        </div>
      </div>
    </div>
    
    <div class="chart-group">
      <div class="chart-card">
        <h3>预警统计</h3>
        <AlertStatsChart :alerts="alerts" />
      </div>
      
      <div class="chart-card">
        <h3>情绪状态分析</h3>
        <EmotionChart :data="emotionData" />
      </div>
    </div>
    
    <div class="chart-group">
      <div class="chart-card">
        <h3>设备状态</h3>
        <DeviceStatusChart :devices="devices" />
      </div>
      
      <div class="chart-card">
        <h3>干预效果</h3>
        <InterventionChart :interventions="interventions" />
      </div>
    </div>
  </div>
</template>

<script>
import HeartRateChart from '../components/Charts/HeartRateChart.vue';
import { ref, computed } from 'vue';
import EmotionChart from '../components/Charts/EmotionChart.vue';
import AlertStatsChart from '../components/Charts/AlertStatsChart.vue';
import DeviceStatusChart from '../components/Charts/DeviceStatusChart.vue';
import InterventionChart from '../components/Charts/InterventionChart.vue';

export default {
  // 注册所有组件
  components: {
    HeartRateChart,
    EmotionChart,
    AlertStatsChart,
    DeviceStatusChart,
    InterventionChart
  },

  setup() {
    // 1. 初始化响应式变量
    const selectedStudent = ref(null)
    const alerts = ref([])
    const heartRateData = ref([])
    const emotionData = ref([])
    const devices = ref([])
    const interventions = ref([])

    // 2. 添加模拟数据
    heartRateData.value = [
      { timestamp: '2024-01-17 10:00:00', heart_rate: 85, temperature: 36.8 },
      { timestamp: '2024-01-17 10:05:00', heart_rate: 88, temperature: 36.9 },
      { timestamp: '2024-01-17 10:10:00', heart_rate: 92, temperature: 37.0 },
      { timestamp: '2024-01-17 10:15:00', heart_rate: 105, temperature: 37.1 },
      { timestamp: '2024-01-17 10:20:00', heart_rate: 115, temperature: 37.2 },
      { timestamp: '2024-01-17 10:25:00', heart_rate: 125, temperature: 37.3 }
    ]

    emotionData.value = [
  { emotion_type: '平静', timestamp: '2024-01-17 09:00:00', confidence: 0.85 },
  { emotion_type: '焦虑', timestamp: '2024-01-17 09:30:00', confidence: 0.72 },
  { emotion_type: '兴奋', timestamp: '2024-01-17 10:00:00', confidence: 0.68 },
  { emotion_type: '平静', timestamp: '2024-01-17 10:30:00', confidence: 0.91 }
]

    devices.value = [
      { name: '小明的手表', status: 'online', battery: 85 },
      { name: '小红的手表', status: 'online', battery: 72 },
      { name: '小刚的手表', status: 'offline', battery: 45 },
      { name: '小丽的手表', status: 'online', battery: 92 }
    ]

    interventions.value = [
      { name: '感官训练', effectiveness: 4, duration: 30 },
      { name: '情绪调节', effectiveness: 3, duration: 20 },
      { name: '注意力训练', effectiveness: 4, duration: 25 },
      { name: '语言训练', effectiveness: 5, duration: 40 }
    ]

    alerts.value = [
      { type: '心率过高', student_id: 1, timestamp: '2024-01-17 10:20:00', level: '严重' },
      { type: '体温异常', student_id: 2, timestamp: '2024-01-17 10:15:00', level: '一般' }
    ]

    // 3. 返回所有变量给模板使用
    return {
      selectedStudent,
      alerts,
      heartRateData,
      emotionData,
      devices,
      interventions
    }
  }
}


</script>

<style scoped>
.charts-section {
  padding: 20px;
}

.chart-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-card h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 2px solid #667eea;
  padding-bottom: 8px;
}

.no-data {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}
</style>
