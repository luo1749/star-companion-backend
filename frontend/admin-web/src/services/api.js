import axios from 'axios';

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

const apiService = {
    login: async (credentials) => {
        const { username, password, role } = credentials;
        const demoAccounts = {
            admin: { password: '123456', role: 'admin', name: '系统管理员' },
            teacher_zhang: { password: '123456', role: 'teacher', name: '张老师' },
            parent_li: { password: '123456', role: 'parent', name: '李家长' }
        };

        if (demoAccounts[username] && demoAccounts[username].password === password) {
            return {
                success: true,
                token: 'fake-token-' + Date.now(),
                user: { username, role, name: demoAccounts[username].name },
                message: '登录成功'
            };
        } else {
            return {
                success: false,
                message: '用户名或密码错误'
            };
        }
    },
    register: (userData) => api.post('/auth/register', userData), 
    
    getStudents: (params) => api.get('/students', { params }), 
    getStudentDetail: (id) => api.get(`/students/${id}`), 
    
    getAlerts: (params) => api.get('/alerts', { params }), 
    acknowledgeAlert: (id) => api.post(`/alerts/${id}/handle`), 
    resolveAlert: (id, data) => api.post(`/alerts/${id}/handle`, data), 
    
    getInterventions: (params) => api.get('/interventions', { params }), 
    createIntervention: (data) => api.post('/interventions', data), 
    
    getCommunications: (params) => api.get('/communications', { params }), 
    sendMessage: (data) => api.post('/communications', data), 
    
    getDashboardStats: () => api.get('/dashboard/stats'), 
    
    submitBiometricData: (data) => api.post('/biometric-data', data), 
    submitLocation: (data) => api.post('/locations', data), 
    
    getRealtimeData: () => api.get('/realtime')
};

export default apiService;