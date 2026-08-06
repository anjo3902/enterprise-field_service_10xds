from sqlalchemy import text
from pathlib import Path
import sys

# Allow running this file directly: python database/init_db.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database.postgres_client import engine


def create_tables():

    with engine.connect() as conn:

        conn.execute(text("""

        CREATE TABLE IF NOT EXISTS technicians(
            id SERIAL PRIMARY KEY,
            name TEXT,
            skills JSONB,
            latitude FLOAT,
            longitude FLOAT,
            available BOOLEAN,
            workload INT,
            technician_code TEXT,
            primary_domain TEXT,
            certified_skills JSONB,
            certifications JSONB,
            experience_level TEXT,
            critical_fault_eligible BOOLEAN,
            location_zone TEXT,
            shift_start TEXT,
            shift_end TEXT,
            working_days JSONB,
            max_jobs_per_day INT,
            current_jobs INT,
            availability_state TEXT,
            current_latitude FLOAT,
            current_longitude FLOAT
        );

        """))

        # Schema evolution safety for older existing tables.
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS technician_code TEXT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS primary_domain TEXT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS certified_skills JSONB"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS certifications JSONB"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS experience_level TEXT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS critical_fault_eligible BOOLEAN"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS location_zone TEXT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS shift_start TEXT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS shift_end TEXT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS working_days JSONB"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS max_jobs_per_day INT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS current_jobs INT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS availability_state TEXT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS current_latitude FLOAT"))
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS current_longitude FLOAT"))

        # Helpful indexes for dispatch lookups.
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_technicians_primary_domain ON technicians(primary_domain)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_technicians_availability_state ON technicians(availability_state)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_technicians_location_zone ON technicians(location_zone)"))

        conn.execute(text("""

        CREATE TABLE IF NOT EXISTS service_requests(
            id SERIAL PRIMARY KEY,
            customer_user_id INT,
            customer_name TEXT,
            customer_email TEXT,
            contact_number TEXT,
            location_text TEXT,
            location_zone TEXT,
            description TEXT,
            fault_type TEXT,
            severity TEXT,
            diagnosis_confidence FLOAT,
            image_severity TEXT,
            description_severity TEXT,
            safety_score INT,
            operational_impact INT,
            escalation_risk INT,
            safety_escalation BOOLEAN,
            diagnosis_reason TEXT,
            final_reasoning TEXT,
            latitude FLOAT,
            longitude FLOAT,
            assigned_technician INT,
            distance_km FLOAT,
            travel_time_min FLOAT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            assigned_at TIMESTAMP,
            completed_at TIMESTAMP
        );

        """))

        # Ensure required service request tracking fields exist on older tables.
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS customer_user_id INT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS customer_name TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS customer_email TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS contact_number TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS location_text TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS location_zone TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS description TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS diagnosis_confidence FLOAT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS image_severity TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS description_severity TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS safety_score INT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS operational_impact INT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS escalation_risk INT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS safety_escalation BOOLEAN"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS diagnosis_reason TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS final_reasoning TEXT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_technician INT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS distance_km FLOAT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS travel_time_min FLOAT"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP"))

        # Enforce standardized lifecycle states.
        conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'ck_service_requests_status'
            ) THEN
                ALTER TABLE service_requests
                ADD CONSTRAINT ck_service_requests_status
                CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled'));
            END IF;
        END $$;
        """))

        # Helpful index for operational queue reads.
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_service_requests_customer_user_id ON service_requests(customer_user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_service_requests_location_zone ON service_requests(location_zone)"))

        conn.execute(text("""

        CREATE TABLE IF NOT EXISTS dispatch_results(
            id SERIAL PRIMARY KEY,
            request_id INT,
            technician_id INT,
            travel_time INT,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        """))

        conn.execute(text("""

        CREATE TABLE IF NOT EXISTS users(
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            role TEXT NOT NULL DEFAULT 'customer',
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        """))

        # Schema evolution safety for users table.
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))

        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)"))

        conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'ck_users_role'
            ) THEN
                ALTER TABLE users
                ADD CONSTRAINT ck_users_role
                CHECK (role IN ('customer', 'technician', 'admin'));
            END IF;
        END $$;
        """))

        print("Tables created successfully")
        conn.commit()


if __name__ == "__main__":
    create_tables()