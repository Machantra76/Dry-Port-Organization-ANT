const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ការតភ្ជាប់ PostgreSQL Database (ឧ. Neon Database)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/hr_db',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views'))); // បន្ថែមเพื่อให้อានហ្វាលក្នុង views បានយ៉ាងរលូន

// មុខងារសម្រាប់បង្កើត Tables ក្នុង Database ដោយស្វ័យប្រវត្តពេល Start Server
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

        // ៧. តារាងចំណាយ (Expenses)
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

        // ៨. តារាងគ្រប់គ្រងរថយន្ត (Fleet Vehicles)
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

        // ៩. តារាងគ្រប់គ្រងអ្នកបើកបរ (Drivers)
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

        // ១០. តារាងការចាត់ចែងការដឹកជញ្ជូន (Transport Dispatches)
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

        // ១១. តារាងគ្រប់គ្រងប្រេងឥន្ធនៈ (Fuel Logs)
        await client.query(`
            CREATE TABLE IF NOT EXISTS fuel_logs (
                id SERIAL PRIMARY KEY,
                vehicle_code VARCHAR(50) NOT NULL,
                log_date DATE NOT NULL,
                liters NUMERIC(10, 2) NOT NULL DEFAULT 0,
                cost_per_liter NUMERIC(10, 2) NOT NULL DEFAULT 0,
                total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
                current_mileage INT NOT NULL DEFAULT 0,
                filled_by VARCHAR(150) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ១២. តារាងគ្រប់គ្រងការថែទាំយានយន្ត (Maintenance Logs)
        await client.query(`
            CREATE TABLE IF NOT EXISTS maintenance_logs (
                id SERIAL PRIMARY KEY,
                vehicle_code VARCHAR(50) NOT NULL,
                maintenance_date DATE NOT NULL,
                service_type VARCHAR(150) NOT NULL,
                description TEXT,
                cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
                service_provider VARCHAR(150) NOT NULL,
                status VARCHAR(50) DEFAULT 'Completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ១៣. តារាងរៀបចំផែនការដឹកជញ្ជូនទំនិញ (Transport Plans)
        await client.query(`
            CREATE TABLE IF NOT EXISTS transport_plans (
                id SERIAL PRIMARY KEY,
                cargo_code VARCHAR(100) NOT NULL,
                vehicle_code VARCHAR(50) NOT NULL,
                origin VARCHAR(150) NOT NULL,
                destination VARCHAR(150) NOT NULL,
                departure_date DATE NOT NULL,
                driver_name VARCHAR(150) NOT NULL,
                notes TEXT,
                status VARCHAR(50) DEFAULT 'Planned',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ១៤. តារាងត្រួតពិនិត្យកុងតឺន័រខូច (Damaged Containers)
        await client.query(`
            CREATE TABLE IF NOT EXISTS damaged_containers (
                id SERIAL PRIMARY KEY,
                container_number VARCHAR(100) NOT NULL,
                inspection_date DATE NOT NULL,
                damage_location VARCHAR(150) NOT NULL,
                severity_level VARCHAR(50) NOT NULL,
                inspector_name VARCHAR(150) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'Pending Repair',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ១៥. តារាងគ្រប់គ្រងទីតាំងកុងតឺន័រ (Container Yard Locations)
        await client.query(`
            CREATE TABLE IF NOT EXISTS container_yard_locations (
                id SERIAL PRIMARY KEY,
                container_number VARCHAR(100) NOT NULL,
                block_code VARCHAR(50) NOT NULL,
                row_number INT NOT NULL,
                tier_number INT NOT NULL,
                status VARCHAR(50) DEFAULT 'Stored',
                updated_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ១៦. តារាងការថែទាំ និងជួសជុលកុងតឺន័រ (Container Repair Logs)
        await client.query(`
            CREATE TABLE IF NOT EXISTS container_repair_logs (
                id SERIAL PRIMARY KEY,
                container_number VARCHAR(100) NOT NULL,
                repair_date DATE NOT NULL,
                block_code VARCHAR(50),
                row_number INT DEFAULT 1,
                tier_number INT DEFAULT 1,
                repair_type VARCHAR(150) NOT NULL,
                cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
                technician_name VARCHAR(150) NOT NULL,
                status VARCHAR(50) DEFAULT 'In Progress',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ១៧. តារាងការចេញកុងតឺន័រ (Container Gate-Out)
        await client.query(`
            CREATE TABLE IF NOT EXISTS container_gate_out (
                id SERIAL PRIMARY KEY,
                container_number VARCHAR(100) NOT NULL,
                gate_out_date TIMESTAMP NOT NULL,
                truck_plate_number VARCHAR(50) NOT NULL,
                driver_name VARCHAR(150) NOT NULL,
                destination TEXT NOT NULL,
                bill_of_lading VARCHAR(100),
                released_by VARCHAR(100) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ១៨. តារាងប្រតិបត្តិការទីលាន (Yard Operations)
        await client.query(`
            CREATE TABLE IF NOT EXISTS yard_operations (
                id SERIAL PRIMARY KEY,
                container_number VARCHAR(50) NOT NULL,
                operation_type VARCHAR(100) NOT NULL,
                yard_location VARCHAR(100) NOT NULL,
                operation_date TIMESTAMP NOT NULL,
                equipment_used VARCHAR(100),
                operator_name VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ១៩. តារាងកត់ត្រាការចូល/ចេញទំនិញ (Cargo Gate-In / Gate-Out)
        await client.query(`
            CREATE TABLE IF NOT EXISTS cargo_gate_logs (
                id SERIAL PRIMARY KEY,
                cargo_code VARCHAR(100) NOT NULL,
                container_number VARCHAR(100),
                gate_type VARCHAR(50) NOT NULL,
                gate_date TIMESTAMP NOT NULL,
                truck_plate_number VARCHAR(50) NOT NULL,
                driver_name VARCHAR(150) NOT NULL,
                company_name VARCHAR(150),
                status VARCHAR(50) DEFAULT 'Completed',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២០. តារាងគ្រប់គ្រងក្រុមសន្តិសុខ (Security Logs)
        await client.query(`
            CREATE TABLE IF NOT EXISTS security_logs (
                id SERIAL PRIMARY KEY,
                guard_name VARCHAR(150) NOT NULL,
                shift_time VARCHAR(100) NOT NULL,
                post_location VARCHAR(150) NOT NULL,
                log_date TIMESTAMP NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                status VARCHAR(50),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២១. តារាងប្រព័ន្ធ WMS / OMS (Warehouse & Order Management Systems)
        await client.query(`
            CREATE TABLE IF NOT EXISTS wms_oms_records (
                id SERIAL PRIMARY KEY,
                item_code VARCHAR(50) NOT NULL,
                item_name VARCHAR(150) NOT NULL,
                system_type VARCHAR(100) NOT NULL,
                quantity INT NOT NULL DEFAULT 0,
                location_status VARCHAR(150) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២២. តារាងគ្រប់គ្រង CCTV និង Network (IT Infrastructure)
        await client.query(`
            CREATE TABLE IF NOT EXISTS it_cctv_networks (
                id SERIAL PRIMARY KEY,
                category VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(100),
                location VARCHAR(150) NOT NULL,
                ip_address VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Online',
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

app.get('/views/fleet-fuel-maintenance.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'fleet-fuel-maintenance.html'));
});

app.get('/views/transport-planning.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'transport-planning.html'));
});

app.get('/views/damaged-container.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'damaged-container.html'));
});

app.get('/views/container-yard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'container-yard.html'));
});

app.get('/views/container-stock.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'container-stock.html'));
});

app.get('/views/container-repair.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'container-repair.html'));
});

app.get('/views/container-gate-out.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'container-gate-out.html'));
});

app.get('/views/yard-operations.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'yard-operations.html'));
});

app.get('/views/cargo-gate.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cargo-gate.html'));
});

app.get('/views/tech-safety.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tech-safety.html'));
});

app.get('/views/wms-oms.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'wms-oms.html'));
});

app.get('/views/it-cctv.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'it-cctv.html'));
});

// ==========================================
// API Routes: IT CCTV & Network Infrastructure
// ==========================================
app.get('/api/it-cctv', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM it_cctv_networks ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching IT CCTV/Network:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/it-cctv', async (req, res) => {
    const { category, name, type, location, ip_address, status } = req.body;
    try {
        const query = `
            INSERT INTO it_cctv_networks (category, name, type, location, ip_address, status)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const values = [category, name, type || null, location, ip_address, status || 'Online'];
        const result = await pool.query(query, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Error saving IT CCTV/Network:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/it-cctv/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM it_cctv_networks WHERE id = $1', [id]);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting IT CCTV/Network:', err);
        res.status(500).json({ error: 'Server error' });
    }
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
            query += ` AND category = $${paramIndex}`;
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

// 📌 API Route សម្រាប់កែប្រែស្ថានភាពគណនេយ្យទទួល (Update Accounts Receivable Status)
app.put('/api/receivables/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const query = `
            UPDATE accounts_receivable 
            SET status = $1 
            WHERE id = $2 
            RETURNING *;
        `;
        const result = await pool.query(query, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'រកមិនឃើញទិន្នន័យគណនេយ្យទទួលនេះទេ' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Error updating receivable status:', err);
        res.status(500).json({ success: false, error: 'កំហុសក្នុងការកែប្រែស្ថានភាពគណនេយ្យទទួល' });
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
// API Routes: ការចាត់ចែងរថយន្ត (Fleet Vehicles)
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
// API Routes: ការគ្រប់គ្រងអ្នកបើកបរ (Drivers)
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
// API Routes: ការបញ្ជូនដឹកជញ្ជូន (Transport Dispatches)
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

            await client.query(`
                UPDATE fleet_vehicles SET status = 'On Mission' WHERE vehicle_code = $1
            `, [vehicle_code]);

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

// ==========================================
// API Routes: ការគ្រប់គ្រងប្រេងឥន្ធនៈ (Fuel Logs)
// ==========================================
app.get('/api/fleet/fuel', async (req, res) => {
    const { from, to, vehicle_code } = req.query;
    try {
        let query = 'SELECT * FROM fuel_logs WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        if (from && to) {
            query += ` AND log_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(from, to);
            paramIndex += 2;
        }

        if (vehicle_code) {
            query += ` AND vehicle_code = $${paramIndex}`;
            params.push(vehicle_code);
            paramIndex += 1;
        }
        
        query += ' ORDER BY log_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យប្រេងឥន្ធនៈបានទេ' });
    }
});

app.post('/api/fleet/fuel', async (req, res) => {
    const { vehicle_code, log_date, liters, cost_per_liter, current_mileage, filled_by } = req.body;
    try {
        const l = parseFloat(liters) || 0;
        const cpl = parseFloat(cost_per_liter) || 0;
        const total_cost = l * cpl;

        const query = `
            INSERT INTO fuel_logs (vehicle_code, log_date, liters, cost_per_liter, total_cost, current_mileage, filled_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const result = await pool.query(query, [vehicle_code, log_date, l, cpl, total_cost, parseInt(current_mileage) || 0, filled_by]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាទិន្នន័យប្រេងឥន្ធនៈ' });
    }
});

// ==========================================
// API Routes: ការថែទាំយានយន្ត (Maintenance Logs)
// ==========================================
app.get('/api/fleet/maintenance', async (req, res) => {
    const { from, to, vehicle_code } = req.query;
    try {
        let query = 'SELECT * FROM maintenance_logs WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        if (from && to) {
            query += ` AND maintenance_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(from, to);
            paramIndex += 2;
        }

        if (vehicle_code) {
            query += ` AND vehicle_code = $${paramIndex}`;
            params.push(vehicle_code);
            paramIndex += 1;
        }
        
        query += ' ORDER BY maintenance_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យការថែទាំបានទេ' });
    }
});

app.post('/api/fleet/maintenance', async (req, res) => {
    const { vehicle_code, maintenance_date, service_type, description, cost, service_provider, status } = req.body;
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO maintenance_logs (vehicle_code, maintenance_date, service_type, description, cost, service_provider, status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
            `;
            const mStatus = status || 'Completed';
            const result = await client.query(query, [
                vehicle_code, 
                maintenance_date, 
                service_type, 
                description, 
                parseFloat(cost) || 0, 
                service_provider, 
                mStatus
            ]);

            if (mStatus === 'In Progress') {
                await client.query(`
                    UPDATE fleet_vehicles SET status = 'In Maintenance' WHERE vehicle_code = $1
                `, [vehicle_code]);
            } else {
                await client.query(`
                    UPDATE fleet_vehicles SET status = 'Available' WHERE vehicle_code = $1
                `, [vehicle_code]);
            }

            await client.query('COMMIT');
            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាការថែទាំយានយន្ត' });
    }
});

// ==========================================
// API Routes: ផែនការដឹកជញ្ជូនទំនិញ (Transport Plans)
// ==========================================
app.get('/api/fleet/transport-plans', async (req, res) => {
    const { from, to, vehicle_code } = req.query;
    try {
        let query = 'SELECT * FROM transport_plans WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        if (from && to) {
            query += ` AND departure_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(from, to);
            paramIndex += 2;
        }

        if (vehicle_code) {
            query += ` AND vehicle_code = $${paramIndex}`;
            params.push(vehicle_code);
            paramIndex += 1;
        }
        
        query += ' ORDER BY departure_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យផែនការដឹកជញ្ជូនបានទេ' });
    }
});

app.post('/api/fleet/transport-plans', async (req, res) => {
    const { cargo_code, vehicle_code, origin, destination, departure_date, driver_name, notes } = req.body;
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO transport_plans (cargo_code, vehicle_code, origin, destination, departure_date, driver_name, notes, status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'Planned') RETURNING *;
            `;
            const result = await client.query(query, [
                cargo_code, 
                vehicle_code, 
                origin, 
                destination, 
                departure_date, 
                driver_name, 
                notes
            ]);

            await client.query(`
                UPDATE fleet_vehicles SET status = 'On Mission' WHERE vehicle_code = $1
            `, [vehicle_code]);

            await client.query('COMMIT');
            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការបង្កើតផែនការដឹកជញ្ជូនទំនិញ' });
    }
});

// ==========================================
// API Routes: ការត្រួតពិនិត្យកុងតឺន័រខូច (Damaged Containers)
// ==========================================
app.get('/api/fleet/damaged-containers', async (req, res) => {
    const { from, to, severity_level } = req.query;
    try {
        let query = 'SELECT * FROM damaged_containers WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        if (from && to) {
            query += ` AND inspection_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(from, to);
            paramIndex += 2;
        }

        if (severity_level) {
            query += ` AND severity_level = $${paramIndex}`;
            params.push(severity_level);
            paramIndex += 1;
        }
        
        query += ' ORDER BY inspection_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យកុងតឺន័រខូចបានទេ' });
    }
});

app.post('/api/fleet/damaged-containers', async (req, res) => {
    const { container_number, inspection_date, damage_location, severity_level, inspector_name, description, status } = req.body;
    try {
        const query = `
            INSERT INTO damaged_containers (container_number, inspection_date, damage_location, severity_level, inspector_name, description, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const result = await pool.query(query, [
            container_number, 
            inspection_date, 
            damage_location, 
            severity_level, 
            inspector_name, 
            description, 
            status || 'Pending Repair'
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាកុងតឺន័រខូច' });
    }
});

// ==========================================
// API Routes: ការគ្រប់គ្រងទីតាំងកុងតឺន័រ (Container Yard Locations)
// ==========================================
app.get('/api/fleet/container-yard', async (req, res) => {
    const { block_code, status } = req.query;
    try {
        let query = 'SELECT * FROM container_yard_locations WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        if (block_code) {
            query += ` AND block_code = $${paramIndex}`;
            params.push(block_code);
            paramIndex += 1;
        }

        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex += 1;
        }
        
        query += ' ORDER BY updated_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យទីតាំងកុងតឺន័របានទេ' });
    }
});

app.post('/api/fleet/container-yard', async (req, res) => {
    const { container_number, block_code, row_number, tier_number, status, updated_date, notes } = req.body;
    try {
        const query = `
            INSERT INTO container_yard_locations (container_number, block_code, row_number, tier_number, status, updated_date, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const result = await pool.query(query, [
            container_number, 
            block_code, 
            parseInt(row_number) || 1, 
            parseInt(tier_number) || 1, 
            status || 'Stored', 
            updated_date, 
            notes
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាទីតាំងកុងតឺន័រ' });
    }
});

// ==========================================
// API Routes: ការថែទាំ និងជួសជុលកុងតឺន័រ (Container Repair Logs)
// ==========================================
app.get('/api/fleet/container-repairs', async (req, res) => {
    const { status, container_number } = req.query;
    try {
        let query = 'SELECT * FROM container_repair_logs WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex += 1;
        }

        if (container_number) {
            query += ` AND container_number ILIKE $${paramIndex}`;
            params.push(`%${container_number}%`);
            paramIndex += 1;
        }
        
        query += ' ORDER BY repair_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យការជួសជុលកុងតឺន័របានទេ' });
    }
});

app.post('/api/fleet/container-repairs', async (req, res) => {
    const { container_number, repair_date, block_code, row_number, tier_number, repair_type, cost, technician_name, status, notes } = req.body;
    try {
        const query = `
            INSERT INTO container_repair_logs (container_number, repair_date, block_code, row_number, tier_number, repair_type, cost, technician_name, status, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
        `;
        const result = await pool.query(query, [
            container_number, 
            repair_date, 
            block_code || null, 
            parseInt(row_number) || 1, 
            parseInt(tier_number) || 1, 
            repair_type, 
            parseFloat(cost) || 0, 
            technician_name, 
            status || 'In Progress', 
            notes
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាការជួសជុល និងស្តុកកុងតឺន័រ' });
    }
});

// ==========================================
// API Routes: ការចេញកុងតឺន័រ (Container Gate-Out)
// ==========================================
app.get('/api/fleet/container-gate-out', async (req, res) => {
    const { from, to, container_number } = req.query;
    try {
        let query = 'SELECT * FROM container_gate_out WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        if (from && to) {
            query += ` AND gate_out_date::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(from, to);
            paramIndex += 2;
        }

        if (container_number) {
            query += ` AND container_number ILIKE $${paramIndex}`;
            params.push(`%${container_number}%`);
            paramIndex += 1;
        }
        
        query += ' ORDER BY gate_out_date DESC, id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'មិនអាចទាញយកទិន្នន័យការចេញកុងតឺន័របានទេ' });
    }
});

app.post('/api/fleet/container-gate-out', async (req, res) => {
    const { container_number, gate_out_date, truck_plate_number, driver_name, destination, bill_of_lading, released_by, notes } = req.body;
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO container_gate_out (container_number, gate_out_date, truck_plate_number, driver_name, destination, bill_of_lading, released_by, notes) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
            `;
            const result = await client.query(query, [
                container_number, 
                gate_out_date || new Date(), 
                truck_plate_number, 
                driver_name, 
                destination, 
                bill_of_lading, 
                released_by, 
                notes
            ]);

            await client.query(`
                UPDATE container_yard_locations 
                SET status = 'Gate-Out', updated_date = CURRENT_DATE 
                WHERE container_number = $1
            `, [container_number]);

            await client.query('COMMIT');
            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'កំហុសក្នុងការកត់ត្រាការចេញកុងតឺន័រ (Gate-Out)' });
    }
});

// ==========================================
// API Routes: ប្រតិបត្តិការទីលាន (Yard Operations)
// ==========================================
app.get('/api/fleet/yard-operations', async (req, res) => {
    try {
        const query = 'SELECT * FROM yard_operations ORDER BY operation_date DESC';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching yard operations:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.post('/api/fleet/yard-operations', async (req, res) => {
    try {
        const { 
            container_number, 
            operation_type, 
            yard_location, 
            operation_date, 
            equipment_used, 
            operator_name, 
            status, 
            notes 
        } = req.body;

        if (!container_number || !operation_type || !yard_location || !operation_date || !operator_name || !status) {
            return res.status(400).json({ success: false, error: 'សូមបំពេញព័ត៌មានដែលចាំបាច់ឱ្យបានគ្រប់គ្រាន់!' });
        }

        const query = `
            INSERT INTO yard_operations 
            (container_number, operation_type, yard_location, operation_date, equipment_used, operator_name, status, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *;
        `;

        const values = [
            container_number, 
            operation_type, 
            yard_location, 
            operation_date, 
            equipment_used || null, 
            operator_name, 
            status, 
            notes || null
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ success: true, data: result.rows[0] });

    } catch (err) {
        console.error('Error saving yard operation:', err);
        res.status(500).json({ success: false, error: 'មិនអាចរក្សាទុកទិន្នន័យក្នុង Database បានទេ' });
    }
});

// ==========================================
// API Routes: ការចូល/ចេញទំនិញ (Cargo Gate-In / Gate-Out)
// ==========================================
app.get('/api/fleet/cargo-gates', async (req, res) => {
    try {
        const query = 'SELECT * FROM cargo_gate_logs ORDER BY gate_date DESC, id DESC';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching cargo gate logs:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.post('/api/fleet/cargo-gates', async (req, res) => {
    try {
        const { 
            cargo_code, 
            container_number, 
            gate_type, 
            gate_date, 
            truck_plate_number, 
            driver_name, 
            company_name, 
            status, 
            notes 
        } = req.body;

        if (!cargo_code || !gate_type || !gate_date || !truck_plate_number || !driver_name) {
            return res.status(400).json({ success: false, error: 'សូមបំពេញព័ត៌មានសំខាន់ៗឱ្យបានគ្រប់គ្រាន់!' });
        }

        const query = `
            INSERT INTO cargo_gate_logs 
            (cargo_code, container_number, gate_type, gate_date, truck_plate_number, driver_name, company_name, status, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *;
        `;

        const values = [
            cargo_code, 
            container_number || null, 
            gate_type, 
            gate_date, 
            truck_plate_number, 
            driver_name, 
            company_name || null, 
            status || 'Completed', 
            notes || null
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ success: true, data: result.rows[0] });

    } catch (err) {
        console.error('Error saving cargo gate log:', err);
        res.status(500).json({ success: false, error: 'មិនអាចរក្សាទុកទិន្នន័យក្នុង Database បានទេ' });
    }
});

// ==========================================
// API Routes: ក្រុមសន្តិសុខ (Security Guard Team)
// ==========================================
app.get('/api/fleet/security-logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM security_logs ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching security logs:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/fleet/security-logs', async (req, res) => {
    const { guard_name, shift_time, post_location, log_date, event_type, status, notes } = req.body;
    try {
        const query = `
            INSERT INTO security_logs (guard_name, shift_time, post_location, log_date, event_type, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const values = [guard_name, shift_time, post_location, log_date, event_type, status, notes];
        const result = await pool.query(query, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Error saving security log:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// API Routes: ប្រព័ន្ធ WMS / OMS (Warehouse & Order Management)
// ==========================================
app.get('/api/wms-oms', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM wms_oms_records ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching WMS/OMS records:', err);
        res.status(500).json({ error: 'Server.js error' });
    }
});

app.post('/api/wms-oms', async (req, res) => {
    const { item_code, item_name, system_type, quantity, location_status } = req.body;
    try {
        const query = `
            INSERT INTO wms_oms_records (item_code, item_name, system_type, quantity, location_status)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const values = [item_code, item_name, system_type, parseInt(quantity) || 0, location_status];
        const result = await pool.query(query, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Error saving WMS/OMS record:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ចាប់ផ្តើមដំណើរការ Server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
