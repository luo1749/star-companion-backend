const { query } = require('../config/db');

class DataSimulator {
  constructor() {
    this.students = [];
    this.devices = [];
    this.isRunning = false;
    this.interval = null;
  }

  // 初始化模拟器
  async initialize() {
    try {
      // 获取所有学生和设备
      this.students = await query('SELECT id, name FROM students WHERE status = "active"');
      this.devices = await query('SELECT id, student_id FROM devices');
      
      console.log(`数据模拟器初始化完成，发现${this.students.length}个学生，${this.devices.length}个设备`);
      return true;
    } catch (error) {
      console.error('初始化数据模拟器失败:', error);
      return false;
    }
  }

  // 开始模拟数据
  startSimulation(interval = 5000) {
    if (this.isRunning) {
      console.log('数据模拟器已在运行');
      return;
    }

    if (this.students.length === 0) {
      console.error('没有可模拟的学生数据');
      return;
    }

    this.isRunning = true;
    console.log(`开始数据模拟，间隔: ${interval}ms`);

    this.interval = setInterval(() => {
      this.generateData();
    }, interval);
  }

  // 停止模拟
  stopSimulation() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('数据模拟器已停止');
  }

  // 生成模拟数据
  async generateData() {
    for (const student of this.students) {
      try {
        // 查找学生对应的设备
        const device = this.devices.find(d => d.student_id === student.id);
        if (!device) continue;

        // 生成模拟生理数据
        const biometricData = {
          device_id: device.id,
          student_id: student.id,
          heart_rate: this.generateHeartRate(student.id),
          temperature: this.generateTemperature(),
          blood_oxygen: this.generateBloodOxygen(),
          steps: this.generateSteps(),
          calories: this.generateCalories()
        };

        // 插入数据库
        await query(
          `INSERT INTO biometric_data 
           (device_id, student_id, heart_rate, temperature, blood_oxygen, steps, calories) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            biometricData.device_id,
            biometricData.student_id,
            biometricData.heart_rate,
            biometricData.temperature,
            biometricData.blood_oxygen,
            biometricData.steps,
            biometricData.calories
          ]
        );

        // 检查是否触发预警
        await this.checkAlerts(student.id, biometricData);

        // 更新设备状态
        await query(
          'UPDATE devices SET last_heartbeat = NOW(), status = "online" WHERE id = ?',
          [device.id]
        );

        console.log(`为${student.name}生成数据:`, {
          心率: biometricData.heart_rate,
          体温: biometricData.temperature
        });

      } catch (error) {
        console.error(`为学生${student.name}生成数据失败:`, error);
      }
    }
  }

  // 生成心率（带模式模拟）
  generateHeartRate(studentId) {
    const baseRate = 80 + (studentId % 20); // 每个学生有不同的基础心率
    const timeOfDay = new Date().getHours();
    
    // 模拟一天中的心率变化
    let variation = 0;
    if (timeOfDay >= 8 && timeOfDay <= 16) {
      // 白天活动时间
      variation = Math.random() * 20 + 10;
    } else if (timeOfDay >= 17 && timeOfDay <= 20) {
      // 傍晚放松时间
      variation = Math.random() * 10 - 5;
    } else {
      // 晚上休息时间
      variation = Math.random() * 15 - 10;
    }
    
    // 偶尔模拟异常心率（1%概率）
    if (Math.random() < 0.01) {
      return baseRate + 50 + Math.random() * 30;
    }
    
    const heartRate = Math.round(baseRate + variation);
    return Math.max(60, Math.min(140, heartRate));
  }

  // 生成体温
  generateTemperature() {
    const baseTemp = 36.5;
    const variation = (Math.random() - 0.5) * 0.5; // -0.25 到 +0.25
    const temperature = baseTemp + variation;
    
    // 偶尔模拟发烧（0.5%概率）
    if (Math.random() < 0.005) {
      return 37.5 + Math.random() * 1.0;
    }
    
    return Number(temperature.toFixed(1));
  }

  // 生成血氧
  generateBloodOxygen() {
    const baseOxygen = 98;
    const variation = Math.random() * 2 - 1; // -1 到 +1
    return Math.round(baseOxygen + variation);
  }

  // 生成步数
  generateSteps() {
    const timeOfDay = new Date().getHours();
    let steps;
    
    if (timeOfDay >= 8 && timeOfDay <= 16) {
      // 活动时间：每分钟5-20步
      steps = Math.floor(Math.random() * 15) + 5;
    } else {
      // 非活动时间：每分钟0-5步
      steps = Math.floor(Math.random() * 5);
    }
    
    return steps * 5; // 5分钟的步数
  }

  // 生成卡路里
  generateCalories() {
    const baseCalories = 0.1;
    const variation = Math.random() * 0.05;
    return Number((baseCalories + variation).toFixed(2));
  }

  // 检查预警
  async checkAlerts(studentId, data) {
    try {
      // 心率过高预警
      if (data.heart_rate > 120) {
        await this.createAlert(studentId, '心率过高', `心率${data.heart_rate}BPM超过阈值120BPM`, 'high');
      }
      
      // 体温异常预警
      if (data.temperature > 37.5) {
        await this.createAlert(studentId, '体温异常', `体温${data.temperature}°C超过阈值37.5°C`, 'high');
      }
      
      // 血氧过低预警
      if (data.blood_oxygen < 95) {
        await this.createAlert(studentId, '血氧过低', `血氧${data.blood_oxygen}%低于阈值95%`, 'medium');
      }
      
    } catch (error) {
      console.error('检查预警失败:', error);
    }
  }

  // 创建预警
  async createAlert(studentId, title, message, severity = 'medium') {
    try {
      await query(
        `INSERT INTO alerts 
         (student_id, title, message, severity, status) 
         VALUES (?, ?, ?, ?, 'pending')`,
        [studentId, title, message, severity]
      );
      
      console.log(`为${studentId}创建预警:`, { title, message });
    } catch (error) {
      console.error('创建预警失败:', error);
    }
  }

  // 生成位置数据
  async generateLocationData() {
    if (!this.isRunning) return;

    for (const device of this.devices) {
      try {
        // 模拟位置变化
        const baseLat = 39.9042; // 北京纬度
        const baseLng = 116.4074; // 北京经度
        
        const latVariation = (Math.random() - 0.5) * 0.001;
        const lngVariation = (Math.random() - 0.5) * 0.001;
        
        const location = {
          device_id: device.id,
          student_id: device.student_id,
          latitude: Number((baseLat + latVariation).toFixed(6)),
          longitude: Number((baseLng + lngVariation).toFixed(6)),
          address: '北京市某特殊教育学校',
          accuracy: Math.random() * 10 + 5,
          battery_level: Math.floor(Math.random() * 30) + 70
        };

        await query(
          `INSERT INTO locations 
           (device_id, student_id, latitude, longitude, address, accuracy, battery_level) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            location.device_id,
            location.student_id,
            location.latitude,
            location.longitude,
            location.address,
            location.accuracy,
            location.battery_level
          ]
        );

        // 检查是否离开安全区域
        await this.checkSafeZone(location.student_id, location.latitude, location.longitude);

      } catch (error) {
        console.error('生成位置数据失败:', error);
      }
    }
  }

  // 检查安全区域
  async checkSafeZone(studentId, lat, lng) {
    try {
      // 获取学生的安全区域
      const safeZones = await query(
        'SELECT * FROM safe_zones WHERE student_id = ? AND is_active = TRUE',
        [studentId]
      );

      for (const zone of safeZones) {
        const distance = this.calculateDistance(lat, lng, zone.center_latitude, zone.center_longitude);
        
        if (distance > zone.radius_meters) {
          await this.createAlert(
            studentId,
            '离开安全区域',
            `离开${zone.zone_name}安全区域，距离${Math.round(distance)}米`,
            'critical'
          );
        }
      }
    } catch (error) {
      console.error('检查安全区域失败:', error);
    }
  }

  // 计算距离（简化版）
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(value) {
    return value * Math.PI / 180;
  }

  // 生成情绪数据
  async generateEmotionData() {
    if (!this.isRunning) return;

    for (const student of this.students) {
      try {
        const emotions = ['calm', 'happy', 'anxious', 'excited'];
        const weights = [0.6, 0.2, 0.15, 0.05]; // 平静60%，愉快20%，焦虑15%，兴奋5%
        
        let random = Math.random();
        let emotionIndex = 0;
        let cumulativeWeight = 0;
        
        for (let i = 0; i < weights.length; i++) {
          cumulativeWeight += weights[i];
          if (random <= cumulativeWeight) {
            emotionIndex = i;
            break;
          }
        }
        
        const emotionData = {
          student_id: student.id,
          emotion_type: emotions[emotionIndex],
          confidence: Math.random() * 0.3 + 0.7, // 70%-100%置信度
          source: 'hrv',
          recorded_by: 2, // 默认老师ID
          notes: '系统自动识别'
        };

        await query(
          `INSERT INTO emotion_data 
           (student_id, emotion_type, confidence, source, recorded_by, notes) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            emotionData.student_id,
            emotionData.emotion_type,
            emotionData.confidence,
            emotionData.source,
            emotionData.recorded_by,
            emotionData.notes
          ]
        );

      } catch (error) {
        console.error('生成情绪数据失败:', error);
      }
    }
  }
}

// 创建单例
const dataSimulator = new DataSimulator();

module.exports = dataSimulator;