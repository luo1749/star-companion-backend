const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
// 1. 新增：引入WebSocket模块
const WebSocket = require('ws');
const http = require('http');

// ====================== 新增：模拟器相关引入和模拟实现 ======================
// 导入数据模拟器（如果文件不存在，先创建空实现避免报错）
let dataSimulator;
try {
  dataSimulator = require('./utils/dataSimulator');
  // 初始化模拟器
  dataSimulator.initialize();
} catch (error) {
  console.log('⚠️  数据模拟器模块未找到，使用模拟实现');
  // 模拟实现，避免报错
  dataSimulator = {
    isRunning: false,
    students: [{ id: 1, name: '小明' }, { id: 2, name: '小红' }],
    devices: [{ id: 'dev001', name: '健康手环001' }],
    initialize: () => console.log('数据模拟器初始化完成'),
    startSimulation: (interval) => {
      dataSimulator.isRunning = true;
      console.log(`数据模拟器启动，间隔：${interval}ms`);
    },
    stopSimulation: () => {
      dataSimulator.isRunning = false;
      console.log('数据模拟器停止');
    },
    generateData: async () => {
      console.log('单次模拟数据生成完成');
    }
  };
  dataSimulator.initialize();
}

// 新增：模拟认证中间件（避免接口调用报错）
const authenticateToken = (req, res, next) => {
  // 简化版：跳过真实token验证，直接放行
  next();
};

// 新增：模拟角色检查中间件
const checkRole = (roles) => (req, res, next) => {
  // 简化版：跳过真实角色验证，直接放行
  next();
};
// ====================== 模拟器相关代码结束 ======================

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 模拟数据库（扩展字段，支持更多生物特征）
let students = [
  { id: 1, name: '小明', age: 8, heartRate: 85, temperature: 36.5, bloodOxygen: 98, steps: 0, calories: 0, status: '正常' },
  { id: 2, name: '小红', age: 9, heartRate: 95, temperature: 36.8, bloodOxygen: 97, steps: 0, calories: 0, status: '正常' }
];

let alerts = [
  { id: 1, student: '小明', type: '心率', value: 130, time: '10:30', status: '未处理' },
  { id: 2, student: '小红', type: '体温', value: 37.8, time: '11:15', status: '已处理' }
];

// 创建/api路由分组
const apiRouter = express.Router();

// API主页（更新接口列表，新增WebSocket和模拟器说明）
apiRouter.get('/', (req, res) => {
  res.json({
    name: '星伴后端API',
    version: '1.0.0',
    endpoints: [
      'GET  /api/students - 获取学生列表',
      'GET  /api/alerts   - 获取预警列表',
      'POST /api/heartrate - 提交心率数据',
      'POST /api/biometric-data - 提交生物特征数据',
      'POST /api/alerts/:id/handle - 处理预警',
      'GET  /api/realtime - 获取实时数据',
      'WS   ws://localhost:3000 - 实时数据推送', // 新增WebSocket说明
      // 新增模拟器接口说明
      'POST /api/simulator/start - 启动数据模拟器',
      'POST /api/simulator/stop - 停止数据模拟器',
      'GET  /api/simulator/status - 获取模拟器状态',
      'POST /api/simulator/generate-once - 生成单次模拟数据'
    ]
  });
});

// 获取学生列表
apiRouter.get('/students', (req, res) => {
  res.json({
    success: true,
    data: students,
    timestamp: new Date().toISOString()
  });
});

// 获取预警列表
apiRouter.get('/alerts', (req, res) => {
  res.json({
    success: true,
    data: alerts,
    count: alerts.length
  });
});

// 提交心率数据（保留原有接口，兼容旧请求）
apiRouter.post('/heartrate', (req, res) => {
  const { studentId, heartRate } = req.body;
  
  if (!studentId || !heartRate) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数'
    });
  }
  
  const student = students.find(s => s.id == studentId);
  if (student) {
    student.heartRate = heartRate;
    let newAlert = null;
    
    if (heartRate > 120) {
      newAlert = {
        id: alerts.length + 1,
        student: student.name,
        type: '心率过高',
        value: heartRate,
        time: new Date().toLocaleTimeString(),
        status: '未处理'
      };
      alerts.unshift(newAlert);
      
      // 新增：有预警时通过WebSocket广播
      if (wss) {
        broadcastToStudent(studentId, {
          type: 'alert_notification',
          data: {
            studentId,
            message: `心率过高：${heartRate} bpm`,
            severity: 'high',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    // 新增：心率更新时通过WebSocket广播
    if (wss) {
      broadcastToStudent(studentId, {
        type: 'biometric_update',
        data: {
          studentId,
          heartRate,
          temperature: student.temperature,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json({
      success: true,
      message: '心率数据已接收',
      student: student,
      alert: newAlert
    });
  } else {
    res.status(404).json({
      success: false,
      message: '学生不存在'
    });
  }
});

// 新增：提交生物特征数据接口（解决404问题）
apiRouter.post('/biometric-data', (req, res) => {
  const { device_id, student_id, heart_rate, temperature, blood_oxygen, steps, calories } = req.body;
  
  // 验证必填参数
  if (!device_id || !student_id || !heart_rate || !temperature) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数（device_id、student_id、heart_rate、temperature为必填）'
    });
  }

  // 查找学生
  const student = students.find(s => s.id == student_id);
  if (student) {
    // 更新所有生物特征数据
    student.heartRate = heart_rate;
    student.temperature = temperature;
    student.bloodOxygen = blood_oxygen || student.bloodOxygen;
    student.steps = steps || student.steps;
    student.calories = calories || student.calories;

    // 触发预警逻辑（心率>120 或 体温>37.5）
    let newAlert = null;
    if (heart_rate > 120 || temperature > 37.5) {
      newAlert = {
        id: alerts.length + 1,
        student: student.name,
        type: heart_rate > 120 ? '心率过高' : '体温过高',
        value: heart_rate > 120 ? heart_rate : temperature,
        time: new Date().toLocaleTimeString(),
        status: '未处理'
      };
      alerts.unshift(newAlert);
      
      // 新增：有预警时通过WebSocket广播
      if (wss) {
        broadcastToStudent(student_id, {
          type: 'alert_notification',
          data: {
            studentId: student_id,
            message: `${newAlert.type}：${newAlert.value}`,
            severity: 'high',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // 新增：生物特征更新时通过WebSocket广播
    if (wss) {
      broadcastToStudent(student_id, {
        type: 'biometric_update',
        data: {
          studentId: student_id,
          heartRate: heart_rate,
          temperature: temperature,
          bloodOxygen: blood_oxygen,
          steps: steps,
          calories: calories,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: '生物特征数据已接收',
      student: student,
      alert: newAlert
    });
  } else {
    res.status(404).json({
      success: false,
      message: '学生不存在'
    });
  }
});

// 处理预警
apiRouter.post('/alerts/:id/handle', (req, res) => {
  const alertId = parseInt(req.params.id);
  const alert = alerts.find(a => a.id === alertId);
  
  if (alert) {
    alert.status = '已处理';
    alert.handledAt = new Date().toLocaleTimeString();
    
    // 新增：预警处理后通过WebSocket广播
    const student = students.find(s => s.name === alert.student);
    if (student && wss) {
      broadcastToStudent(student.id, {
        type: 'alert_handled',
        data: {
          studentId: student.id,
          alertId,
          message: '预警已处理',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json({
      success: true,
      message: '预警已处理',
      alert: alert
    });
  } else {
    res.status(404).json({
      success: false,
      message: '预警不存在'
    });
  }
});

// 模拟实时数据流（扩展返回字段）
apiRouter.get('/realtime', (req, res) => {
  students.forEach(student => {
    // 模拟心率波动
    student.heartRate += Math.floor(Math.random() * 10) - 5;
    student.heartRate = Math.max(60, Math.min(140, student.heartRate));
    // 模拟体温小幅波动
    student.temperature += (Math.random() - 0.5) * 0.2;
    student.temperature = Math.round(student.temperature * 10) / 10;
    
    // 新增：实时数据更新时通过WebSocket广播
    if (wss) {
      broadcastToStudent(student.id, {
        type: 'biometric_update',
        data: {
          studentId: student.id,
          heartRate: student.heartRate,
          temperature: student.temperature,
          timestamp: new Date().toISOString()
        }
      });
    }
  });
  
  res.json({
    success: true,
    data: students,
    timestamp: new Date().toISOString()
  });
});

// ====================== 新增：模拟器控制接口 ======================
// 模拟器控制接口（挂载到/api前缀下）
apiRouter.post('/simulator/start', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { interval = 5000 } = req.body;
    dataSimulator.startSimulation(interval);
    
    res.json({
      success: true,
      message: '数据模拟器已启动',
      interval
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '启动模拟器失败'
    });
  }
});

apiRouter.post('/simulator/stop', authenticateToken, checkRole(['admin']), (req, res) => {
  try {
    dataSimulator.stopSimulation();
    
    res.json({
      success: true,
      message: '数据模拟器已停止'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '停止模拟器失败'
    });
  }
});

apiRouter.get('/simulator/status', authenticateToken, checkRole(['admin']), (req, res) => {
  res.json({
    success: true,
    data: {
      isRunning: dataSimulator.isRunning,
      studentCount: dataSimulator.students.length,
      deviceCount: dataSimulator.devices.length
    }
  });
});

apiRouter.post('/simulator/generate-once', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    await dataSimulator.generateData();
    
    res.json({
      success: true,
      message: '数据生成完成'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '生成数据失败'
    });
  }
});
// ====================== 模拟器接口结束 ======================

// 挂载/api前缀
app.use('/api', apiRouter);

// 2. 新增：创建HTTP服务器（替代app.listen）
const server = http.createServer(app);

// 3. 新增：创建WebSocket服务器
let wss;
wss = new WebSocket.Server({ server: server });

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  console.log('🔌 新的WebSocket连接');
  
  // 解析token和参数
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const studentId = url.searchParams.get('studentId');
  
  // 存储连接信息
  ws.userData = { token, studentId };
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'WebSocket连接成功',
    timestamp: new Date().toISOString()
  }));
  
  // 心跳检测
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // 处理消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(ws, data);
    } catch (error) {
      console.error('WebSocket消息解析错误:', error);
    }
  });
  
  // 处理关闭
  ws.on('close', () => {
    console.log('WebSocket连接关闭');
  });
  
  // 处理错误
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
});

// WebSocket心跳检测
const interval = setInterval(() => {
  if (!wss) return;
  
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping(null, false, true);
  });
}, 30000);

// 清理
wss.on('close', () => {
  clearInterval(interval);
});

// 处理WebSocket消息
function handleWebSocketMessage(ws, data) {
  const { type, payload } = data;
  
  switch (type) {
    case 'subscribe':
      // 订阅学生数据
      ws.subscribedStudentId = payload.studentId;
      ws.send(JSON.stringify({
        type: 'subscribed',
        studentId: payload.studentId,
        timestamp: new Date().toISOString()
      }));
      break;
      
    case 'unsubscribe':
      ws.subscribedStudentId = null;
      ws.send(JSON.stringify({
        type: 'unsubscribed',
        timestamp: new Date().toISOString()
      }));
      break;
      
    case 'biometric_data':
      // 处理实时数据
      handleBiometricData(ws, payload);
      break;
      
    case 'alert':
      // 处理预警
      handleAlertNotification(ws, payload);
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: '未知的消息类型',
        timestamp: new Date().toISOString()
      }));
  }
}

// 处理实时数据
function handleBiometricData(ws, data) {
  // 验证数据
  if (!data.studentId || !data.heartRate) {
    ws.send(JSON.stringify({
      type: 'error',
      message: '无效的数据格式',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // 广播给所有订阅了该学生的客户端
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && 
        client.subscribedStudentId === data.studentId) {
      client.send(JSON.stringify({
        type: 'biometric_update',
        data: {
          studentId: data.studentId,
          heartRate: data.heartRate,
          temperature: data.temperature,
          timestamp: new Date().toISOString()
        }
      }));
    }
  });
}

// 处理预警通知
function handleAlertNotification(ws, data) {
  // 验证数据
  if (!data.studentId || !data.message) {
    ws.send(JSON.stringify({
      type: 'error',
      message: '无效的预警数据',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // 广播给所有订阅了该学生的客户端
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && 
        client.subscribedStudentId === data.studentId) {
      client.send(JSON.stringify({
        type: 'alert_notification',
        data: {
          studentId: data.studentId,
          message: data.message,
          severity: data.severity || 'medium',
          timestamp: new Date().toISOString()
        }
      }));
    }
  });
}

// 广播函数（供其他模块调用）
function broadcastToStudent(studentId, message) {
  if (!wss) return;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && 
        client.subscribedStudentId === studentId) {
      client.send(JSON.stringify(message));
    }
  });
}

// 4. 新增：启动HTTP服务器（替代原有的app.listen）
server.listen(PORT, () => {
  console.log('🚀 星伴后端服务器已启动（含WebSocket+模拟器支持）');
  console.log(`📡 HTTP地址：http://localhost:${PORT}`);
  console.log(`🔌 WebSocket地址：ws://localhost:${PORT}`);
  console.log('📋 可用接口（已添加/api前缀）：');
  console.log(`  主页：http://localhost:${PORT}/api`);
  console.log(`  学生列表：http://localhost:${PORT}/api/students`);
  console.log(`  预警列表：http://localhost:${PORT}/api/alerts`);
  console.log(`  心率提交：POST http://localhost:${PORT}/api/heartrate`);
  console.log(`  生物特征提交：POST http://localhost:${PORT}/api/biometric-data`);
  console.log(`  实时数据：http://localhost:${PORT}/api/realtime`);
  // 新增模拟器接口说明
  console.log(`  模拟器启动：POST http://localhost:${PORT}/api/simulator/start`);
  console.log(`  模拟器停止：POST http://localhost:${PORT}/api/simulator/stop`);
  console.log('\n💡 测试生物特征接口示例：');
  console.log('  POST http://localhost:3000/api/biometric-data');
  console.log('  Body: {"device_id":"dev001","student_id":1,"heart_rate":125,"temperature":37.6}');
  console.log('\n💡 WebSocket测试示例：');
  console.log('  ws://localhost:3000?token=test&studentId=1');
});

// 导出广播函数（可选）
module.exports = {
  broadcastToStudent
};