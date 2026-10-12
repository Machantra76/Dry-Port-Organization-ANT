const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const Stream = require('node-rtsp-stream'); // បណ្ណាល័យសម្រាប់បម្លែង RTSP ទៅជា WebSocket

const app = express();
const PORT = process.env.PORT || 3000;

// កំណត់ Stream សម្រាប់ IP Camera / CCTV របស់ឃ្លាំង
// (សូមជំនួស URL ខាងក្រោមដោយ Link RTSP ពិតប្រាកដរបស់កាមេរ៉ា ឬ NVR របស់អ្នក)
try {
    const warehouseCCTVStream = new Stream({
        name: 'Warehouse CCTV Live',
        streamUrl: process.env.RTSP_STREAM_URL || 'rtsp://admin:12345@192.168.1.100:554/h264Preview_01_main',
        wsPort: 9999, // Port សម្រាប់បញ្ជូនទិន្នន័យ WebSocket ទៅកាន់ Frontend
        ffmpegOptions: {
            '-rtsp_transport': 'tcp',
            '-f': 'mpeg1video',
            '-b:v': '800k',
            '-r': 30
        }
    });
    console.log('RTSP CCTV Streamer initialized on WebSocket port 9999.');
} catch (err) {
    console.error('Error initializing RTSP stream (Make sure FFmpeg is installed):', err);
}

// ការតភ្ជាប់ PostgreSQL Database (Neon Database)
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

        // ២១. តារាងប្រព័ន្ធ WMS / OMS
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

// Routes សម្រាប់ Views
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/views/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', req.params.filename));
});

// API Routes ផ្សេងៗ (រក្សាទុកទម្រង់ដើមដដែល)
app.get('/api/it-cctv', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM it_cctv_networks ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ចាប់ផ្តើមដំណើរការ Server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
