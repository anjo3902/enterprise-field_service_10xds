try:
    from sqlalchemy import create_engine, text

    # PostgreSQL connection string
    DATABASE_URL = "postgresql://postgres:root123@localhost:5432/dispatch_db"

    engine = create_engine(DATABASE_URL)
except Exception:
    # psycopg2 or PostgreSQL unavailable (e.g. cloud deploy using Firestore only)
    engine = None
    text = None


def test_connection():

    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))

        for row in result:
            print("PostgreSQL connected:")
            print(row[0])