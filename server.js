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
app.use('/views', express.static(path.join(__dirname, 'views')));

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
                branch VARCHAR(50) NOT NULL DEFAULT 'ANT DRY PORT',
                employee_code VARCHAR(50) NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
                allowance NUMERIC(10, 2) NOT NULL DEFAULT 0,
                deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
                previous_debt NUMERIC(10, 2) NOT NULL DEFAULT 0,
                new_debt NUMERIC(10, 2) NOT NULL DEFAULT 0,
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
                container_size VARCHAR(20) DEFAULT '40''',
                container_type VARCHAR(20) DEFAULT 'DC',
                shipping_line VARCHAR(100),
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
                container_size VARCHAR(20) DEFAULT '40''',
                container_type VARCHAR(20) DEFAULT 'DC',
                shipping_line VARCHAR(100),
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
                container_size VARCHAR(20) DEFAULT '40''',
                container_type VARCHAR(20) DEFAULT 'DC',
                shipping_line VARCHAR(100),
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
                container_size VARCHAR(20) DEFAULT '40''',
                container_type VARCHAR(20) DEFAULT 'DC',
                shipping_line VARCHAR(100),
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

        // ២៣. តារាងមុខតំណែងការងារ (Job Vacancies)
        await client.query(`
            CREATE TABLE IF NOT EXISTS job_vacancies (
                id SERIAL PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                dept VARCHAR(100) NOT NULL,
                qty INT NOT NULL DEFAULT 1,
                status VARCHAR(50) DEFAULT 'កំពុងស្វែងរក',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២៤. តារាងទំនាក់ទំនងជាមួយអតិថិជន (Customer Relations)
        await client.query(`
            CREATE TABLE IF NOT EXISTS customer_relations (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(150) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                contact_type VARCHAR(100) NOT NULL,
                contact_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២៥. តារាងការដោះស្រាយបញ្ហា / ការតវ៉ា (Dispute & Complaint Resolution)
        await client.query(`
            CREATE TABLE IF NOT EXISTS dispute_resolutions (
                id SERIAL PRIMARY KEY,
                complainant_name VARCHAR(150) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                dispute_type VARCHAR(100) NOT NULL,
                severity_level VARCHAR(50) DEFAULT 'Medium',
                dispute_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២៦. តារាងស្វែងរកប្រភព និងការគាំទ្រទូទៅ (Sourcing & General Support)
        await client.query(`
            CREATE TABLE IF NOT EXISTS sourcing_support (
                id SERIAL PRIMARY KEY,
                request_title VARCHAR(150) NOT NULL,
                requester_name VARCHAR(150) NOT NULL,
                category VARCHAR(100) NOT NULL,
                priority_level VARCHAR(50) DEFAULT 'Medium',
                request_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២៧. តារាងការគ្រប់គ្រងឯកសារគយ (Customs Document Management)
        await client.query(`
            CREATE TABLE IF NOT EXISTS customs_documents (
                id SERIAL PRIMARY KEY,
                document_number VARCHAR(100) UNIQUE NOT NULL,
                company_name VARCHAR(150) NOT NULL,
                document_type VARCHAR(100) NOT NULL,
                document_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                officer_name VARCHAR(150) NOT NULL,
                reference_no VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២៨. តារាងការគ្រប់គ្រងបញ្ចូលទិន្នន័យប្រព័ន្ធគយ (Customs System Data Management)
        await client.query(`
            CREATE TABLE IF NOT EXISTS customs_system_data (
                id SERIAL PRIMARY KEY,
                sys_code VARCHAR(100) UNIQUE NOT NULL,
                company_name VARCHAR(150) NOT NULL,
                transaction_type VARCHAR(150) NOT NULL,
                entry_date DATE NOT NULL,
                system_status VARCHAR(50) DEFAULT 'Pending',
                operator_name VARCHAR(150) NOT NULL,
                reference_number VARCHAR(100),
                customs_office VARCHAR(150),
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ២៩. តារាងអ្នកកាន់ឯកសារគយ (Document Controller / Handler)
        await client.query(`
            CREATE TABLE IF NOT EXISTS document_handlers (
                id SERIAL PRIMARY KEY,
                handler_name VARCHAR(150) NOT NULL,
                handler_code VARCHAR(100) NOT NULL,
                handler_role VARCHAR(150) NOT NULL,
                assigned_doc_ref VARCHAR(100) NOT NULL,
                assignment_date DATE NOT NULL,
                handler_status VARCHAR(50) DEFAULT 'Active',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ៣០. តារាងគ្រប់គ្រងឃ្លាំងទំនិញពន្ធដារ (Bonded Warehouse Records - BWH) [ADDED]
        await client.query(`
            CREATE TABLE IF NOT EXISTS bonded_warehouse_records (
                id SERIAL PRIMARY KEY,
                container_number VARCHAR(100) NOT NULL,
                cargo_name VARCHAR(255) NOT NULL,
                owner_name VARCHAR(255) NOT NULL,
                movement_type VARCHAR(50) NOT NULL,
                record_date TIMESTAMP NOT NULL,
                customs_status VARCHAR(150) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ៣១. តារាងអ្នកប្រើប្រាស់ប្រព័ន្ធ (System Users & Roles)
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'STAFF',
                dept_id VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // បញ្ចូលគណនី Default ចូល Database ស្វ័យប្រវត្ត (ប្រសិនបើទិន្នន័យទទេ)
        const checkUser = await client.query('SELECT COUNT(*) FROM system_users');
        if (parseInt(checkUser.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO system_users (username, password, full_name, role, dept_id) VALUES
                ('admin', '123456', 'អភិបាលប្រព័ន្ធ (System Admin)', 'ADMIN', 'ALL'),
                ('hr_user', '123456', 'មន្ត្រីធនធានមនុស្ស', 'STAFF', 'HR_ADMIN'),
                ('acc_user', '123456', 'មន្ត្រីគណនេយ្យ', 'STAFF', 'ACC_FIN'),
                ('transport_user', '123456', 'មន្ត្រីដឹកជញ្ជូន', 'STAFF', 'TRANSPORT'),
                ('container_user', '123456', 'មន្ត្រីកុងតឺន័រ', 'STAFF', 'CONTAINER_MGT'),
                ('tech_user', '123456', 'មន្ត្រីទីលាន', 'STAFF', 'TECH_STUFFING'),
                ('it_user', '123456', 'មន្ត្រី IT', 'STAFF', 'IT_SYSTEMS'),
                ('cs_user', '123456', 'មន្ត្រីសេវាកម្មអតិថិជន', 'STAFF', 'CUSTOMER_SVC'),
                ('doc_user', '123456', 'មន្ត្រីឯកសារគយ', 'STAFF', 'FACILITIES'),
                ('bwh_user', '123456', 'មន្ត្រីឃ្លាំងពន្ធដារ', 'STAFF', 'BONDED_WH');
            `);
        }

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
// API Route: Authentication (Login)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM system_users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ!' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ==========================================
// API Route: Register (បង្កើត User ថ្មី)
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    const { username, password, full_name, role, dept_id } = req.body;
    try {
        const query = `
            INSERT INTO system_users (username, password, full_name, role, dept_id)
            VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, role, dept_id;
        `;
        const values = [username, password, full_name, role || 'STAFF', dept_id || 'HR_ADMIN'];
        const result = await pool.query(query, values);

        res.json({ success: true, message: 'បង្កើត User ដោយជោគជ័យ', user: result.rows[0] });
    } catch (err) {
        console.error('Register error:', err);
        res.status(400).json({ success: false, error: 'ឈ្មោះគណនី (Username) នេះមានរួចហើយ ឬមានបញ្ហា!' });
    }
});

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

app.get('/views/transport-fleet.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'transport-fleet.html'));
});

app.get('/views/transport-drivers.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'transport-drivers.html'));
});

app.get('/views/transport-maintenance.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'transport-maintenance.html'));
});

app.get('/views/transport-planning.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'transport-planning.html'));
});

app.get('/views/container-damage.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'container-damage.html'));
});

app.get('/views/container-yard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'container-yard.html'));
});

app.get('/views/container-stock.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'container-stock.html'));
});

app.get('/views/container-gateout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'container-gateout.html'));
});

app.get('/views/tech-stuffing.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tech-stuffing.html'));
});

app.get('/views/cargo-gate.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cargo-gate.html'));
});

app.get('/views/tech-safety.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tech-safety.html'));
});

app.get('/views/it-wms.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'it-wms.html'));
});

app.get('/views/it-cctv.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'it-cctv.html'));
});

app.get('/views/it-data.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'it-data.html'));
});

app.get('/views/cs-relations.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cs-relations.html'));
});

app.get('/views/cs-complaints.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cs-complaints.html'));
});

app.get('/views/cs-support.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cs-support.html'));
});

app.get('/views/doc-management.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'doc-management.html'));
});

app.get('/views/doc-customs.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'doc-customs.html'));
});

app.get('/views/doc-handler.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'doc-handler.html'));
});

// HTML Route សម្រាប់ទំព័រ Bonded Warehouse (BWH In/Out) [ADDED]
app.get('/views/bwh-inout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'bwh-inout.html'));
});

// ==========================================
// API Routes: ឃ្លាំងទំនិញពន្ធដារ (Bonded Warehouse - BWH In/Out) [ADDED]
// ==========================================
app.get('/api/bwh-records', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bonded_warehouse_records ORDER BY record_date DESC, id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching BWH records:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/bwh-records', async (req, res) => {
    const { container_number, cargo_name, owner_name, movement_type, record_date, customs_status } = req.body;
    try {
        const query = `
            INSERT INTO bonded_warehouse_records (container_number, cargo_name, owner_name, movement_type, record_date, customs_status)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const values = [container_number, cargo_name, owner_name, movement_type, record_date || new Date(), customs_status];
        const result = await pool.query(query, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Error saving BWH record:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// API Routes: អ្នកកាន់ឯកសារគយ (Document Controller / Handler)
// ==========================================
app.get('/api/document-handlers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM document_handlers ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching document handlers:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/document-handlers', async (req, res) => {
    const { handler_name, handler_code, handler_role, assigned_doc_ref, assignment_date, handler_status, remarks } = req.body;
    try {
        const query = `
            INSERT INTO document_handlers (handler_name, handler_code, handler_role, assigned_doc_ref, assignment_date, handler_status, remarks)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const values = [handler_name, handler_code, handler_role, assigned_doc_ref, assignment_date, handler_status || 'Active', remarks];
        const result = await pool.query(query, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Error saving document handler:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ចាប់ផ្តើមដំណើរការ Server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});