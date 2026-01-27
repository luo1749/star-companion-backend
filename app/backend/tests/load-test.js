const autocannon = require('autocannon');
const { performance } = require('perf_hooks');

async function runLoadTest() {
  console.log('🚀 开始负载测试...\n');
  
  const testConfigs = [
    {
      name: '获取学生列表',
      url: 'http://localhost:3000/api/students',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer your_test_token_here',
        'Content-Type': 'application/json'
      }
    },
    {
      name: '获取预警列表',
      url: 'http://localhost:3000/api/alerts',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer your_test_token_here',
        'Content-Type': 'application/json'
      }
    },
    {
      name: '提交心率数据',
      url: 'http://localhost:3000/api/biometric-data',
      method: 'POST',
      body: JSON.stringify({
        device_id: 'TEST001',
        student_id: 1,
        heart_rate: 85,
        temperature: 36.5,
        blood_oxygen: 98
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  ];
  
  for (const config of testConfigs) {
    console.log(`📊 测试: ${config.name}`);
    console.log('='.repeat(50));
    
    const result = await autocannon({
      url: config.url,
      method: config.method,
      headers: config.headers,
      body: config.body,
      connections: 10, // 并发连接数
      pipelining: 1, // 流水线请求数
      duration: 10, // 测试时长(秒)
      timeout: 30 // 超时时间(秒)
    });
    
    printResults(result);
    console.log('\n');
  }
}

function printResults(result) {
  console.log(`✅ 测试完成:`);
  console.log(`   总请求数: ${result.requests.total}`);
  console.log(`   总吞吐量: ${result.throughput.total} bytes`);
  console.log(`   平均响应时间: ${result.latency.average}ms`);
  console.log(`   最小响应时间: ${result.latency.min}ms`);
  console.log(`   最大响应时间: ${result.latency.max}ms`);
  console.log(`   请求错误数: ${result.errors}`);
  console.log(`   非2xx响应数: ${result['2xx'] ? result.requests.total - result['2xx'] : 'N/A'}`);
  
  // 百分位数
  if (result.latency.p50) {
    console.log(`   50%响应时间: ${result.latency.p50}ms`);
    console.log(`   90%响应时间: ${result.latency.p90}ms`);
    console.log(`   99%响应时间: ${result.latency.p99}ms`);
  }
}

// 安装autocannon
// npm install -g autocannon

runLoadTest().catch(console.error);