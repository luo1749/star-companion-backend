const axios = require('axios');
const { performance } = require('perf_hooks');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

// 测试用户
const TEST_USERS = [
  { username: 'admin', password: '123456', role: 'admin' },
  { username: 'teacher_zhang', password: '123456', role: 'teacher' },
  { username: 'parent_li', password: '123456', role: 'parent' }
];

let authToken = '';

async function runTests() {
  console.log('🚀 开始API测试\n');
  const startTime = performance.now();

  try {
    // 1. 测试健康检查
    await testHealthCheck();
    
    // 2. 测试用户认证
    await testAuthentication();
    
    // 3. 测试学生管理
    await testStudentManagement();
    
    // 4. 测试预警系统
    await testAlertSystem();
    
    // 5. 测试干预方案
    await testInterventionSystem();
    
    // 6. 测试家校沟通
    await testCommunicationSystem();
    
    // 7. 性能测试
    await testPerformance();
    
    const endTime = performance.now();
    console.log(`\n✅ 所有测试完成！总用时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 健康检查测试
async function testHealthCheck() {
  console.log('1. 测试健康检查...');
  
  try {
    const response = await axios.get(API_BASE.replace('/api', '/health'));
    if (response.data.status === 'healthy') {
      console.log('   ✅ 健康检查通过');
      return true;
    } else {
      throw new Error('健康检查失败');
    }
  } catch (error) {
    console.log('   ❌ 健康检查失败:', error.message);
    throw error;
  }
}

// 用户认证测试
async function testAuthentication() {
  console.log('2. 测试用户认证...');
  
  for (const user of TEST_USERS) {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: user.username,
        password: user.password
      });
      
      if (response.data.success && response.data.token) {
        console.log(`   ✅ ${user.role}登录成功`);
        authToken = response.data.token; // 保存最后一个token
      } else {
        throw new Error('登录返回格式错误');
      }
    } catch (error) {
      console.log(`   ❌ ${user.role}登录失败:`, error.message);
      throw error;
    }
  }
}

// 学生管理测试
async function testStudentManagement() {
  console.log('3. 测试学生管理...');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  try {
    // 获取学生列表
    const listResponse = await axios.get(`${API_BASE}/students`, { headers });
    if (listResponse.data.success && Array.isArray(listResponse.data.data)) {
      console.log(`   ✅ 获取学生列表成功，共${listResponse.data.data.length}名学生`);
      
      // 测试获取单个学生详情
      if (listResponse.data.data.length > 0) {
        const studentId = listResponse.data.data[0].id;
        const detailResponse = await axios.get(`${API_BASE}/students/${studentId}`, { headers });
        
        if (detailResponse.data.success) {
          console.log(`   ✅ 获取学生详情成功: ${detailResponse.data.data.name}`);
        }
      }
    } else {
      throw new Error('获取学生列表失败');
    }
  } catch (error) {
    console.log('   ❌ 学生管理测试失败:', error.message);
    throw error;
  }
}

// 预警系统测试
async function testAlertSystem() {
  console.log('4. 测试预警系统...');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  try {
    // 获取预警列表
    const listResponse = await axios.get(`${API_BASE}/alerts`, { headers });
    if (listResponse.data.success) {
      console.log(`   ✅ 获取预警列表成功，共${listResponse.data.data.length}条预警`);
      
      // 如果有待处理预警，测试处理功能
      const pendingAlerts = listResponse.data.data.filter(a => a.status === 'pending');
      if (pendingAlerts.length > 0) {
        const alertId = pendingAlerts[0].id;
        const acknowledgeResponse = await axios.post(
          `${API_BASE}/alerts/${alertId}/acknowledge`,
          {},
          { headers }
        );
        
        if (acknowledgeResponse.data.success) {
          console.log('   ✅ 预警确认处理成功');
        }
      }
    } else {
      throw new Error('获取预警列表失败');
    }
  } catch (error) {
    console.log('   ❌ 预警系统测试失败:', error.message);
    throw error;
  }
}

// 干预方案测试
async function testInterventionSystem() {
  console.log('5. 测试干预方案...');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  try {
    // 获取干预方案列表
    const listResponse = await axios.get(`${API_BASE}/interventions`, { headers });
    if (listResponse.data.success) {
      console.log(`   ✅ 获取干预方案成功，共${listResponse.data.data.length}个方案`);
    } else {
      throw new Error('获取干预方案失败');
    }
  } catch (error) {
    console.log('   ❌ 干预方案测试失败:', error.message);
    throw error;
  }
}

// 家校沟通测试
async function testCommunicationSystem() {
  console.log('6. 测试家校沟通...');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  try {
    // 获取沟通记录
    const listResponse = await axios.get(`${API_BASE}/communications`, { headers });
    if (listResponse.data.success) {
      console.log(`   ✅ 获取沟通记录成功，共${listResponse.data.data.length}条记录`);
    } else {
      throw new Error('获取沟通记录失败');
    }
  } catch (error) {
    console.log('   ❌ 家校沟通测试失败:', error.message);
    throw error;
  }
}

// 性能测试
async function testPerformance() {
  console.log('7. 性能测试...');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  const testCount = 10;
  let totalTime = 0;
  let successCount = 0;
  
  console.log(`   进行${testCount}次API调用测试...`);
  
  for (let i = 0; i < testCount; i++) {
    try {
      const start = performance.now();
      await axios.get(`${API_BASE}/students`, { headers });
      const end = performance.now();
      
      totalTime += (end - start);
      successCount++;
      
      process.stdout.write(`   ${i + 1}/${testCount} `);
    } catch (error) {
      console.log(`\n   ❌ 第${i + 1}次调用失败`);
    }
  }
  
  console.log(`\n   ✅ 性能测试完成:`);
  console.log(`     成功率: ${(successCount / testCount * 100).toFixed(1)}%`);
  console.log(`     平均响应时间: ${(totalTime / successCount).toFixed(2)}ms`);
  console.log(`     总用时: ${(totalTime / 1000).toFixed(2)}秒`);
}

// 运行测试
runTests();