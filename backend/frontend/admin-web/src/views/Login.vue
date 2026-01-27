<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>🌟 星伴平台</h1>
        <p>特殊学生健康管理系统</p>
      </div>
      
      <div class="login-form">
        <div class="form-group">
          <label>用户名</label>
          <input 
            v-model="form.username" 
            type="text" 
            placeholder="请输入用户名"
            @keyup.enter="login"
          />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码"
            @keyup.enter="login"
          />
        </div>
        
        <div class="form-group">
          <label>角色</label>
          <select v-model="form.role" class="role-select">
            <option value="teacher">老师</option>
            <option value="parent">家长</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        
        <button class="login-btn" @click="login" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
        
        <div class="login-footer">
          <p class="error-message" v-if="errorMessage">{{ errorMessage }}</p>
          <p class="demo-info">
            <strong>演示账号：</strong><br>
            管理员: admin / 123456<br>
            老师: teacher_zhang / 123456<br>
            家长: parent_li / 123456
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import apiService from '../services/api';

export default {
  name: 'Login',
  data() {
    return {
      form: {
        username: '',
        password: '',
        role: 'teacher'
      },
      loading: false,
      errorMessage: ''
    };
  },
  mounted() {
    // 检查是否已登录
    const token = localStorage.getItem('token');
    if (token) {
      this.$router.push('/');
    }
  },
  methods: {
    async login() {
      if (!this.form.username || !this.form.password) {
        this.errorMessage = '请输入用户名和密码';
        return;
      }
      
      this.loading = true;
      this.errorMessage = '';
      
      try {
        const response = await apiService.login(this.form);
        
        if (response.success) {
          // 保存token和用户信息
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          // 跳转到首页
          this.$router.push('/');
        } else {
          this.errorMessage = response.message || '登录失败';
        }
      } catch (error) {
        this.errorMessage = error.response?.data?.message || '网络错误，请检查后端服务';
        console.error('登录错误:', error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  background: white;
  border-radius: 15px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}

.login-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px 20px;
  text-align: center;
}

.login-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: bold;
}

.login-header p {
  margin: 10px 0 0;
  opacity: 0.9;
  font-size: 14px;
}

.login-form {
  padding: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.role-select {
  background: white;
  cursor: pointer;
}

.login-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 10px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 25px;
  text-align: center;
}

.error-message {
  color: #f44336;
  font-size: 14px;
  margin-bottom: 15px;
  padding: 10px;
  background: #ffebee;
  border-radius: 5px;
}

.demo-info {
  font-size: 12px;
  color: #666;
  line-height: 1.6;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 5px;
  margin-top: 20px;
}

.demo-info strong {
  color: #333;
}
</style>