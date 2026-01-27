// 纯内存模拟数据库，零依赖
const dbData = {
  test: []
};

// 测试连接
function testConnection() {
  console.log('✅ 内存数据库连接成功');
  return true;
}

// 通用查询方法
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

// 通用插入方法
function insert(table, data) {
  if (!dbData[table]) dbData[table] = [];
  dbData[table].push(data);
  return data;
}

module.exports = {
  db: dbData,
  query,
  insert,
  testConnection
};

// 调用测试
testConnection();
