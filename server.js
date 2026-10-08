const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ការតភ្ជាប់ PostgreSQL Database (ឧ. Neon Database)[cite: 7, 8]
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/hr_db',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views'))); // បន្ថែមដើម្បីឱ្យអានហ្វាលក្នុង views បានយ៉ាងរលូន[cite: 8]

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

        // ៥. តារាងគណនេយ្យប្រាក់ចំណូល (Revenues)
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

        // ៦. តារាងគណនេយ្យទទួល (Accounts Receivable)
        await client.query(`
            CREATE TABLE IF NOT EXISTS accounts_receivable (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(150) NOT NULL,
                invoice_date DATE NOT NULL,
                due_date DATE NOT NULL,
                amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Pending',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ៧. តារាងចំណាយ (Expenses) [បន្ថែមថ្មី]
        await client.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                expense_date DATE NOT NULL,
                category VARCHAR(150) NOT NULL,
                description TEXT,
                amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
                paid_to VARCHAR(150) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ៨. តារាងគ្រប់គ្រងរថយន្ត (Fleet Vehicles) [បន្ថែមថ្មី]
        await client.query(`
            CREATE TABLE IF NOT EXISTS fleet_vehicles (
                id SERIAL PRIMARY KEY,
                vehicle_code VARCHAR(50) UNIQUE NOT NULL,
                model VARCHAR(150) NOT NULL,
                plate_number VARCHAR(50) UNIQUE NOT NULL,
                capacity VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ៩. តារាងគ្រប់គ្រងអ្នកបើកបរ (Drivers) [បន្ថែមថ្មី]
        await client.query(`
            CREATE TABLE IF NOT EXISTS drivers (
                id SERIAL PRIMARY KEY,
                driver_code VARCHAR(50) UNIQUE NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                license_number VARCHAR(100) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'Available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ១០. តារាងការចាត់ចែងការដឹកជញ្ជូន (Transport Dispatches) [បន្ថែមថ្មី]
        await client.query(`
            CREATE TABLE IF NOT EXISTS transport_dispatches (
                id SERIAL PRIMARY KEY,
                dispatch_code VARCHAR(50) UNIQUE NOT NULL,
                vehicle_code VARCHAR(50) NOT NULL,
                driver_name VARCHAR(150) NOT NULL,
                destination TEXT NOT NULL,
                dispatch_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'Dispatched',
                notes TEXT,
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

app.get('/views/hr-revenue.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'hr-revenue.html'));
});

app.get('/views/acc-revenue.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'acc-revenue.html'));
});

app.get('/views/acc-receivable.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'acc-receivable.html'));
});

app.get('/views/acc-finance.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'acc-finance.html'));
});

app.get('/views/acc-control.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'acc-control.html'));
});

app.get('/views/fleet-dispatch.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'fleet-dispatch.html'));
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
        res.status(500).json({ error: 'មានបញ្ហាក្នុងការគណនាវត្តមាន' });
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
// API Routes: ប្រាក់ចំណូល (Revenues)
// ==========================================
app.get('/api/revenues', async (req, res) => {
    const { from, to } = req.query;
    try {
        let query = 'SELECT * FROM revenues WHERE 1=1';
        let params = [];
        
        if (from && to) {
            query += ' AND revenue_date BETWEEN $1 AND $2';
            params.push(from, to);
        }
        
        query += ' ORDER BY revenue_date DESC, id DESC';
        const result = await pool.query(query, params);
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

// ==========================================
// API Routes: គណនេយ្យទទួល (Accounts Receivable)
// ==========================================
app.get('/api/receivables', async (req, res) => {
    const { from, to } = req.query;
    try {
        let query = 'SELECT * FROM accounts_receivable WHERE 1=1';
        let params = [];
        
        if (from && to) {
            query += ' AND invoice_date BETWEEN $1 AND $2';
            params.push(from, to);
        }
        
        query += ' ORDER BY invoice_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យគណនេយ្យទទួលបានទេ' });
    }
});

app.post('/api/receivables', async (req, res) => {
    const { customer_name, invoice_date, due_date, amount, status, description } = req.body;
    try {
        const query = `
            INSERT INTO accounts_receivable (customer_name, invoice_date, due_date, amount, status, description) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const result = await pool.query(query, [customer_name, invoice_date, due_date, parseFloat(amount) || 0, status || 'Pending', description]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាគណនេយ្យទទួល' });
    }
});

// ==========================================
// API Routes: ចំណាយ (Expenses)
// ==========================================
app.get('/api/expenses', async (req, res) => {
    const { from, to } = req.query;
    try {
        let query = 'SELECT * FROM expenses WHERE 1=1';
        let params = [];
        
        if (from && to) {
            query += ' AND expense_date BETWEEN $1 AND $2';
            params.push(from, to);
        }
        
        query += ' ORDER BY expense_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យចំណាយបានទេ' });
    }
});

app.post('/api/expenses', async (req, res) => {
    const { expense_date, category, description, amount, paid_to } = req.body;
    try {
        const query = `
            INSERT INTO expenses (expense_date, category, description, amount, paid_to) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const result = await pool.query(query, [expense_date, category, description, parseFloat(amount) || 0, paid_to]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាចំណាយ' });
    }
});

// ==========================================
// API Routes: របាយការណ៍ហិរញ្ញវត្ថុ (Financial Summary API)
// ==========================================
app.get('/api/financial/summary', async (req, res) => {
    const { from, to } = req.query;
    try {
        let revQuery = 'SELECT SUM(amount) as total_revenue FROM revenues WHERE 1=1';
        let expQuery = 'SELECT SUM(amount) as total_expense FROM expenses WHERE 1=1';
        let recQuery = `
            SELECT 
                SUM(amount) as total_receivable, 
                SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) as total_paid, 
                SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END) as total_pending 
            FROM accounts_receivable 
            WHERE 1=1
        `;
        let params = [];

        if (from && to) {
            revQuery += ' AND revenue_date BETWEEN $1 AND $2';
            expQuery += ' AND expense_date BETWEEN $1 AND $2';
            recQuery += ' AND invoice_date BETWEEN $1 AND $2';
            params.push(from, to);
        }

        const revResult = await pool.query(revQuery, params);
        const expResult = await pool.query(expQuery, params);
        const recResult = await pool.query(recQuery, params);

        const totalRevenue = parseFloat(revResult.rows[0].total_revenue) || 0;
        const totalExpense = parseFloat(expResult.rows[0].total_expense) || 0;

        res.json({
            total_revenue: totalRevenue,
            total_expense: totalExpense,
            net_profit: totalRevenue - totalExpense,
            total_receivable: parseFloat(recResult.rows[0].total_receivable) || 0,
            total_paid: parseFloat(recResult.rows[0].total_paid) || 0,
            total_pending: parseFloat(recResult.rows[0].total_pending) || 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យរបាយការណ៍ហិរញ្ញវត្ថុបានទេ' });
    }
});

// ==========================================
// API Routes: ការចាត់ចែងរថយន្ត (Fleet Vehicles) [បន្ថែមថ្មី]
// ==========================================
app.get('/api/fleet/vehicles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fleet_vehicles ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកបញ្ជីរថយន្តបានទេ' });
    }
});

app.post('/api/fleet/vehicles', async (req, res) => {
    const { vehicle_code, model, plate_number, capacity, status } = req.body;
    try {
        const query = `
            INSERT INTO fleet_vehicles (vehicle_code, model, plate_number, capacity, status) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const result = await pool.query(query, [vehicle_code, model, plate_number, capacity, status || 'Available']);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុស៖ លេខកូដរថយន្ត ឬស្លាកលេខអាចមានរួចហើយ' });
    }
});

// ==========================================
// API Routes: ការគ្រប់គ្រងអ្នកបើកបរ (Drivers) [បន្ថែមថ្មី]
// ==========================================
app.get('/api/fleet/drivers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM drivers ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកបញ្ជីអ្នកបើកបរបានទេ' });
    }
});

app.post('/api/fleet/drivers', async (req, res) => {
    const { driver_code, full_name, phone, license_number, status } = req.body;
    try {
        const query = `
            INSERT INTO drivers (driver_code, full_name, phone, license_number, status) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const result = await pool.query(query, [driver_code, full_name, phone, license_number, status || 'Available']);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុស៖ លេខកូដ ឬលេខប័ណ្ណបើកបរអាចមានរួចហើយ' });
    }
});

// ==========================================
// API Routes: ការបញ្ជូនដឹកជញ្ជូន (Transport Dispatches) [បន្ថែមថ្មី]
// ==========================================
app.get('/api/fleet/dispatches', async (req, res) => {
    const { from, to } = req.query;
    try {
        let query = 'SELECT * FROM transport_dispatches WHERE 1=1';
        let params = [];
        
        if (from && to) {
            query += ' AND dispatch_date BETWEEN $1 AND $2';
            params.push(from, to);
        }
        
        query += ' ORDER BY dispatch_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យការដឹកជញ្ជូនបានទេ' });
    }
});

app.post('/api/fleet/dispatches', async (req, res) => {
    const { dispatch_code, vehicle_code, driver_name, destination, dispatch_date, status, notes } = req.body;
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO transport_dispatches (dispatch_code, vehicle_code, driver_name, destination, dispatch_date, status, notes) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
            `;
            const result = await client.query(query, [dispatch_code, vehicle_code, driver_name, destination, dispatch_date, status || 'Dispatched', notes]);

            // ធ្វើបច្ចុប្បន្នភាពស្ថានភាពរថយន្តឱ្យទៅជា 'On Mission'
            await client.query(`
                UPDATE fleet_vehicles SET status = 'On Mission' WHERE vehicle_code = $1
            `, [vehicle_code]);

            // ធ្វើបច្ចុប្បន្នភាពស្ថានភាពអ្នកបើកបរឱ្យទៅជា 'On Duty'
            await client.query(`
                UPDATE drivers SET status = 'On Duty' WHERE full_name = $1
            `, [driver_name]);

            await client.query('COMMIT');
            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាការបញ្ជូនរថយន្តដឹកជញ្ជូន' });
    }
});

// ចាប់ផ្តើមដំណើរការ Server[cite: 8]
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
