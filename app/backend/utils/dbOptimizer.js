const { query } = require('../config/db');

class DatabaseOptimizer {
  constructor() {
    this.optimizations = [];
  }

  async analyzeDatabase() {
    console.log('🔍 开始数据库分析...\n');
    
    const analysis = {
      tableCount: 0,
      totalRows: 0,
      indexIssues: [],
      performanceIssues: [],
      suggestions: []
    };

    try {
      // 获取所有表信息
      const tables = await query(`
        SELECT 
          table_name,
          table_rows,
          data_length,
          index_length,
          (data_length + index_length) as total_size
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY total_size DESC
      `);

      analysis.tableCount = tables.length;
      
      console.log(`📊 数据库概况:`);
      console.log(`   表数量: ${tables.length}`);
      
      for (const table of tables) {
        analysis.totalRows += parseInt(table.table_rows);
        
        console.log(`\n   表: ${table.table_name}`);
        console.log(`     行数: ${table.table_rows.toLocaleString()}`);
        console.log(`     数据大小: ${this.formatBytes(table.data_length)}`);
        console.log(`     索引大小: ${this.formatBytes(table.index_length)}`);
        console.log(`     总大小: ${this.formatBytes(table.total_size)}`);

        // 分析索引
        await this.analyzeTableIndexes(table.table_name, analysis);
        
        // 分析表结构
        await this.analyzeTableStructure(table.table_name, analysis);
      }

      console.log(`\n📈 总行数: ${analysis.totalRows.toLocaleString()}`);
      
      // 输出问题和建议
      this.printRecommendations(analysis);
      
      return analysis;
      
    } catch (error) {
      console.error('数据库分析失败:', error);
      throw error;
    }
  }

  async analyzeTableIndexes(tableName, analysis) {
    try {
      const indexes = await query(`
        SHOW INDEX FROM ${tableName}
      `);

      const indexStats = {};
      
      for (const index of indexes) {
        if (!indexStats[index.Key_name]) {
          indexStats[index.Key_name] = {
            columns: [],
            non_unique: index.Non_unique,
            cardinality: index.Cardinality
          };
        }
        indexStats[index.Key_name].columns.push(index.Column_name);
      }

      // 检查缺少的索引
      const tableRows = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = tableRows[0].count;
      
      Object.entries(indexStats).forEach(([indexName, stats]) => {
        if (stats.non_unique === 1 && stats.cardinality < rowCount * 0.1) {
          // 低选择性索引
          analysis.indexIssues.push({
            table: tableName,
            issue: '低效索引',
            details: `索引 ${indexName} 选择性过低 (${stats.cardinality}/${rowCount})`,
            recommendation: '考虑优化或删除此索引'
          });
        }
      });

    } catch (error) {
      console.error(`分析表 ${tableName} 索引失败:`, error);
    }
  }

  async analyzeTableStructure(tableName, analysis) {
    try {
      const columns = await query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          extra
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
          AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `);

      // 检查可能的问题
      for (const column of columns) {
        // 检查可为空的字段
        if (column.is_nullable === 'YES' && column.column_name.includes('_id')) {
          analysis.suggestions.push({
            table: tableName,
            column: column.column_name,
            suggestion: '外键字段应设置为NOT NULL'
          });
        }

        // 检查过长的VARCHAR
        if (column.data_type.startsWith('varchar') && column.data_type.includes('255')) {
          analysis.suggestions.push({
            table: tableName,
            column: column.column_name,
            suggestion: '考虑优化VARCHAR长度以减少存储空间'
          });
        }
      }

    } catch (error) {
      console.error(`分析表 ${tableName} 结构失败:`, error);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printRecommendations(analysis) {
    console.log('\n🎯 优化建议:');
    console.log('='.repeat(50));

    if (analysis.indexIssues.length > 0) {
      console.log('\n🔧 索引问题:');
      analysis.indexIssues.forEach(issue => {
        console.log(`   • ${issue.table}: ${issue.details}`);
        console.log(`     建议: ${issue.recommendation}`);
      });
    }

    if (analysis.suggestions.length > 0) {
      console.log('\n💡 结构优化建议:');
      analysis.suggestions.forEach(suggestion => {
        console.log(`   • ${suggestion.table}.${suggestion.column}: ${suggestion.suggestion}`);
      });
    }

    if (analysis.indexIssues.length === 0 && analysis.suggestions.length === 0) {
      console.log('✅ 数据库结构良好，无需优化');
    }

    // 通用建议
    console.log('\n📋 通用建议:');
    console.log('   1. 定期清理历史数据');
    console.log('   2. 为常用查询字段添加索引');
    console.log('   3. 考虑对大表进行分区');
    console.log('   4. 定期执行OPTIMIZE TABLE');
  }

  async optimizeSlowQueries() {
    console.log('\n🐌 分析慢查询...');
    
    try {
      // 启用慢查询日志（如果未启用）
      await query(`SET GLOBAL slow_query_log = 'ON'`);
      await query(`SET GLOBAL long_query_time = 2`);
      
      // 获取慢查询（需要MySQL配置支持）
      const slowQueries = await query(`
        SELECT 
          query,
          db,
          exec_time,
          lock_time,
          rows_sent,
          rows_examined
        FROM mysql.slow_log 
        WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 DAY)
        ORDER BY exec_time DESC
        LIMIT 10
      `);

      if (slowQueries.length > 0) {
        console.log('发现慢查询:');
        slowQueries.forEach((query, index) => {
          console.log(`\n${index + 1}. ${query.db}`);
          console.log(`   查询: ${query.query.substring(0, 100)}...`);
          console.log(`   执行时间: ${query.exec_time}s`);
          console.log(`   锁定时间: ${query.lock_time}s`);
          console.log(`   返回行数: ${query.rows_sent}`);
          console.log(`   扫描行数: ${query.rows_examined}`);
        });
      } else {
        console.log('✅ 未发现慢查询');
      }
      
    } catch (error) {
      console.log('无法获取慢查询日志，请检查MySQL配置');
    }
  }
}

// 使用示例
async function runOptimization() {
  const optimizer = new DatabaseOptimizer();
  
  try {
    await optimizer.analyzeDatabase();
    await optimizer.optimizeSlowQueries();
  } catch (error) {
    console.error('优化失败:', error);
  }
}

// 导出
module.exports = DatabaseOptimizer;

// 运行优化
if (require.main === module) {
  runOptimization();
}