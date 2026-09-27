import datetime
from database import SessionLocal, engine
import models, auth

models.Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    try:
        # Clear existing tables for a clean slate
        db.query(models.FeedPost).delete()
        db.query(models.EventMessage).delete()
        db.query(models.DirectMessage).delete()
        db.query(models.BadgeVote).delete()
        db.query(models.AudioSet).delete()
        db.query(models.QueueEntry).delete()
        db.query(models.Comic).delete()
        db.query(models.MicEvent).delete()
        db.query(models.MicSeries).delete()
        db.query(models.User).delete()
        db.commit()

        hashed_pw = auth.get_password_hash("password123")
        markets = ["austin", "dallas", "fort_worth", "houston", "san_antonio"]

        # 45 Famous Comedians to populate the directories
        comedians = [
            "Dave Chappelle", "Bill Burr", "Ali Wong", "John Mulaney", "Chris Rock",
            "Jerry Seinfeld", "Tom Segura", "Tig Notaro", "Taylor Tomlinson",
            "Norm Macdonald", "Mitch Hedberg", "George Carlin", "Richard Pryor",
            "Robin Williams", "Eddie Murphy", "Joan Rivers", "Patton Oswalt",
            "Sarah Silverman", "Wanda Sykes", "Kevin Hart", "Anthony Jeselnik",
            "Iliza Shlesinger", "Marc Maron", "Bert Kreischer", "Joe Rogan",
            "Hannibal Buress", "Jim Gaffigan", "Brian Regan", "Nate Bargatze",
            "Kathleen Madigan", "Sebastian Maniscalco", "Maria Bamford", "Mike Birbiglia",
            "Whitney Cummings", "Chelsea Peretti", "Jo Koy", "Ron White",
            "Bernie Mac", "Katt Williams", "Cedric Entertainer", "DL Hughley",
            "Aziz Ansari", "Kumail Nanjiani", "Roy Wood Jr", "Mark Normand"
        ]

        # 3 Baseline venues per market (will be copied across all 7 days)
        mic_configs = {
            "austin": [
                ("Vulcan Gas Open Mic", "Vulcan Gas Company", "418 E 6th St, Austin, TX", 30.2672, -97.7388, "Joe Rogan"),
                ("Creek & Cave Open", "The Creek and the Cave", "611 E 7th St, Austin, TX", 30.2680, -97.7360, "Tony Hinchcliffe"),
                ("Red River Mic", "Elysium", "705 Red River St, Austin, TX", 30.2682, -97.7366, "Brian Redban"),
            ],
            "dallas": [
                ("Hyena's Open Stage", "Hyena's Comedy Nightclub", "5321 E Mockingbird Ln, Dallas, TX", 32.8361, -96.7744, "Mark Cuban"),
                ("Deep Ellum Comedy Mic", "Dallas Comedy Club", "3036 Elm St, Dallas, TX", 32.7845, -96.7797, "Jamie Foxx"),
                ("Uptown Standup", "The Laugh Lounge", "Uptown, Dallas, TX", 32.8000, -96.8000, "Cristela Alonzo"),
            ],
            "fort_worth": [
                ("Stockyards Comedy", "Cowtown Coliseum", "121 E Exchange Ave, Fort Worth, TX", 32.7885, -97.3486, "Steve Trevino"),
                ("Sundance Square Mic", "Four Day Weekend", "312 Houston St, Fort Worth, TX", 32.7538, -97.3308, "Paul Varghese"),
                ("Magnolia Open Mic", "Live Oak", "Magnolia Ave, Fort Worth, TX", 32.7297, -97.3400, "Dustin Ybarra"),
            ],
            "houston": [
                ("Secret Group Open Mic", "The Secret Group", "2101 Polk St, Houston, TX", 29.7483, -95.3571, "Mo Amer"),
                ("Montrose Comedy Night", "Rudyard's", "2010 Waugh Dr, Houston, TX", 29.7547, -95.3985, "Ralphie May"),
                ("H-Town Improv Mic", "Houston Improv", "7620 Katy Fwy, Houston, TX", 29.7844, -95.4789, "Ali Siddiq"),
            ],
            "san_antonio": [
                ("River Walk Comedy", "Laugh Out Loud Club", "618 NW Loop 410, San Antonio, TX", 29.5222, -98.4815, "Cleto Rodriguez"),
                ("Alamo City Mic", "Blind Tiger Comedy", "902 NE Loop 410, San Antonio, TX", 29.5242, -98.4720, "Raymond Orta"),
                ("Pearl District Stage", "Jazz, TX", "312 Pearl Pkwy, San Antonio, TX", 29.4429, -98.4795, "Tom Segura"),
            ]
        }

        today = datetime.date.today()
        current_dow = today.weekday()
        comedian_idx = 0

        for m in markets:
            # Create the master host for the market
            host = models.User(
                username=f"{m}_host",
                email=f"{m}_host@example.com",
                hashed_password=hashed_pw,
                is_host=True,
                home_market=m
            )
            db.add(host)

            # Create 9 Famous Comics per market
            for i in range(9):
                raw_name = comedians[comedian_idx % len(comedians)]
                c_name = raw_name.replace(" ", "")
                comedian_idx += 1
                user = models.User(
                    username=c_name,
                    email=f"{c_name.lower()}@example.com",
                    hashed_password=hashed_pw,
                    is_host=False,
                    home_market=m
                )
                db.add(user)
            db.commit()

            # Schedule 3 Mics for EVERY day of the week
            for dow in range(7):
                for idx, (name, venue, address, lat, lng, host_name) in enumerate(mic_configs[m]):
                    
                    # Stagger the signup/start times
                    if idx == 0:
                        signup_time, start_time = datetime.time(19, 0), datetime.time(20, 0)
                    elif idx == 1:
                        signup_time, start_time = datetime.time(20, 0), datetime.time(21, 0)
                    else:
                        signup_time, start_time = datetime.time(21, 30), datetime.time(22, 0)

                    series = models.MicSeries(
                        name=f"{name}",
                        venue=venue,
                        address=address,
                        lat=lat,
                        lng=lng,
                        market=m,
                        host_pin="1234",
                        day_of_week=dow,
                        signup_time=signup_time,
                        start_time=start_time,
                        host_name=host_name,
                        default_stage_time=5
                    )
                    db.add(series)
                    db.commit()
                    db.refresh(series)

                    # If this loop hits today's day of the week, generate a live event!
                    if dow == current_dow:
                        event = models.MicEvent(
                            series_id=series.id,
                            event_date=today,
                            status="scheduled",
                            started_at=None
                        )
                        db.add(event)

            # Post a welcome message to the local feed
            feed = models.FeedPost(
                content=f"Welcome to the {m.replace('_', ' ').title()} comedy scene! Tonight's lineup is officially active.",
                post_type="user",
                market=m
            )
            db.add(feed)

        db.commit()
        print("Successfully seeded full-scale multi-market schedule with famous comics!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
