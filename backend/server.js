const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');
const http = require('http');
const WebSocket = require('ws');
const dataSimulator = require('./utils/dataSimulator');
require('dotenv').config();

const { query, transaction, testConnection } = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件
app.use('/uploads', express.static('uploads'));

// Socket.IO 连接
io.on('connection', (socket) => {
    console.log('🔌 新的客户端连接:', socket.id);
    
    // 加入特定学生的房间
    socket.on('join-student', (studentId) => {
        socket.join(`student-${studentId}`);
        console.log(`客户端 ${socket.id} 加入学生 ${studentId} 的房间`);
    });
    
    // 离开学生房间
    socket.on('leave-student', (studentId) => {
        socket.leave(`student-${studentId}`);
    });
    
    socket.on('disconnect', () => {
        console.log('客户端断开连接:', socket.id);
    });
});

// 广播实时数据
function broadcastRealtimeData(studentId, data) {
    io.to(`student-${studentId}`).emit('realtime-data', data);
}

// 广播预警
function broadcastAlert(studentId, alert) {
    io.to(`student-${studentId}`).emit('new-alert', alert);
    io.emit('alert-notification', alert); // 广播给所有人
}

// JWT 验证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: '需要身份验证' 
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: '无效的token' 
            });
        }
        req.user = user;
        next();
    });
}

// 检查权限
function checkRole(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: '权限不足'
            });
        }
        next();
    };
}

// ==================== API 路由 ====================

// 1. 用户认证相关
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '请输入用户名和密码'
            });
        }
        
        // 查询用户
        const users = await query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        const user = users[0];
        
        // 验证密码（测试时可以使用简单验证，正式环境用bcrypt）
        let isValid = false;
        if (password === '123456' && user.password.includes('$2b$')) {
            // 测试密码
            isValid = true;
        } else {
            // 实际验证
            isValid = await bcrypt.compare(password, user.password);
        }
        
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: '密码错误'
            });
        }
        
        // 生成token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                name: user.name 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // 移除密码字段
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            message: '登录成功',
            token,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, name, role, phone, email } = req.body;
        
        // 验证必要字段
        if (!username || !password || !name || !role) {
            return res.status(400).json({
                success: false,
                message: '缺少必要字段'
            });
        }
        
        // 检查用户名是否已存在
        const existingUsers = await query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在'
            });
        }
        
        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 创建用户
        const result = await query(
            `INSERT INTO users (username, password, name, role, phone, email) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, name, role, phone, email]
        );
        
        res.json({
            success: true,
            message: '注册成功',
            userId: result.insertId
        });
        
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 2. 学生管理相关
app.get('/api/students', authenticateToken, async (req, res) => {
    try {
        let students;
        
        if (req.user.role === 'teacher') {
            // 老师只能看到自己班级的学生
            students = await query(`
                SELECT s.*, c.name as class_name, u.name as teacher_name 
                FROM students s
                LEFT JOIN classes c ON s.class_id = c.id
                LEFT JOIN users u ON s.teacher_id = u.id
                WHERE s.teacher_id = ? OR s.id IN (
                    SELECT student_id FROM classes WHERE teacher_id = ?
                )
                ORDER BY s.name
            `, [req.user.id, req.user.id]);
        } else if (req.user.role === 'parent') {
            // 家长只能看到自己的孩子
            students = await query(`
                SELECT s.*, c.name as class_name, u.name as teacher_name 
                FROM students s
                LEFT JOIN classes c ON s.class_id = c.id
                LEFT JOIN users u ON s.teacher_id = u.id
                WHERE s.parent_id = ?
                ORDER BY s.name
            `, [req.user.id]);
        } else if (req.user.role === 'admin') {
            // 管理员可以看到所有学生
            students = await query(`
                SELECT s.*, c.name as class_name, u.name as teacher_name,
                       p.name as parent_name
                FROM students s
                LEFT JOIN classes c ON s.class_id = c.id
                LEFT JOIN users u ON s.teacher_id = u.id
                LEFT JOIN users p ON s.parent_id = p.id
                ORDER BY s.name
            `);
        }
        
        // 获取每个学生的设备状态和最新数据
        for (let student of students) {
            // 设备信息
            const device = await query(
                'SELECT * FROM devices WHERE student_id = ?',
                [student.id]
            );
            student.device = device[0] || null;
            
            // 最新生理数据
            const latestData = await query(`
                SELECT * FROM biometric_data 
                WHERE student_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            `, [student.id]);
            student.latestBiometric = latestData[0] || null;
            
            // 未处理预警数量
            const alertCount = await query(`
                SELECT COUNT(*) as count FROM alerts 
                WHERE student_id = ? AND status = 'pending'
            `, [student.id]);
            student.pendingAlerts = alertCount[0]?.count || 0;
        }
        
        res.json({
            success: true,
            data: students,
            count: students.length
        });
        
    } catch (error) {
        console.error('获取学生列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取学生列表失败'
        });
    }
});

app.get('/api/students/:id', authenticateToken, async (req, res) => {
    try {
        const studentId = req.params.id;
        
        // 获取学生基本信息
        const students = await query(`
            SELECT s.*, c.name as class_name, u.name as teacher_name,
                   p.name as parent_name, p.phone as parent_phone,
                   sch.name as school_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            LEFT JOIN users u ON s.teacher_id = u.id
            LEFT JOIN users p ON s.parent_id = p.id
            LEFT JOIN schools sch ON c.school_id = sch.id
            WHERE s.id = ?
        `, [studentId]);
        
        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: '学生不存在'
            });
        }
        
        const student = students[0];
        
        // 获取设备信息
        const device = await query(
            'SELECT * FROM devices WHERE student_id = ?',
            [studentId]
        );
        student.device = device[0] || null;
        
        // 获取最新生理数据
        const latestData = await query(`
            SELECT * FROM biometric_data 
            WHERE student_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 10
        `, [studentId]);
        student.biometricHistory = latestData;
        
        // 获取今日情绪数据
        const todayEmotions = await query(`
            SELECT * FROM emotion_data 
            WHERE student_id = ? AND DATE(timestamp) = CURDATE()
            ORDER BY timestamp DESC
        `, [studentId]);
        student.emotions = todayEmotions;
        
        // 获取干预方案
        const interventions = await query(`
            SELECT i.*, u.name as created_by_name 
            FROM interventions i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE i.student_id = ? AND i.status = 'active'
            ORDER BY i.created_at DESC
        `, [studentId]);
        student.interventions = interventions;
        
        // 获取位置信息
        const locations = await query(`
            SELECT * FROM locations 
            WHERE student_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 10
        `, [studentId]);
        student.locations = locations;
        
        // 获取安全区域
        const safeZones = await query(`
            SELECT * FROM safe_zones 
            WHERE student_id = ? AND is_active = TRUE
        `, [studentId]);
        student.safeZones = safeZones;
        
        res.json({
            success: true,
            data: student
        });
        
    } catch (error) {
        console.error('获取学生详情错误:', error);
        res.status(500).json({
            success: false,
            message: '获取学生详情失败'
        });
    }
});

// 3. 实时数据相关
app.post('/api/biometric-data', async (req, res) => {
    try {
        const { device_id, student_id, heart_rate, temperature, blood_oxygen, steps, calories } = req.body;
        
        if (!device_id || !student_id) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }
        
        // 插入数据
        const result = await query(`
            INSERT INTO biometric_data 
            (device_id, student_id, heart_rate, temperature, blood_oxygen, steps, calories)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [device_id, student_id, heart_rate, temperature, blood_oxygen, steps, calories]);
        
        // 更新设备最后心跳时间
        await query(
            'UPDATE devices SET last_heartbeat = NOW(), status = "online" WHERE id = ?',
            [device_id]
        );
        
        // 检查预警规则
        const alerts = await checkAlertRules(student_id, {
            heart_rate,
            temperature,
            blood_oxygen
        });
        
        // 广播实时数据
        const realtimeData = {
            student_id,
            heart_rate,
            temperature,
            blood_oxygen,
            steps,
            calories,
            timestamp: new Date()
        };
        
        broadcastRealtimeData(student_id, realtimeData);
        
        // 如果有新预警，广播
        for (const alert of alerts) {
            broadcastAlert(student_id, alert);
        }
        
        res.json({
            success: true,
            message: '数据接收成功',
            data_id: result.insertId,
            alerts: alerts
        });
        
    } catch (error) {
        console.error('接收生理数据错误:', error);
        res.status(500).json({
            success: false,
            message: '数据接收失败'
        });
    }
});

// 4. 预警管理相关
app.get('/api/alerts', authenticateToken, async (req, res) => {
    try {
        const { status, severity, start_date, end_date, student_id } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        let queryStr = `
            SELECT a.*, s.name as student_name, s.avatar as student_avatar,
                   u1.name as acknowledged_by_name, u2.name as resolved_by_name
            FROM alerts a
            LEFT JOIN students s ON a.student_id = s.id
            LEFT JOIN users u1 ON a.acknowledged_by = u1.id
            LEFT JOIN users u2 ON a.resolved_by = u2.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // 根据用户角色过滤
        if (userRole === 'teacher') {
            queryStr += ' AND (s.teacher_id = ? OR a.student_id IN (SELECT student_id FROM classes WHERE teacher_id = ?))';
            params.push(userId, userId);
        } else if (userRole === 'parent') {
            queryStr += ' AND s.parent_id = ?';
            params.push(userId);
        }
        
        // 其他过滤条件
        if (status) {
            queryStr += ' AND a.status = ?';
            params.push(status);
        }
        
        if (severity) {
            queryStr += ' AND a.severity = ?';
            params.push(severity);
        }
        
        if (student_id) {
            queryStr += ' AND a.student_id = ?';
            params.push(student_id);
        }
        
        if (start_date) {
            queryStr += ' AND DATE(a.created_at) >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            queryStr += ' AND DATE(a.created_at) <= ?';
            params.push(end_date);
        }
        
        queryStr += ' ORDER BY a.created_at DESC LIMIT 100';
        
        const alerts = await query(queryStr, params);
        
        res.json({
            success: true,
            data: alerts,
            count: alerts.length
        });
        
    } catch (error) {
        console.error('获取预警列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取预警列表失败'
        });
    }
});

app.post('/api/alerts/:id/acknowledge', authenticateToken, async (req, res) => {
    try {
        const alertId = req.params.id;
        const userId = req.user.id;
        
        const result = await query(`
            UPDATE alerts 
            SET status = 'processing', 
                acknowledged_by = ?, 
                acknowledged_at = NOW()
            WHERE id = ? AND status = 'pending'
        `, [userId, alertId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '预警不存在或已处理'
            });
        }
        
        // 获取更新后的预警信息
        const updatedAlert = await query(
            'SELECT * FROM alerts WHERE id = ?',
            [alertId]
        );
        
        // 广播更新
        if (updatedAlert[0]) {
            io.emit('alert-updated', updatedAlert[0]);
        }
        
        res.json({
            success: true,
            message: '预警已确认处理',
            data: updatedAlert[0]
        });
        
    } catch (error) {
        console.error('确认预警错误:', error);
        res.status(500).json({
            success: false,
            message: '处理预警失败'
        });
    }
});

app.post('/api/alerts/:id/resolve', authenticateToken, async (req, res) => {
    try {
        const alertId = req.params.id;
        const userId = req.user.id;
        const { resolution_notes } = req.body;
        
        const result = await query(`
            UPDATE alerts 
            SET status = 'resolved', 
                resolved_by = ?, 
                resolved_at = NOW(),
                message = CONCAT(message, ' | 处理备注: ', ?)
            WHERE id = ? AND status IN ('pending', 'processing')
        `, [userId, resolution_notes || '已处理', alertId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '预警不存在或已解决'
            });
        }
        
        res.json({
            success: true,
            message: '预警已解决'
        });
        
    } catch (error) {
        console.error('解决预警错误:', error);
        res.status(500).json({
            success: false,
            message: '解决预警失败'
        });
    }
});

// 5. 干预方案相关
app.get('/api/interventions', authenticateToken, async (req, res) => {
    try {
        const { student_id, status, type } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        let queryStr = `
            SELECT i.*, s.name as student_name, u.name as created_by_name
            FROM interventions i
            LEFT JOIN students s ON i.student_id = s.id
            LEFT JOIN users u ON i.created_by = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // 根据用户角色过滤
        if (userRole === 'teacher') {
            queryStr += ' AND (i.created_by = ? OR s.teacher_id = ?)';
            params.push(userId, userId);
        } else if (userRole === 'parent') {
            queryStr += ' AND s.parent_id = ?';
            params.push(userId);
        }
        
        if (student_id) {
            queryStr += ' AND i.student_id = ?';
            params.push(student_id);
        }
        
        if (status) {
            queryStr += ' AND i.status = ?';
            params.push(status);
        }
        
        if (type) {
            queryStr += ' AND i.type = ?';
            params.push(type);
        }
        
        queryStr += ' ORDER BY i.created_at DESC';
        
        const interventions = await query(queryStr, params);
        
        // 获取每个方案的执行记录
        for (let intervention of interventions) {
            const records = await query(`
                SELECT * FROM intervention_records 
                WHERE intervention_id = ?
                ORDER BY start_time DESC
                LIMIT 5
            `, [intervention.id]);
            
            intervention.records = records;
            
            // 计算平均效果评分
            const avgScore = await query(`
                SELECT AVG(effectiveness_score) as avg_score 
                FROM intervention_records 
                WHERE intervention_id = ?
            `, [intervention.id]);
            
            intervention.avgEffectiveness = avgScore[0]?.avg_score || 0;
        }
        
        res.json({
            success: true,
            data: interventions,
            count: interventions.length
        });
        
    } catch (error) {
        console.error('获取干预方案错误:', error);
        res.status(500).json({
            success: false,
            message: '获取干预方案失败'
        });
    }
});

app.post('/api/interventions', authenticateToken, checkRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { student_id, title, description, type, duration_minutes, frequency, schedule, resources } = req.body;
        
        if (!student_id || !title || !type) {
            return res.status(400).json({
                success: false,
                message: '缺少必要字段'
            });
        }
        
        const result = await query(`
            INSERT INTO interventions 
            (student_id, title, description, type, duration_minutes, frequency, schedule, resources, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [student_id, title, description, type, duration_minutes, frequency, 
            schedule ? JSON.stringify(schedule) : null, resources, req.user.id]);
        
        res.json({
            success: true,
            message: '干预方案创建成功',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('创建干预方案错误:', error);
        res.status(500).json({
            success: false,
            message: '创建干预方案失败'
        });
    }
});

// 6. 家校沟通相关
app.get('/api/communications', authenticateToken, async (req, res) => {
    try {
        const { student_id, type, unread_only } = req.query;
        const userId = req.user.id;
        
        let queryStr = `
            SELECT c.*, s.name as student_name,
                   u1.name as sender_name, u2.name as receiver_name
            FROM communications c
            LEFT JOIN students s ON c.student_id = s.id
            LEFT JOIN users u1 ON c.sender_id = u1.id
            LEFT JOIN users u2 ON c.receiver_id = u2.id
            WHERE (c.sender_id = ? OR c.receiver_id = ?)
        `;
        
        const params = [userId, userId];
        
        if (student_id) {
            queryStr += ' AND c.student_id = ?';
            params.push(student_id);
        }
        
        if (type) {
            queryStr += ' AND c.type = ?';
            params.push(type);
        }
        
        if (unread_only === 'true') {
            queryStr += ' AND c.is_read = FALSE AND c.receiver_id = ?';
            params.push(userId);
        }
        
        queryStr += ' ORDER BY c.created_at DESC LIMIT 50';
        
        const communications = await query(queryStr, params);
        
        res.json({
            success: true,
            data: communications,
            count: communications.length
        });
        
    } catch (error) {
        console.error('获取沟通记录错误:', error);
        res.status(500).json({
            success: false,
            message: '获取沟通记录失败'
        });
    }
});

app.post('/api/communications', authenticateToken, async (req, res) => {
    try {
        const { receiver_id, student_id, type, title, content } = req.body;
        
        if (!receiver_id || !student_id || !content) {
            return res.status(400).json({
                success: false,
                message: '缺少必要字段'
            });
        }
        
        const result = await query(`
            INSERT INTO communications 
            (sender_id, receiver_id, student_id, type, title, content)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.user.id, receiver_id, student_id, type || 'normal', title, content]);
        
        // 通知接收者
        io.to(`user-${receiver_id}`).emit('new-message', {
            id: result.insertId,
            sender_id: req.user.id,
            title,
            content
        });
        
        res.json({
            success: true,
            message: '消息发送成功',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('发送消息错误:', error);
        res.status(500).json({
            success: false,
            message: '发送消息失败'
        });
    }
});

// 7. 统计和仪表板数据
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        let stats = {};
        
        // 根据用户角色获取统计
        if (userRole === 'teacher') {
            // 老师统计
            const studentCount = await query(`
                SELECT COUNT(*) as count FROM students 
                WHERE teacher_id = ? OR id IN (
                    SELECT student_id FROM classes WHERE teacher_id = ?
                )
            `, [userId, userId]);
            
            const todayAlerts = await query(`
                SELECT COUNT(*) as count FROM alerts a
                LEFT JOIN students s ON a.student_id = s.id
                WHERE DATE(a.created_at) = CURDATE() 
                AND (s.teacher_id = ? OR a.student_id IN (
                    SELECT student_id FROM classes WHERE teacher_id = ?
                ))
            `, [userId, userId]);
            
            const activeInterventions = await query(`
                SELECT COUNT(*) as count FROM interventions i
                LEFT JOIN students s ON i.student_id = s.id
                WHERE i.status = 'active'
                AND (s.teacher_id = ? OR i.student_id IN (
                    SELECT student_id FROM classes WHERE teacher_id = ?
                ))
            `, [userId, userId]);
            
            const unreadMessages = await query(`
                SELECT COUNT(*) as count FROM communications
                WHERE receiver_id = ? AND is_read = FALSE
            `, [userId]);
            
            stats = {
                studentCount: studentCount[0]?.count || 0,
                todayAlerts: todayAlerts[0]?.count || 0,
                activeInterventions: activeInterventions[0]?.count || 0,
                unreadMessages: unreadMessages[0]?.count || 0
            };
            
        } else if (userRole === 'parent') {
            // 家长统计
            const studentCount = await query(
                'SELECT COUNT(*) as count FROM students WHERE parent_id = ?',
                [userId]
            );
            
            const todayAlerts = await query(`
                SELECT COUNT(*) as count FROM alerts a
                LEFT JOIN students s ON a.student_id = s.id
                WHERE DATE(a.created_at) = CURDATE() AND s.parent_id = ?
            `, [userId]);
            
            const unreadMessages = await query(`
                SELECT COUNT(*) as count FROM communications
                WHERE receiver_id = ? AND is_read = FALSE
            `, [userId]);
            
            stats = {
                studentCount: studentCount[0]?.count || 0,
                todayAlerts: todayAlerts[0]?.count || 0,
                activeInterventions: 0, // 家长不创建干预方案
                unreadMessages: unreadMessages[0]?.count || 0
            };
            
        } else if (userRole === 'admin') {
            // 管理员统计
            const totalStats = await query(`
                SELECT 
                    (SELECT COUNT(*) FROM students) as totalStudents,
                    (SELECT COUNT(*) FROM alerts WHERE DATE(created_at) = CURDATE()) as todayAlerts,
                    (SELECT COUNT(*) FROM interventions WHERE status = 'active') as activeInterventions,
                    (SELECT COUNT(*) FROM devices WHERE status = 'online') as onlineDevices
            `);
            
            stats = totalStats[0];
        }
        
        // 获取最近活动
        const recentActivities = await query(`
            (SELECT 'alert' as type, a.id, a.title, a.created_at, s.name as student_name
             FROM alerts a
             LEFT JOIN students s ON a.student_id = s.id
             WHERE a.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY a.created_at DESC LIMIT 5)
            UNION
            (SELECT 'intervention' as type, i.id, i.title, i.created_at, s.name as student_name
             FROM interventions i
             LEFT JOIN students s ON i.student_id = s.id
             WHERE i.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY i.created_at DESC LIMIT 5)
            ORDER BY created_at DESC LIMIT 10
        `);
        
        // 获取预警趋势
        const alertTrend = await query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM alerts
            WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);
        
        res.json({
            success: true,
            data: {
                stats,
                recentActivities,
                alertTrend
            }
        });
        
    } catch (error) {
        console.error('获取仪表板统计错误:', error);
        res.status(500).json({
            success: false,
            message: '获取统计信息失败'
        });
    }
});

// 8. 位置追踪相关
app.post('/api/locations', async (req, res) => {
    try {
        const { device_id, student_id, latitude, longitude, address, accuracy, battery_level } = req.body;
        
        if (!device_id || !student_id || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }
        
        const result = await query(`
            INSERT INTO locations 
            (device_id, student_id, latitude, longitude, address, accuracy, battery_level)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [device_id, student_id, latitude, longitude, address, accuracy, battery_level]);
        
        // 检查是否离开安全区域
        await checkSafeZone(student_id, latitude, longitude);
        
        // 广播位置更新
        io.emit('location-update', {
            student_id,
            latitude,
            longitude,
            address,
            timestamp: new Date()
        });
        
        res.json({
            success: true,
            message: '位置数据接收成功'
        });
        
    } catch (error) {
        console.error('接收位置数据错误:', error);
        res.status(500).json({
            success: false,
            message: '位置数据接收失败'
        });
    }
});

// ==================== 辅助函数 ====================

// 检查预警规则
async function checkAlertRules(studentId, data) {
    const newAlerts = [];
    
    // 获取所有活跃的预警规则
    const rules = await query(
        'SELECT * FROM alert_rules WHERE is_active = TRUE'
    );
    
    for (const rule of rules) {
        let shouldAlert = false;
        let dataValue = null;
        
        switch (rule.condition_field) {
            case 'heart_rate':
                if (data.heart_rate) {
                    dataValue = data.heart_rate;
                    shouldAlert = checkCondition(data.heart_rate, rule);
                }
                break;
                
            case 'temperature':
                if (data.temperature) {
                    dataValue = data.temperature;
                    shouldAlert = checkCondition(data.temperature, rule);
                }
                break;
                
            case 'blood_oxygen':
                if (data.blood_oxygen) {
                    dataValue = data.blood_oxygen;
                    shouldAlert = checkCondition(data.blood_oxygen, rule);
                }
                break;
        }
        
        if (shouldAlert) {
            // 创建预警
            const alert = {
                student_id: studentId,
                rule_id: rule.id,
                alert_type: rule.rule_type,
                title: rule.rule_name,
                message: `触发预警规则: ${rule.rule_name}`,
                severity: rule.severity,
                data_value: dataValue,
                threshold: rule.condition_value1,
                status: 'pending'
            };
            
            const result = await query(`
                INSERT INTO alerts 
                (student_id, rule_id, alert_type, title, message, severity, data_value, threshold, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [alert.student_id, alert.rule_id, alert.alert_type, alert.title, 
                alert.message, alert.severity, alert.data_value, alert.threshold, alert.status]);
            
            alert.id = result.insertId;
            newAlerts.push(alert);
        }
    }
    
    return newAlerts;
}

// 检查条件
function checkCondition(value, rule) {
    const numValue = parseFloat(value);
    const numThreshold1 = parseFloat(rule.condition_value1);
    const numThreshold2 = rule.condition_value2 ? parseFloat(rule.condition_value2) : null;
    
    switch (rule.condition_operator) {
        case '>': return numValue > numThreshold1;
        case '<': return numValue < numThreshold1;
        case '=': return numValue === numThreshold1;
        case '>=': return numValue >= numThreshold1;
        case '<=': return numValue <= numThreshold1;
        case '!=': return numValue !== numThreshold1;
        case 'between': 
            return numThreshold2 && numValue >= numThreshold1 && numValue <= numThreshold2;
        default: return false;
    }
}

// 检查安全区域
async function checkSafeZone(studentId, latitude, longitude) {
    try {
        const safeZones = await query(`
            SELECT * FROM safe_zones 
            WHERE student_id = ? AND is_active = TRUE
        `, [studentId]);
        
        for (const zone of safeZones) {
            const distance = calculateDistance(
                latitude, longitude,
                zone.center_latitude, zone.center_longitude
            );
            
            if (distance > zone.radius_meters) {
                // 离开安全区域，创建预警
                const alert = {
                    student_id: studentId,
                    rule_id: null,
                    alert_type: 'location',
                    title: '离开安全区域',
                    message: `离开${zone.zone_name}安全区域，距离${Math.round(distance)}米`,
                    severity: 'critical',
                    data_value: `${Math.round(distance)}米`,
                    threshold: `${zone.radius_meters}米`,
                    status: 'pending'
                };
                
                await query(`
                    INSERT INTO alerts 
                    (student_id, rule_id, alert_type, title, message, severity, data_value, threshold, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [alert.student_id, alert.rule_id, alert.alert_type, alert.title, 
                    alert.message, alert.severity, alert.data_value, alert.threshold, alert.status]);
                
                broadcastAlert(studentId, alert);
            }
        }
    } catch (error) {
        console.error('检查安全区域错误:', error);
    }
}

// 计算两点间距离（简化版）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 地球半径（米）
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(value) {
    return value * Math.PI / 180;
}

// ==================== 服务器启动 ====================

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API 文档
app.get('/api/docs', (req, res) => {
    res.json({
        name: '星伴平台 API',
        version: '1.0.0',
        endpoints: {
            auth: {
                login: 'POST /api/auth/login',
                register: 'POST /api/auth/register'
            },
            students: {
                list: 'GET /api/students',
                detail: 'GET /api/students/:id'
            },
            biometric: 'POST /api/biometric-data',
            alerts: {
                list: 'GET /api/alerts',
                acknowledge: 'POST /api/alerts/:id/acknowledge',
                resolve: 'POST /api/alerts/:id/resolve'
            },
            interventions: {
                list: 'GET /api/interventions',
                create: 'POST /api/interventions'
            },
            communications: {
                list: 'GET /api/communications',
                create: 'POST /api/communications'
            },
            dashboard: 'GET /api/dashboard/stats',
            locations: 'POST /api/locations'
        }
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API 端点不存在'
    });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 启动服务器
async function startServer() {
    try {
      // 初始化模拟器
dataSimulator.initialize();

// 模拟器控制接口
app.post('/api/simulator/start', authenticateToken, checkRole(['admin']), async (req, res) => {
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

app.post('/api/simulator/stop', authenticateToken, checkRole(['admin']), (req, res) => {
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

app.get('/api/simulator/status', authenticateToken, checkRole(['admin']), (req, res) => {
  res.json({
    success: true,
    data: {
      isRunning: dataSimulator.isRunning,
      studentCount: dataSimulator.students.length,
      deviceCount: dataSimulator.devices.length
    }
  });
});

// 生成单次数据
app.post('/api/simulator/generate-once', authenticateToken, checkRole(['admin']), async (req, res) => {
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
        // 测试数据库连接
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ 无法连接到数据库，请检查配置');
            process.exit(1);
        }
        
        server.listen(PORT, () => {
            console.log('🚀 星伴平台后端服务器已启动');
            console.log(`📡 地址：http://localhost:${PORT}`);
            console.log(`📊 API文档：http://localhost:${PORT}/api/docs`);
            console.log(`❤️  健康检查：http://localhost:${PORT}/health`);
            console.log('\n🔑 测试账号：');
            console.log('   管理员：admin / 123456');
            console.log('   老师：teacher_zhang / 123456');
            console.log('   家长：parent_li / 123456');
            console.log('\n💡 使用说明：');
            console.log('   1. 使用Postman测试API');
            console.log('   2. 访问管理后台：http://localhost:5173');
            console.log('   3. 查看数据库：MySQL Workbench');
            const wss = new WebSocket.Server({ server: server });
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
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && 
        client.subscribedStudentId === studentId) {
      client.send(JSON.stringify(message));
    }
  });
}

// 在适当位置导出broadcastToStudent
module.exports = {
  // ... 其他导出
  broadcastToStudent
};
        });
        
    } catch (error) {
        console.error('启动服务器失败:', error);
        process.exit(1);
    }
}

startServer();