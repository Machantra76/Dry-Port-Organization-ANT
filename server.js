const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ការតភ្ជាប់ PostgreSQL Database ( Neon DB )
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware សម្រាប់អាន JSON និង Static Files ពី Folder public
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

        // សុវត្ថិភាពបន្ថែម៖ Auto ALTER Table ប្រសិនបើតារាងមានស្រាប់តែខ្វះ Column ទាំងនេះ
        await client.query(`ALTER TABLE container_repair_logs ADD COLUMN IF NOT EXISTS block_code VARCHAR(50);`);
        await client.query(`ALTER TABLE container_repair_logs ADD COLUMN IF NOT EXISTS row_number INT DEFAULT 1;`);
        await client.query(`ALTER TABLE container_repair_logs ADD COLUMN IF NOT EXISTS tier_number INT DEFAULT 1;`);

        await client.query('COMMIT');
        console.log('Database tables initialized and updated successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error initializing database tables:', err);
    } finally {
        client.release();
    }
}

// Routes មូលដ្ឋានសម្រាប់តេស្ត Server
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running smoothly!' });
});

// ចាប់ផ្តើមដំណើរការ Server និង Database
app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    await initializeDatabase();
});
