import datetime
from database import SessionLocal, engine
import models, auth

models.Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    try:
        # Clear existing tables for a clean test baseline
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
        markets = ["austin", "dallas", "houston"]

        mic_configs = {
            "austin": [
                ("Vulcan Gas Open Mic", "Vulcan Gas Company"),
                ("Creek & Cave Open", "The Creek and the Cave"),
                ("Red River Mic", "Elysium"),
            ],
            "dallas": [
                ("Hyena's Open Stage", "Hyena's Comedy Nightclub"),
                ("Deep Ellum Comedy Mic", "Dallas Comedy Club"),
                ("Uptown Standup", "The Laugh Lounge"),
            ],
            "houston": [
                ("Secret Group Open Mic", "The Secret Group"),
                ("Montrose Comedy Night", "Rudyard's"),
                ("H-Town Improv Mic", "Houston Improv"),
            ]
        }

        today = datetime.date.today()
        now_time = datetime.datetime.now().time()

        for m in markets:
            # 1. Create 1 Host Account per market
            host = models.User(
                username=f"{m}_host",
                email=f"{m}_host@example.com",
                hashed_password=hashed_pw,
                is_host=True,
                home_market=m
            )
            db.add(host)

            # 2. Create 9 Comic Accounts per market
            for i in range(1, 10):
                user = models.User(
                    username=f"{m}_comic_{i}",
                    email=f"{m}_comic_{i}@example.com",
                    hashed_password=hashed_pw,
                    is_host=False,
                    home_market=m
                )
                db.add(user)

            # 3. Create 3 Mics per market
            for idx, (name, venue) in enumerate(mic_configs[m]):
                series = models.MicSeries(
                    name=name,
                    venue=venue,
                    market=m,
                    host_pin="1234",
                    day_of_week=today.weekday(),
                    start_time=now_time,
                    default_stage_time=5
                )
                db.add(series)
                db.commit()
                db.refresh(series)

                # All mics start as 'scheduled' until host clocks in
                event = models.MicEvent(
                    series_id=series.id,
                    event_date=today,
                    status="scheduled",
                    started_at=None
                )
                db.add(event)

            # 4. Add initial feed post per market
            feed = models.FeedPost(
                content=f"Welcome to the {m.title()} comedy scene! Tonight's lineup is posted.",
                post_type="user",
                market=m
            )
            db.add(feed)

        db.commit()
        print("Successfully seeded multi-market test data!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
