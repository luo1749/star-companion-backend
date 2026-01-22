import axios from 'axios';

// 创建axios实例
const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器：添加token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器：处理错误
api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        if (error.response) {
            // 服务器返回错误状态码
            switch (error.response.status) {
                case 401:
                    // token过期，跳转到登录页
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    break;
                case 403:
                    console.error('权限不足');
                    break;
                case 404:
                    console.error('API不存在');
                    break;
                case 500:
                    console.error('服务器错误');
                    break;
            }
        }
        return Promise.reject(error);
    }
);

// API方法
const apiService = {
    // 认证
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    
    // 学生管理
    getStudents: (params) => api.get('/students', { params }),
    getStudentDetail: (id) => api.get(`/students/${id}`),
    
    // 预警管理
    getAlerts: (params) => api.get('/alerts', { params }),
    acknowledgeAlert: (id) => api.post(`/alerts/${id}/acknowledge`),
    resolveAlert: (id, data) => api.post(`/alerts/${id}/resolve`, data),
    
    // 干预方案
    getInterventions: (params) => api.get('/interventions', { params }),
    createIntervention: (data) => api.post('/interventions', data),
    
    // 家校沟通
    getCommunications: (params) => api.get('/communications', { params }),
    sendMessage: (data) => api.post('/communications', data),
    
    // 仪表板
    getDashboardStats: () => api.get('/dashboard/stats'),
    
    // 实时数据
    submitBiometricData: (data) => api.post('/biometric-data', data),
    
    // 位置数据
    submitLocation: (data) => api.post('/locations', data)
};

export default apiService;