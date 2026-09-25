import sqlite3
import duckdb

DB_PATH = "mic_manager.db"

def update_texas_venues():
    print("Fetching latest Texas venue dataset from Overture Maps...")
    
    con = duckdb.connect()
    
    # 1. Enable S3 reading extensions in DuckDB
    con.execute("INSTALL httpfs;")
    con.execute("LOAD httpfs;")
    con.execute("SET s3_region='us-west-2';")
    
    # 2. Query latest Overture Places dataset for Texas
    query = """
        SELECT 
            names.primary AS name,
            addresses[1].freeform AS address,
            LOWER(addresses[1].locality) AS city
        FROM read_parquet(
            's3://overturemaps-us-west-2/release/*/theme=places/type=place/*', 
            hive_partitioning=1
        )
        WHERE addresses[1].region = 'TX' 
          AND names.primary IS NOT NULL 
          AND addresses[1].freeform IS NOT NULL
        LIMIT 100000;
    """
    
    try:
        venues = con.execute(query).fetchall()
        print(f"Extracted {len(venues)} Texas venues from Overture Maps.")

        # 3. Save into local SQLite FTS5 Search Table
        db = sqlite3.connect(DB_PATH)
        cursor = db.cursor()

        cursor.execute("DROP TABLE IF EXISTS venues_fts;")
        cursor.execute("""
            CREATE VIRTUAL TABLE venues_fts USING fts5(
                name,
                address,
                city,
                tokenize = 'porter unicode61'
            );
        """)

        cursor.executemany("""
            INSERT INTO venues_fts(name, address, city) 
            VALUES (?, ?, ?);
        """, venues)

        db.commit()
        db.close()
        print("Successfully updated local venue search index!")

    except Exception as e:
        print(f"Error updating venues: {e}")

if __name__ == "__main__":
    update_texas_venues()
