// 纯内存模拟数据库，零依赖（完全保留原有逻辑）
const dbData = {
  test: []
};

// 测试连接（内存数据库）
function testConnection() {
  console.log('✅ 内存数据库连接成功');
  return true;
}

// 通用查询方法（内存数据库）
function query(table, params = {}) {
  let data = dbData[table] || [];
  if (params.where) {
    data = data.filter(item => {
      for (const key in params.where) {
        if (item[key] !== params.where[key]) return false;
      }
      return true;
    });
  }
  return data;
}

// 通用插入方法（内存数据库）
function insert(table, data) {
  if (!dbData[table]) dbData[table] = [];
  dbData[table].push(data);
  return data;
}

// ===================== 新增：Supabase PostgreSQL 适配 =====================
// 注意：PostgreSQL需要使用pg库，而非mysql库（mysql库仅支持MySQL）
const { Pool } = require('pg'); // 引入pg库（需先安装：npm install pg）

// 生产环境PostgreSQL连接池（兼容环境变量，默认值与Supabase一致）
const pgPool = new Pool({
  host: process.env.DB_HOST || 'db.xovktsgrkwpihkbammmb.supabase.co', // 你的Supabase Host
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '', // 需在环境变量中配置你的Supabase密码
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // 对应mysql的connectionLimit
  idleTimeoutMillis: 30000
});

// PostgreSQL测试连接方法
async function testPgConnection() {
  try {
    const client = await pgPool.connect();
    await client.query('SELECT NOW()'); // 测试查询
    client.release();
    console.log('✅ PostgreSQL数据库连接成功');
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL连接失败：', err.message);
    return false;
  }
}

// PostgreSQL通用查询方法（适配原有query方法的参数格式）
async function pgQuery(table, params = {}) {
  try {
    // 基础查询语句
    let sql = `SELECT * FROM ${table}`;
    let queryParams = [];

    // 处理where条件（适配原有params.where格式）
    if (params.where) {
      const whereKeys = Object.keys(params.where);
      if (whereKeys.length > 0) {
        sql += ` WHERE ${whereKeys.map((key, idx) => `${key} = $${idx + 1}`).join(' AND ')}`;
        queryParams = whereKeys.map(key => params.where[key]);
      }
    }

    const res = await pgPool.query(sql, queryParams);
    return res.rows; // PostgreSQL返回的结果在rows中
  } catch (err) {
    console.error('PostgreSQL查询失败：', err.message);
    return [];
  }
}

// PostgreSQL通用插入方法（适配原有insert方法的参数格式）
async function pgInsert(table, data) {
  try {
    const keys = Object.keys(data);
    const values = keys.map(key => data[key]);
    // 构建插入语句（使用参数化查询防止SQL注入）
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, idx) => `$${idx + 1}`).join(', ')}) RETURNING *`;
    
    const res = await pgPool.query(sql, values);
    return res.rows[0]; // 返回插入的记录
  } catch (err) {
    console.error('PostgreSQL插入失败：', err.message);
    return null;
  }
}

// 导出：保留原有内存数据库方法，新增PostgreSQL方法
module.exports = {
  // 原有内存数据库导出（完全保留）
  db: dbData,
  query,
  insert,
  testConnection,

  // 新增PostgreSQL相关方法
  pgPool,
  testPgConnection,
  pgQuery,
  pgInsert,

  // 可选：导出环境判断方法，方便业务代码切换数据库
  getDbClient: () => {
    return process.env.NODE_ENV === 'production' 
      ? { query: pgQuery, insert: pgInsert, testConnection: testPgConnection }
      : { query, insert, testConnection };
  }
};

// 调用测试（默认测试内存数据库，生产环境可注释）
testConnection();
// 如需测试PostgreSQL，取消注释（需先配置DB_PASSWORD环境变量）
// testPgConnection();