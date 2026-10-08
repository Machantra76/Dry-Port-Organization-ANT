const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ការតភ្ជាប់ PostgreSQL Database (ឧ. Neon Database)[cite: 7]
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/hr_db',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// មុខងារសម្រាប់បង្កើត Tables ក្នុង Database ដោយស្វ័យប្រវត្តិពេល Start Server
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ១. តារាងបុគ្គលិក (Employees)
        await client.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                employee_code VARCHAR(50) UNIQUE NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                department VARCHAR(100) NOT NULL,
                position VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២. តារាងកត់ត្រាវត្តមាន (Attendance Logs)
        await client.query(`
            CREATE TABLE IF NOT EXISTS attendance_logs (
                id SERIAL PRIMARY KEY,
                employee_code VARCHAR(50) NOT NULL,
                work_date DATE NOT NULL,
                check_in_time TIMESTAMP,
                check_out_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ៣. តារាងទ្រព្យសម្បត្តិ និងស្តុក (Inventory & Assets)
        await client.query(`
            CREATE TABLE IF NOT EXISTS inventory_items (
                id SERIAL PRIMARY KEY,
                item_code VARCHAR(50) UNIQUE NOT NULL,
                item_name VARCHAR(150) NOT NULL,
                category VARCHAR(100) NOT NULL,
                quantity INT NOT NULL DEFAULT 0,
                unit VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Available',
                holder_or_location VARCHAR(150),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ៤. តារាងដំណើរការប្រាក់បៀវត្សរ៍ (Payroll Records)
        await client.query(`
            CREATE TABLE IF NOT EXISTS payroll_records (
                id SERIAL PRIMARY KEY,
                employee_code VARCHAR(50) NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
                allowance NUMERIC(10, 2) NOT NULL DEFAULT 0,
                deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
                net_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
                pay_month VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ៥. [ថ្មី] តារាងគណនេយ្យប្រាក់ចំណូល (Revenues)
        await client.query(`
            CREATE TABLE IF NOT EXISTS revenues (
                id SERIAL PRIMARY KEY,
                revenue_date DATE NOT NULL,
                category VARCHAR(150) NOT NULL,
                description TEXT,
                amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
                received_by VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        console.log('Database tables initialized successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error initializing database tables:', err);
    } finally {
        client.release();
    }
}

// ==========================================
// HTML Routes សម្រាប់បើកទំព័រ Views ផ្សេងៗ
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/views/hr-in-out.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'hr-in-out.html'));
});

app.get('/views/hr-asset.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'hr-asset.html'));
});

app.get('/views/hr-management.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'hr-management.html'));
});

app.get('/views/hr-payroll.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'hr-payroll.html'));
});

// [ថ្មី] HTML Route សម្រាប់ទំព័រប្រាក់ចំណូល
app.get('/views/hr-revenue.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'hr-revenue.html'));
});

// ==========================================
// API Routes: បុគ្គលិក (Employees)
// ==========================================
app.get('/api/employees', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យបុគ្គលិកបានទេ' });
    }
});

app.post('/api/employees', async (req, res) => {
    const { employee_code, full_name, department, position } = req.body;
    try {
        const query = `
            INSERT INTO employees (employee_code, full_name, department, position) 
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const result = await pool.query(query, [employee_code, full_name, department, position]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុស៖ លេខកូដបុគ្គលិកអាចមានរួចហើយ ឬទិន្នន័យមិនត្រឹមត្រូវ' });
    }
});

// ==========================================
// API Routes: វត្តមាន (Attendance Logs)
// ==========================================
app.get('/api/attendance/logs', async (req, res) => {
    const { from, to, search } = req.query;
    try {
        let query = `
            SELECT a.id, a.employee_code, e.full_name, e.department, a.work_date, a.check_in_time, a.check_out_time
            FROM attendance_logs a
            JOIN employees e ON a.employee_code = e.employee_code
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (from && to) {
            query += ` AND a.work_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(from, to);
            paramIndex += 2;
        }

        if (search) {
            query += ` AND (e.full_name ILIKE $${paramIndex} OR a.employee_code ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex += 1;
        }

        query += ` ORDER BY a.work_date DESC, a.check_in_time DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកប្រវត្តិកត់ត្រាវត្តមានបានទេ' });
    }
});

// ==========================================
// API Routes: ទ្រព្យសម្បត្តិ និងស្តុក (Inventory)
// ==========================================
app.get('/api/inventory', async (req, res) => {
    const { search, category } = req.query;
    try {
        let query = `SELECT * FROM inventory_items WHERE 1=1`;
        let params = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (item_code ILIKE $${paramIndex} OR item_name ILIKE $${paramIndex} OR holder_or_location ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex += 1;
        }

        if (category) {
            query += ` category = $${paramIndex}`;
            params.push(category);
            paramIndex += 1;
        }

        query += ` ORDER BY id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកបញ្ជីសារពើភណ្ឌបានទេ' });
    }
});

app.post('/api/inventory', async (req, res) => {
    const { item_code, item_name, category, quantity, unit, status, holder_or_location } = req.body;
    try {
        const query = `
            INSERT INTO inventory_items (item_code, item_name, category, quantity, unit, status, holder_or_location) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const result = await pool.query(query, [item_code, item_name, category, quantity, unit, status || 'Available', holder_or_location]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុស៖ លេខកូដសម្ភារៈអាចមានរួចហើយ' });
    }
});

// ==========================================
// API Routes: ប្រាក់បៀវត្សរ៍ (Payroll)
// ==========================================
app.get('/api/payroll/calculate/:employee_code/:pay_month', async (req, res) => {
    const { employee_code, pay_month } = req.params;
    try {
        const empResult = await pool.query('SELECT * FROM employees WHERE employee_code = $1', [employee_code]);
        if (empResult.rows.length === 0) {
            return res.status(404).json({ error: 'រកមិនឃើញកូដបុគ្គលិកនេះទេ' });
        }
        const employee = empResult.rows[0];

        const attendanceResult = await pool.query(`
            SELECT COUNT(DISTINCT work_date) as present_days 
            FROM attendance_logs 
            WHERE employee_code = $1 AND TO_CHAR(work_date, 'YYYY-MM') = $2
        `, [employee_code, pay_month]);

        const presentDays = parseInt(attendanceResult.rows[0].present_days) || 0;
        const standardWorkingDays = 26;
        let absentDays = standardWorkingDays - presentDays;
        if (absentDays < 0) absentDays = 0;

        res.json({
            employee_code: employee.employee_code,
            full_name: employee.full_name,
            present_days: presentDays,
            absent_days: absentDays
        });
    } catch (err) {
        console.error('Error calculating absence:', err);
        res.status(500).json({ error: 'មានបញ្ហាក្នុងการគណនាវត្តមាន' });
    }
});

app.get('/api/payroll', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM payroll_records ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យប្រាក់បៀវត្សរ៍បានទេ' });
    }
});

app.post('/api/payroll', async (req, res) => {
    const { employee_code, full_name, base_salary, allowance, deduction, pay_month } = req.body;
    try {
        const bSalary = parseFloat(base_salary) || 0;
        const allow = parseFloat(allowance) || 0;
        const deduct = parseFloat(deduction) || 0;
        const net_salary = (bSalary + allow) - deduct;

        const query = `
            INSERT INTO payroll_records (employee_code, full_name, base_salary, allowance, deduction, net_salary, pay_month) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const result = await pool.query(query, [employee_code, full_name, bSalary, allow, deduct, net_salary, pay_month]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាប្រាក់បៀវត្សរ៍' });
    }
});

// ==========================================
// API Routes: [ថ្មី] ប្រាក់ចំណូល (Revenues)
// ==========================================
app.get('/api/revenues', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM revenues ORDER BY revenue_date DESC, id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យប្រាក់ចំណូលបានទេ' });
    }
});

app.post('/api/revenues', async (req, res) => {
    const { revenue_date, category, description, amount, received_by } = req.body;
    try {
        const query = `
            INSERT INTO revenues (revenue_date, category, description, amount, received_by) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const result = await pool.query(query, [revenue_date, category, description, parseFloat(amount) || 0, received_by]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាប្រាក់ចំណូល' });
    }
});

// ចាប់ផ្តើមដំណើរការ Server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
