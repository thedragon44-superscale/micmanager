import sqlite3
import duckdb

DB_PATH = "mic_manager.db"

# Essential Texas Comedy Clubs & Major Open Mic Venues (Hardcoded Seeds)
ESSENTIAL_VENUES = [
  # AUSTIN
  ("Comedy Mothership", "320 E 6th St, Austin, TX 78701", "austin"),
  ("Vulcan Gas Company", "418 E 6th St, Austin, TX 78701", "austin"),
  ("The Creek and the Cave", "611 E 7th St, Austin, TX 78701", "austin"),
  ("Sunset Strip Comedy Club", "214 E 6th St, Austin, TX 78701", "austin"),
  ("Cap City Comedy Club", "11506 Century Oaks Terrace, Austin, TX 78758", "austin"),
  ("East Austin Comedy Club", "1303 E 4th St, Austin, TX 78702", "austin"),
  ("Rozco's Comedy Club", "1805 E 7th St, Austin, TX 78702", "austin"),
  ("Velveeta Room", "521 E 6th St, Austin, TX 78701", "austin"),
  ("Buzzkill Comedy", "1402 S Congress Ave, Austin, TX 78704", "austin"),
  ("The Romo Room", "2700 Esperanza Crossing, Austin, TX 78758", "austin"),
  
  # DALLAS & FORT WORTH (DFW)
  ("Dallas Comedy Club", "3036 Elm St, Dallas, TX 75226", "dallas"),
  ("Hyena's Comedy Nightclub Dallas", "5321 E Mockingbird Ln, Dallas, TX 75206", "dallas"),
  ("Hyena's Comedy Nightclub Fort Worth", "425 Commerce St, Fort Worth, TX 76102", "fort_worth"),
  ("Improv Comedy Club Addison", "4980 Belt Line Rd, Addison, TX 75001", "dallas"),
  ("Four Day Weekend Fort Worth", "312 Houston St, Fort Worth, TX 76102", "fort_worth"),
  ("Backdoor Comedy Club", "940 E Belt Line Rd, Richardson, TX 75081", "dallas"),
  ("Stomping Ground Comedy Theater", "1350 Manufacturing St, Dallas, TX 75207", "dallas"),
  
  # HOUSTON
  ("The Secret Group", "2101 Polk St, Houston, TX 77003", "houston"),
  ("Improv Houston", "7620 Katy Fwy, Houston, TX 77024", "houston"),
  ("Riot Comedy Club", "2015 Mulberry St, Houston, TX 77019", "houston"),
  ("Rudyard's British Pub", "2010 Waugh Dr, Houston, TX 77006", "houston"),
  ("Station Theater", "2219 Dunlavy St, Houston, TX 77006", "houston"),
  ("Comedy Hub Houston", "230 Leland St, Houston, TX 77002", "houston"),
  
  # SAN ANTONIO
  ("Laugh Out Loud Comedy Club", "618 NW Loop 410, San Antonio, TX 78216", "san_antonio"),
  ("Blind Tiger Comedy Club", "902 E Houston St, San Antonio, TX 78205", "san_antonio"),
  ("Upstage Comedy Lounge", "4441 Walzem Rd, San Antonio, TX 78218", "san_antonio"),
  ("The Overtime Theater", "5409 Bandera Rd, San Antonio, TX 78238", "san_antonio"),
]

def update_texas_venues():
    print("Connecting to DuckDB and querying Overture Maps S3 bucket...")
    
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    
    # Broad query: Pull ALL public-facing Texas commercial venues (bars, restaurants, cafes, event spaces, etc.)
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
        LIMIT 500000;
    """
    
    try:
        overture_venues = con.execute(query).fetchall()
        print(f"Extracted {len(overture_venues)} public Texas venues from Overture Maps.")

        db = sqlite3.connect(DB_PATH)
        cursor = db.cursor()

        # Re-create Full-Text Search virtual table
        cursor.execute("DROP TABLE IF EXISTS venues_fts;")
        cursor.execute("""
            CREATE VIRTUAL TABLE venues_fts USING fts5(
                name,
                address,
                city,
                tokenize = 'porter unicode61'
            );
        """)

        # Insert seed comedy clubs FIRST for maximum search priority
        cursor.executemany("INSERT INTO venues_fts(name, address, city) VALUES (?, ?, ?);", ESSENTIAL_VENUES)
        
        # Insert all public Texas establishments from Overture
        cursor.executemany("INSERT INTO venues_fts(name, address, city) VALUES (?, ?, ?);", overture_venues)

        db.commit()
        db.close()
        print("Successfully rebuilt local Texas venue index in SQLite FTS5!")

    except Exception as e:
        print(f"Error updating venues: {e}")

if __name__ == "__main__":
    update_texas_venues()
