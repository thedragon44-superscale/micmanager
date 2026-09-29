from typing import Optional
import io
from PIL import Image
import os
import boto3
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks, status, UploadFile, File, Form, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from pydantic import BaseModel
import models, schemas, auth
from database import engine, get_db
import datetime
import asyncio
import sqlite3
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler

load_dotenv()

models.Base.metadata.create_all(bind=engine)

# Ensure raw SQL social tables and feed post columns exist on startup
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS feed_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            likes_count INTEGER DEFAULT 0
        );
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS feed_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_type TEXT NOT NULL,
            target_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL
        );
    """))
    
    # Auto-migration: ensure feed_posts table has author_name, media_url, and media_type columns
    for col in [("author_name", "TEXT"), ("media_url", "TEXT"), ("media_type", "TEXT")]:
        try:
            conn.execute(text(f"ALTER TABLE feed_posts ADD COLUMN {col[0]} {col[1]};"))
            conn.commit()
        except Exception:
            pass # Column already exists

    conn.commit()

# Initialize MinIO (S3) Client
s3_client = boto3.client(
    's3',
    endpoint_url=os.getenv("MINIO_URL"),
    aws_access_key_id=os.getenv("MINIO_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("MINIO_SECRET_KEY"),
)
MINIO_BUCKET = os.getenv("MINIO_BUCKET")
MINIO_AUDIO_BUCKET = os.getenv("MINIO_AUDIO_BUCKET")

# --- GRACE PERIOD SWEEPER (Runs in background via APScheduler) ---
async def check_missed_mics():
    db = next(get_db())
    try:
        now = datetime.datetime.now()
        current_date = now.date()
        current_time = now.time()
        
        pending_events = db.query(models.MicEvent).join(models.MicSeries).filter(
            models.MicEvent.event_date == current_date,
            models.MicEvent.status == "scheduled",
            models.MicSeries.is_archived == False
        ).all()

        for event in pending_events:
            start_dt = datetime.datetime.combine(current_date, event.series.start_time)
            grace_period_end = start_dt + datetime.timedelta(hours=1)

            if now > grace_period_end:
                event.status = "missed"
                event.series.consecutive_misses += 1
                
                if event.series.consecutive_misses >= 4:
                    event.series.is_archived = True
                    print(f"ARCHIVED: {event.series.name} due to 4 consecutive misses.")
        
        db.commit()
    except Exception as e:
        print(f"Sweeper error: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = next(get_db())
    try:
        if db.query(models.MicSeries).count() == 0:
            s1 = models.MicSeries(name="Sunset Comedy Mic", venue="Vulcan Gas Company", host_pin="1234", day_of_week=5, start_time=datetime.time(20, 0))
            db.add(s1)
            db.commit()
            db.refresh(s1)
            e1 = models.MicEvent(series_id=s1.id, event_date=datetime.date.today(), status="scheduled")
            db.add(e1)

            s2 = models.MicSeries(name="East Austin Open", venue="The Creek and the Cave", host_pin="5678", day_of_week=5, start_time=datetime.time(21, 0))
            db.add(s2)
            db.commit()
            db.refresh(s2)
            e2 = models.MicEvent(series_id=s2.id, event_date=datetime.date.today(), status="scheduled")
            db.add(e2)

            db.commit()
            
    finally:
        db.close()

    # Initialize and start the background scheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_missed_mics, 'interval', minutes=1)
    scheduler.start()
    
    yield
    
    # Gracefully shut down the scheduler when the app stops
    scheduler.shutdown()

# --- INITIALIZE APP ---
app = FastAPI(title="Austin Mic Manager API", lifespan=lifespan)

# Parse allowed origins from .env
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WEBSOCKET CONNECTION MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, event_id: int):
        await websocket.accept()
        if event_id not in self.active_connections:
            self.active_connections[event_id] = []
        self.active_connections[event_id].append(websocket)

    def disconnect(self, websocket: WebSocket, event_id: int):
        if event_id in self.active_connections:
            self.active_connections[event_id].remove(websocket)
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]

    async def broadcast(self, event_id: int, message: str = "REFRESH_QUEUE"):
        if event_id in self.active_connections:
            for connection in self.active_connections[event_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

manager = ConnectionManager()

@app.websocket("/ws/{event_id}")
async def websocket_endpoint(websocket: WebSocket, event_id: int):
    await manager.connect(websocket, event_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Intercept frontend heartbeat to prevent Cloudflare from terminating idle sockets
            if data == "PING":
                await websocket.send_text("PONG")
    except WebSocketDisconnect:
        manager.disconnect(websocket, event_id)

# --- API ENDPOINTS ---

@app.get("/venues/autocomplete")
def autocomplete_venues(query: str = Query("", alias="query"), market: str = "austin"):
    if not query or len(query.strip()) < 2:
        return []

    fts_query = " ".join([f"{word}*" for word in query.strip().split()])
    market_clean = market.lower().replace("_", " ")

    conn = sqlite3.connect("mic_manager.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        sql = """
            SELECT name, address, city 
            FROM venues_fts 
            WHERE venues_fts MATCH ? 
              AND city LIKE ?
            LIMIT 6;
        """
        rows = cursor.execute(sql, (fts_query, f"%{market_clean}%")).fetchall()
        
        if not rows:
            sql_fallback = "SELECT name, address, city FROM venues_fts WHERE venues_fts MATCH ? LIMIT 6;"
            rows = cursor.execute(sql_fallback, (fts_query,)).fetchall()

        return [dict(row) for row in rows]
    except Exception:
        return []
    finally:
        conn.close()

@app.get("/events/today")
def get_todays_events(market: str = "austin", db: Session = Depends(get_db)):
    events = db.query(models.MicEvent).join(models.MicSeries).filter(models.MicSeries.market == market).all()
    result = []
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    for event in events:
        series = db.query(models.MicSeries).filter(models.MicSeries.id == event.series_id).first()
        if series:
            result.append({
                "id": event.id,
                "series_id": event.series_id,
                "name": series.name,
                "venue": series.venue,
                "address": series.address,
                "lat": series.lat,
                "lng": series.lng,
                "status": event.status,
                "event_date": str(event.event_date),
                "day_of_week": days[series.day_of_week] if series.day_of_week is not None else "Unknown",
                "signup_time": series.signup_time.strftime("%I:%M %p") if series.signup_time else "TBD",
                "start_time": series.start_time.strftime("%I:%M %p") if series.start_time else "TBD",
                "host_name": series.host_name or "TBD"
            })
    return result

@app.get("/mics/active", response_model=list[schemas.MicEventResponse])
def get_active_events(market: str = "austin", db: Session = Depends(get_db)):
    events = db.query(models.MicEvent).join(models.MicSeries).filter(
        models.MicEvent.status.in_(["scheduled", "active"]),
        models.MicSeries.is_archived == False,
        models.MicSeries.market == market
    ).all()
    
    result = []
    for e in events:
        result.append({
            "id": e.id,
            "series_id": e.series_id,
            "name": e.series.name,
            "venue": e.series.venue,
            "status": e.status,
            "event_date": e.event_date
        })
    return result

@app.post("/series/", response_model=dict)
def create_series(series: schemas.MicSeriesCreate, db: Session = Depends(get_db)):
    db_series = models.MicSeries(
        name=series.name,
        venue=series.venue,
        market=series.market,
        host_pin=series.host_pin,
        day_of_week=series.day_of_week,
        start_time=series.start_time,
        default_stage_time=series.default_stage_time
    )
    db.add(db_series)
    
    feed_post = models.FeedPost(
        content=f"A new mic '{series.name}' was just added to the rotation at {series.venue}!",
        post_type="mic_listed",
        market=series.market
    )
    db.add(feed_post)
    
    db.commit()
    db.refresh(db_series)
    return {"message": "Series created", "id": db_series.id}


# --- AUTHENTICATION & PROFILES ---

WELCOME_GUIDE = """## Welcome to Open Mic Manager
Built for comics, hosts, and the local scene. This app replaces messy Facebook groups, chaotic paper lists, and scattered group chats with a single, real-time hub. Here is everything you can do right now.

### 📍 The Radar & Virtual Rooms
The home screen is your logistics hub, replacing the clipboard so you never have to shoulder-tap a host again.
* **Dynamic Radar:** A live map that automatically centers on your active city to show exactly where mics are located.
* **No More Ghost Mics:** The system actively monitors showrunner activity. If a mic goes four consecutive weeks without a host clocking in, it is automatically purged from the board to keep the directory strictly accurate.
* **Live Roster Preview:** Tap "Roster" on any active mic to see exactly who is on the list, on stage, or on deck in real-time.
* **Instant Sign-Up & Tickets:** When the host clocks in, the list opens. Tap to secure your spot. Your button changes to "My Ticket" as absolute proof of placement.
* **Stage Notifications:** The app tracks your exact status and sends alerts when you are bumped to "On Deck" so you never miss a cue.
* **Live Mic Chat:** Every active mic features a dedicated real-time chatroom. Coordinate parking, ask if the list is capped, or talk with the back of the room without blowing up group texts.

### 🎙️ Set Tracking & The Audio Vault
Stop asking the host to hit record on your phone before you walk up.
* **Auto-Recorded Sets:** When a host marks you as "On Stage," the app automatically handles the audio capture for your set.
* **Personal Logbook:** Every mic you perform at through the app is permanently tracked on your profile. You get a perfect, searchable archive of your stage time, complete with the attached audio files, so you can review your material and visually track your grind over time.

### 🎭 The Scene & Direct Networking
Comedy is a community. This is your local watercooler and rolodex.
* **The Feed:** Drop text posts, hype up a great room, or talk trash. Every post supports likes and deep-linked comment threads.
* **The Directory:** A complete, searchable roster of every registered comic in your market. 
* **1-on-1 Messaging:** Hit the "Message" button on any comic's profile to instantly spin up a private chat thread in your Direct Inbox.
* **Cross-Market Browsing:** Traveling? Switch your active market at the top of the screen, and the Feed, Directory, and Map will instantly swap to that city's local scene.

### 🎤 Host Controls (For Showrunners)
If you run a room, this app gives you god-mode over your list.
* **Clocking In:** You strictly control when the list opens. The public cannot sign up until you flip the switch.
* **Queue Management:** Seamlessly move comics around, bump them up, or drop them if they no-show.
* **Live Status Updates:** Mark comics as "On Deck" or "On Stage" to instantly push updates to the public Roster Modal so the whole room knows exactly who is up next."""

@app.post("/users/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    account_username = user.username or user.name
    if not account_username:
        raise HTTPException(status_code=400, detail="Username or name is required")

    existing_user = db.query(models.User).filter(
        (models.User.username == account_username) | (models.User.email == user.email)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
        
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=account_username,
        email=user.email,
        hashed_password=hashed_password,
        home_market=user.home_market
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # --- INJECT SYSTEM WELCOME MESSAGE ---
    system_bot = db.query(models.User).filter(models.User.username == "Stage System").first()
    
    if system_bot:
        welcome_message = models.DirectMessage(
            sender_id=system_bot.id,
            recipient_id=db_user.id,
            content=WELCOME_GUIDE,
            message_type="text"
        )
        db.add(welcome_message)
        db.commit()
    # --------------------------------------

    return db_user

@app.post("/users/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = datetime.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "user_id": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/{user_id}/avatar")
async def upload_avatar(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    file_name = f"avatars/{user_id}.webp"
    
    try:
        s3_client.upload_fileobj(
            file.file, 
            MINIO_BUCKET, 
            file_name, 
            ExtraArgs={"ContentType": "image/webp"}
        )
        
        avatar_url = f"{os.getenv('MINIO_URL')}/{MINIO_BUCKET}/{file_name}"
        
        user.avatar_url = avatar_url
        db.commit()
        
        return {"status": "success", "avatar_url": avatar_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/users/{user_id}/ig_handle")
def update_ig_handle(user_id: int, request: schemas.IGHandleUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    clean_handle = request.ig_handle.replace("@", "").strip()
    user.ig_handle = clean_handle
    db.commit()
    
    return {"status": "success", "ig_handle": user.ig_handle, "message": "Instagram handle updated!"}

@app.get("/users/{user_id}/profile", response_model=schemas.ProfileResponse)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    comics = db.query(models.Comic).filter(models.Comic.user_id == user_id).all()
    comic_ids = [c.id for c in comics]
    
    total_signups = db.query(models.QueueEntry).filter(models.QueueEntry.comic_id.in_(comic_ids)).count()
    good_standings = db.query(models.QueueEntry).filter(
        models.QueueEntry.comic_id.in_(comic_ids),
        models.QueueEntry.status.in_(["completed", "excused"])
    ).count()
    
    attendance_pct = 100 
    if total_signups > 0:
        attendance_pct = int((good_standings / total_signups) * 100)
        
    votes = db.query(
        models.BadgeVote.category, 
        func.sum(models.BadgeVote.points).label("total_points")
    ).filter(
        models.BadgeVote.target_id == user_id
    ).group_by(models.BadgeVote.category).all()
    
    unlocked_badges = [vote.category for vote in votes if vote.total_points and vote.total_points >= 10]
    
    return {
        "id": user.id,
        "username": user.username,
        "is_host": user.is_host,
        "home_market": user.home_market,
        "avatar_url": user.avatar_url,
        "ig_handle": user.ig_handle,
        "registered_date": user.created_at.date(),
        "attendance_percentage": attendance_pct,
        "badges": unlocked_badges
    }

@app.post("/users/{target_id}/vote")
def vote_for_badge(target_id: int, voter_id: int, vote: schemas.BadgeVoteCreate, db: Session = Depends(get_db)):
    voter = db.query(models.User).filter(models.User.id == voter_id).first()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")
        
    existing_vote = db.query(models.BadgeVote).filter(
        models.BadgeVote.voter_id == voter_id,
        models.BadgeVote.target_id == target_id,
        models.BadgeVote.category == vote.category
    ).first()
    
    if existing_vote:
        raise HTTPException(status_code=400, detail="You have already endorsed this comic for this badge.")
        
    points = 3.34 if voter.is_host else 1.0
    
    new_vote = models.BadgeVote(
        voter_id=voter_id,
        target_id=target_id,
        category=vote.category,
        points=points
    )
    db.add(new_vote)
    db.commit()
    
    return {"message": f"Endorsement recorded! Added {points} points."}

# --- QUEUE & STAGE CONTROLS ---

@app.post("/events/{event_id}/activate")
def activate_event(event_id: int, pin: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    event = db.query(models.MicEvent).filter(models.MicEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    series = db.query(models.MicSeries).filter(models.MicSeries.id == event.series_id).first()
    if not series or str(series.host_pin) != str(pin):
        raise HTTPException(status_code=403, detail="Invalid Host PIN")
    
    event.status = "active"
    event.started_at = datetime.datetime.now(datetime.timezone.utc)
    series.consecutive_misses = 0 
    
    feed_post = models.FeedPost(
        content=f"The host just clocked in for '{series.name}' at {series.venue}. The mic is officially LIVE!",
        post_type="mic_started",
        market=series.market
    )
    db.add(feed_post)
    
    db.commit()
    db.refresh(event)
    
    background_tasks.add_task(manager.broadcast, event_id)
    return {"status": "activated", "event_id": event.id, "message": "Mic is now active!"}

@app.post("/events/{event_id}/register", response_model=schemas.QueueEntryResponse)
def register_comic(event_id: int, comic: schemas.ComicRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    matched_user = db.query(models.User).filter(models.User.username == comic.name).first()
    linked_user_id = matched_user.id if matched_user else None

    db_comic = db.query(models.Comic).filter(models.Comic.name == comic.name).first()
    if not db_comic:
        db_comic = models.Comic(name=comic.name, push_enabled=comic.push_enabled, user_id=linked_user_id)
        db.add(db_comic)
        db.commit()
        db.refresh(db_comic)
    elif not db_comic.user_id and linked_user_id:
        db_comic.user_id = linked_user_id
        db.commit()

    current_count = db.query(models.QueueEntry).filter(models.QueueEntry.event_id == event_id).count()
    
    new_entry = models.QueueEntry(
        event_id=event_id,
        comic_id=db_comic.id,
        position=current_count + 1,
        status="waiting"
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    
    background_tasks.add_task(manager.broadcast, event_id)

    return {
        "id": new_entry.id,
        "comic_id": db_comic.id,
        "comic_name": db_comic.name,
        "status": new_entry.status,
        "position": new_entry.position
    }

@app.get("/events/{event_id}/queue", response_model=list[schemas.QueueEntryResponse])
def get_event_queue(event_id: int, db: Session = Depends(get_db)):
    entries = db.query(models.QueueEntry).filter(
        models.QueueEntry.event_id == event_id,
        models.QueueEntry.status != "completed"
    ).order_by(models.QueueEntry.position).all()
    
    return [
        {"id": e.id, "comic_id": e.comic_id, "comic_name": e.comic.name, "status": e.status, "position": e.position}
        for e in entries
    ]

@app.post("/events/{event_id}/advance")
def advance_queue(event_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    on_stage = db.query(models.QueueEntry).filter(
        models.QueueEntry.event_id == event_id, models.QueueEntry.status == "on_stage"
    ).first()
    if on_stage: on_stage.status = "completed"

    next_up = db.query(models.QueueEntry).filter(
        models.QueueEntry.event_id == event_id, models.QueueEntry.status.in_(["on_deck", "waiting"])
    ).order_by(models.QueueEntry.position).first()
    
    if next_up:
        next_up.status = "on_stage"
        new_on_deck = db.query(models.QueueEntry).filter(
            models.QueueEntry.event_id == event_id, models.QueueEntry.status == "waiting", models.QueueEntry.id != next_up.id
        ).order_by(models.QueueEntry.position).first()
        if new_on_deck: new_on_deck.status = "on_deck"

    db.commit()
    background_tasks.add_task(manager.broadcast, event_id)
    return {"message": "Queue advanced"}

@app.post("/events/{event_id}/swap")
def swap_spots(event_id: int, comic_id_1: int, comic_id_2: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    entry1 = db.query(models.QueueEntry).filter(models.QueueEntry.event_id == event_id, models.QueueEntry.comic_id == comic_id_1, models.QueueEntry.status == "waiting").first()
    entry2 = db.query(models.QueueEntry).filter(models.QueueEntry.event_id == event_id, models.QueueEntry.comic_id == comic_id_2, models.QueueEntry.status == "waiting").first()

    if not entry1 or not entry2:
        raise HTTPException(status_code=400, detail="Both comics must be waiting to swap.")

    entry1.position, entry2.position = entry2.position, entry1.position
    db.commit()
    
    background_tasks.add_task(manager.broadcast, event_id)
    return {"message": "Spots swapped"}

@app.post("/events/{event_id}/end")
def end_event(event_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    event = db.query(models.MicEvent).filter(models.MicEvent.id == event_id).first()
    series_name = "A mic"
    if event:
        event.status = "completed"
        series = db.query(models.MicSeries).filter(models.MicSeries.id == event.series_id).first()
        if series:
            series_name = f"'{series.name}'"
    
    entries = db.query(models.QueueEntry).filter(
        models.QueueEntry.event_id == event_id,
        models.QueueEntry.status != "completed"
    ).all()
    
    for entry in entries:
        entry.status = "completed"
        
    db.query(models.EventMessage).filter(models.EventMessage.event_id == event_id).delete()
    
    market_val = series.market if 'series' in locals() and series else "austin"
    feed_post = models.FeedPost(
        content=f"{series_name} has officially ended for the night. Great sets everyone!",
        post_type="mic_ended",
        market=market_val
    )
    db.add(feed_post)
        
    db.commit()
    
    background_tasks.add_task(manager.broadcast, event_id, "MIC_ENDED")
    return {"message": "Mic ended and chat wiped successfully"}

@app.post("/debug/seed")
def seed_db(db: Session = Depends(get_db)):
    series = models.MicSeries(
        name="Sunset Comedy Mic",
        venue="Vulcan Gas Company",
        host_pin="1234",
        day_of_week=datetime.datetime.today().weekday(),
        start_time=datetime.datetime.now().time(),
        default_stage_time=5
    )
    db.add(series)
    db.commit()
    db.refresh(series)

    event = models.MicEvent(
        series_id=series.id,
        event_date=datetime.datetime.today().date(),
        status="active" 
    )
    db.add(event)
    db.commit()
    
    return {"message": "Database seeded with a Mic Series and tonight's active Event!"}

# --- MIC CHAT (EVENT MESSAGES) ---

@app.get("/events/{event_id}/chat", response_model=list[schemas.EventMessageResponse])
def get_mic_chat(event_id: int, db: Session = Depends(get_db)):
    messages = db.query(models.EventMessage).filter(
        models.EventMessage.event_id == event_id
    ).order_by(models.EventMessage.created_at.asc()).all()
    return messages

@app.post("/events/{event_id}/chat", response_model=schemas.EventMessageResponse)
def post_mic_chat(event_id: int, message: schemas.EventMessageCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    new_message = models.EventMessage(
        event_id=event_id,
        guest_name=message.guest_name or "Anonymous Comic",
        content=message.content
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    background_tasks.add_task(manager.broadcast, event_id, "REFRESH_CHAT")
    return new_message

# --- SPOT SWAP HANDSHAKE ---

@app.post("/events/{event_id}/swap/request")
def request_swap(event_id: int, sender_id: int, target_id: int, background_tasks: BackgroundTasks):
    background_tasks.add_task(manager.broadcast, event_id, f"SWAP_REQ:{target_id}:{sender_id}")
    return {"status": "request_sent"}

@app.post("/events/{event_id}/swap/respond")
def respond_swap(
    event_id: int, target_id: int, sender_id: int, accepted: bool, 
    background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    if accepted:
        entry1 = db.query(models.QueueEntry).filter(
            models.QueueEntry.event_id == event_id, 
            models.QueueEntry.comic_id == sender_id, 
            models.QueueEntry.status == "waiting"
        ).first()
        
        entry2 = db.query(models.QueueEntry).filter(
            models.QueueEntry.event_id == event_id, 
            models.QueueEntry.comic_id == target_id, 
            models.QueueEntry.status == "waiting"
        ).first()

        if entry1 and entry2:
            entry1.position, entry2.position = entry2.position, entry1.position
            db.commit()
            background_tasks.add_task(manager.broadcast, event_id, "REFRESH_QUEUE")
    
    status_msg = "ACCEPTED" if accepted else "DECLINED"
    background_tasks.add_task(manager.broadcast, event_id, f"SWAP_RES:{sender_id}:{status_msg}")
    return {"status": "response_processed"}

@app.post("/events/{event_id}/swap/execute")
def execute_swap(
    event_id: int, target_id: int, sender_id: int, 
    background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    entry1 = db.query(models.QueueEntry).filter(
        models.QueueEntry.event_id == event_id, models.QueueEntry.comic_id == sender_id, models.QueueEntry.status == "waiting"
    ).first()
    
    entry2 = db.query(models.QueueEntry).filter(
        models.QueueEntry.event_id == event_id, models.QueueEntry.comic_id == target_id, models.QueueEntry.status == "waiting"
    ).first()

    if entry1 and entry2:
        entry1.position, entry2.position = entry2.position, entry1.position
        
        sys_msg = models.EventMessage(
            event_id=event_id,
            guest_name="🎙️ SYSTEM",
            content=f"Swap successful! {entry1.comic.name} and {entry2.comic.name} have traded spots."
        )
        db.add(sys_msg)
        db.commit()
        
        background_tasks.add_task(manager.broadcast, event_id, "REFRESH_QUEUE")
        background_tasks.add_task(manager.broadcast, event_id, "REFRESH_CHAT")
        return {"status": "success"}
        
    raise HTTPException(status_code=400, detail="Swap failed. Both comics must be in waiting status.")

# --- PRIVATE AUDIO VAULT ---

@app.post("/users/{user_id}/audio", response_model=schemas.AudioSetResponse)
async def upload_audio_set(
    user_id: int, 
    file: UploadFile = File(...), 
    event_id: int | None = Form(None),
    title: str | None = Form(None),
    duration_seconds: int = Form(0),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    timestamp = int(datetime.datetime.now().timestamp())
    file_key = f"sets/{user_id}/{timestamp}_{file.filename}"
    
    try:
        s3_client.upload_fileobj(
            file.file, 
            MINIO_AUDIO_BUCKET, 
            file_key, 
            ExtraArgs={"ContentType": file.content_type}
        )
        
        set_title = title
        if not set_title and event_id:
            event = db.query(models.MicEvent).filter(models.MicEvent.id == event_id).first()
            if event:
                series = db.query(models.MicSeries).filter(models.MicSeries.id == event.series_id).first()
                if series:
                    set_title = f"{series.name} - {datetime.date.today()}"
        
        if not set_title:
            set_title = f"Set - {datetime.date.today()}"

        audio_set = models.AudioSet(
            user_id=user_id,
            event_id=event_id,
            file_url=file_key, 
            title=set_title,
            duration_seconds=duration_seconds
        )
        db.add(audio_set)
        db.commit()
        db.refresh(audio_set)
        
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': MINIO_AUDIO_BUCKET, 'Key': file_key},
            ExpiresIn=3600
        )
        
        response_data = audio_set.__dict__.copy()
        response_data['file_url'] = presigned_url
        
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/audio", response_model=list[schemas.AudioSetResponse])
def get_user_audio_sets(user_id: int, db: Session = Depends(get_db)):
    sets = db.query(models.AudioSet).filter(
        models.AudioSet.user_id == user_id
    ).order_by(models.AudioSet.created_at.desc()).all()
    
    result = []
    for s in sets:
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': MINIO_AUDIO_BUCKET, 'Key': s.file_url},
            ExpiresIn=3600
        )
        
        set_data = s.__dict__.copy()
        set_data['file_url'] = presigned_url
        result.append(set_data)
        
    return result

@app.get("/users/{user_id}/history", response_model=list[schemas.SetHistoryResponse])
def get_user_history(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return []

    comics = db.query(models.Comic).filter(
        (models.Comic.user_id == user_id) | (models.Comic.name == user.username)
    ).all()
    
    for c in comics:
        if not c.user_id:
            c.user_id = user_id
    db.commit()

    comic_ids = [c.id for c in comics]
    
    entries = []
    if comic_ids:
        entries = db.query(models.QueueEntry).join(
            models.MicEvent, models.QueueEntry.event_id == models.MicEvent.id
        ).join(
            models.MicSeries, models.MicEvent.series_id == models.MicSeries.id
        ).filter(
            models.QueueEntry.comic_id.in_(comic_ids)
        ).order_by(
            models.MicEvent.event_date.desc()
        ).all()

    result = []
    matched_audio_ids = set()

    for e in entries:
        event = db.query(models.MicEvent).filter(models.MicEvent.id == e.event_id).first()
        series = db.query(models.MicSeries).filter(models.MicSeries.id == event.series_id).first() if event else None

        audio = db.query(models.AudioSet).filter(
            models.AudioSet.user_id == user_id,
            models.AudioSet.event_id == e.event_id
        ).order_by(models.AudioSet.created_at.desc()).first()

        if not audio:
            audio = db.query(models.AudioSet).filter(
                models.AudioSet.user_id == user_id,
                models.AudioSet.event_id.is_(None),
                models.AudioSet.id.notin_(matched_audio_ids)
            ).order_by(models.AudioSet.created_at.desc()).first()

        presigned_url = None
        duration = 0
        if audio:
            matched_audio_ids.add(audio.id)
            try:
                presigned_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': MINIO_AUDIO_BUCKET, 'Key': audio.file_url},
                    ExpiresIn=3600
                )
                duration = audio.duration_seconds
            except Exception as err:
                print("Presigned URL error:", err)

        result.append({
            "id": e.id,
            "event_id": e.event_id,
            "event_date": event.event_date if event else datetime.date.today(),
            "mic_name": series.name if series else "Open Mic",
            "venue": series.venue if series else "",
            "status": e.status,
            "position": e.position,
            "audio_url": presigned_url,
            "duration_seconds": duration
        })

    standalone_audios = db.query(models.AudioSet).filter(
        models.AudioSet.user_id == user_id,
        models.AudioSet.id.notin_(matched_audio_ids)
    ).order_by(models.AudioSet.created_at.desc()).all()

    for audio in standalone_audios:
        presigned_url = None
        try:
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': MINIO_AUDIO_BUCKET, 'Key': audio.file_url},
                ExpiresIn=3600
            )
        except Exception as err:
            print("Presigned URL error:", err)

        mic_name = audio.title or "Vault Recording"
        venue_name = "Private Vault"
        event_date_val = audio.created_at.date() if hasattr(audio, 'created_at') and audio.created_at else datetime.date.today()

        if audio.event_id:
            event = db.query(models.MicEvent).filter(models.MicEvent.id == audio.event_id).first()
            if event:
                event_date_val = event.event_date
                series = db.query(models.MicSeries).filter(models.MicSeries.id == event.series_id).first()
                if series:
                    mic_name = series.name
                    venue_name = series.venue

        result.append({
            "id": 10000 + audio.id,
            "event_id": audio.event_id,
            "event_date": event_date_val,
            "mic_name": mic_name,
            "venue": venue_name,
            "status": "completed",
            "position": 0,
            "audio_url": presigned_url,
            "duration_seconds": audio.duration_seconds
        })

    return result

# --- SCENE DIRECTORY ---

@app.get("/directory", response_model=list[schemas.DirectoryUserResponse])
def get_scene_directory(market: str = "austin", db: Session = Depends(get_db)):
    users = db.query(models.User).filter(
        models.User.home_market == market,
        models.User.username != "Stage System"
    ).order_by(models.User.username.asc()).all()
    return users

# --- SOCIAL FEED INTERACTIONS ---

class FeedInteractionPayload(BaseModel):
    user_id: int

class FeedCommentPayload(BaseModel):
    post_id: int
    author_id: int
    author_name: str
    content: str
    timestamp: str

# --- SECURE MEDIA STREAMING PROXY (Dual route for Nginx / API compatibility) ---
@app.get("/media/{bucket}/{key:path}")
@app.get("/api/media/{bucket}/{key:path}")
def proxy_media_file(bucket: str, key: str):
    try:
        s3_obj = s3_client.get_object(Bucket=bucket, Key=key)
        return StreamingResponse(
            s3_obj['Body'],
            media_type=s3_obj.get('ContentType', 'image/webp'),
            headers={
                "Cache-Control": "public, max-age=31536000",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Media file not found")


@app.get("/feed")
def get_feed(market: str = "austin", limit: int = 50, db: Session = Depends(get_db)):
    posts = db.query(models.FeedPost).filter(
        models.FeedPost.market == market
    ).order_by(models.FeedPost.created_at.desc()).limit(limit).all()

    result = []
    for post in posts:
        author_name = getattr(post, "author_name", None)
        if not author_name and getattr(post, "author_id", None):
            user = db.query(models.User).filter(models.User.id == post.author_id).first()
            if user:
                author_name = user.username

        raw_media = getattr(post, "media_url", None)
        media_type = getattr(post, "media_type", None)

        # Standardize media_url to route through HTTPS media proxy
        media_url = None
        if raw_media:
            if "/media/" in raw_media:
                media_url = f"/media/{raw_media.split('/media/')[-1]}"
            elif f"/{MINIO_BUCKET}/" in raw_media:
                key_part = raw_media.split(f"/{MINIO_BUCKET}/")[-1]
                media_url = f"/media/{MINIO_BUCKET}/{key_part}"
            else:
                media_url = raw_media

        is_sys = getattr(post, "is_system", False) or (getattr(post, "post_type", "") in ["mic_started", "mic_ended", "mic_listed"])

        result.append({
            "id": post.id,
            "author_id": post.author_id,
            "author_name": author_name or "Comic User",
            "content": post.content or "",
            "market": post.market,
            "media_url": media_url,
            "media_type": media_type,
            "timestamp": post.created_at.strftime("%b %d, %I:%M %p") if hasattr(post, "created_at") and post.created_at else "Just now",
            "likes_count": getattr(post, "likes_count", 0) or 0,
            "comments_count": getattr(post, "comments_count", 0) or 0,
            "user_liked": False,
            "is_system": is_sys
        })

    return result


@app.post("/feed")
async def create_feed_post(
    author_id: int = Form(...),
    content: Optional[str] = Form(""),
    author_name: Optional[str] = Form(None),
    market: Optional[str] = Form("austin"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == author_id).first()
    clean_author_name = author_name or (user.username if user else "Comic User")
    clean_market = market or (user.home_market if user else "austin")

    media_url = None
    media_type = None

    if file and file.filename:
        timestamp = int(datetime.datetime.now().timestamp())
        content_type = file.content_type or ""

        if content_type.startswith("image/"):
            media_type = "image"
            file_key = f"feed_media/{author_id}_{timestamp}.webp"

            try:
                raw_bytes = await file.read()
                img = Image.open(io.BytesIO(raw_bytes))

                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")

                # Auto-compress image to max 1080p width/height to save Pi disk space
                img.thumbnail((1080, 1080), Image.Resampling.LANCZOS)

                output_buffer = io.BytesIO()
                img.save(output_buffer, format="WEBP", quality=75, optimize=True)
                output_buffer.seek(0)

                s3_client.upload_fileobj(
                    output_buffer,
                    MINIO_BUCKET,
                    file_key,
                    ExtraArgs={"ContentType": "image/webp"}
                )
                media_url = f"/media/{MINIO_BUCKET}/{file_key}"
            except Exception as img_err:
                print("Image processing error:", img_err)
                raise HTTPException(status_code=500, detail="Failed to compress and upload image.")

        elif content_type.startswith("video/"):
            media_type = "video"
            ext = file.filename.split(".")[-1] if "." in file.filename else "mp4"
            file_key = f"feed_media/{author_id}_{timestamp}.{ext}"

            try:
                s3_client.upload_fileobj(
                    file.file,
                    MINIO_BUCKET,
                    file_key,
                    ExtraArgs={"ContentType": content_type}
                )
                media_url = f"/media/{MINIO_BUCKET}/{file_key}"
            except Exception as vid_err:
                print("Video upload error:", vid_err)
                raise HTTPException(status_code=500, detail="Failed to upload video.")

    new_post = models.FeedPost(
        author_id=author_id,
        content=content or "",
        post_type="user",
        market=clean_market
    )

    if hasattr(models.FeedPost, "author_name"):
        setattr(new_post, "author_name", clean_author_name)
    if hasattr(models.FeedPost, "media_url"):
        setattr(new_post, "media_url", media_url)
    if hasattr(models.FeedPost, "media_type"):
        setattr(new_post, "media_type", media_type)

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return {
        "id": new_post.id,
        "author_id": new_post.author_id,
        "author_name": getattr(new_post, "author_name", None) or clean_author_name,
        "content": new_post.content,
        "market": new_post.market,
        "media_url": media_url,
        "media_type": media_type,
        "timestamp": "Just now",
        "likes_count": getattr(new_post, "likes_count", 0) or 0,
        "comments_count": getattr(new_post, "comments_count", 0) or 0,
        "user_liked": False,
        "is_system": False
    }

@app.get("/feed/{post_id}")
def get_feed_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.FeedPost).filter(models.FeedPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@app.post("/feed/{post_id}/like")
def toggle_post_like(post_id: int, payload: FeedInteractionPayload, db: Session = Depends(get_db)):
    try:
        existing = db.execute(text("SELECT id FROM feed_likes WHERE target_type='post' AND target_id=:post_id AND user_id=:user_id"), 
                              {"post_id": post_id, "user_id": payload.user_id}).fetchone()
        
        if existing:
            db.execute(text("DELETE FROM feed_likes WHERE id=:id"), {"id": existing[0]})
            try:
                db.execute(text("UPDATE feed_posts SET likes_count = MAX(0, likes_count - 1) WHERE id=:post_id"), {"post_id": post_id})
            except Exception:
                pass # Ignore if column doesn't exist
        else:
            db.execute(text("INSERT INTO feed_likes (target_type, target_id, user_id) VALUES ('post', :post_id, :user_id)"), 
                       {"post_id": post_id, "user_id": payload.user_id})
            try:
                db.execute(text("UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id=:post_id"), {"post_id": post_id})
            except Exception:
                pass # Ignore if column doesn't exist
            
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/comments/{comment_id}/like")
def toggle_comment_like(comment_id: int, payload: FeedInteractionPayload, db: Session = Depends(get_db)):
    existing = db.execute(text("SELECT id FROM feed_likes WHERE target_type='comment' AND target_id=:comment_id AND user_id=:user_id"), 
                          {"comment_id": comment_id, "user_id": payload.user_id}).fetchone()
    
    if existing:
        db.execute(text("DELETE FROM feed_likes WHERE id=:id"), {"id": existing[0]})
        db.execute(text("UPDATE feed_comments SET likes_count = MAX(0, likes_count - 1) WHERE id=:comment_id"), {"comment_id": comment_id})
    else:
        db.execute(text("INSERT INTO feed_likes (target_type, target_id, user_id) VALUES ('comment', :comment_id, :user_id)"), 
                   {"comment_id": comment_id, "user_id": payload.user_id})
        db.execute(text("UPDATE feed_comments SET likes_count = likes_count + 1 WHERE id=:comment_id"), {"comment_id": comment_id})
        
    db.commit()
    return {"status": "success"}

@app.get("/feed/{post_id}/comments")
def get_post_comments(post_id: int, db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM feed_comments WHERE post_id=:post_id ORDER BY id ASC"), {"post_id": post_id}).fetchall()
    comments = []
    for row in rows:
        comments.append({
            "id": row[0],
            "post_id": row[1],
            "author_id": row[2],
            "author_name": row[3],
            "content": row[4],
            "timestamp": row[5],
            "likes_count": row[6],
            "user_liked": False
        })
    return comments

@app.post("/feed/{post_id}/comments")
def add_post_comment(post_id: int, payload: FeedCommentPayload, db: Session = Depends(get_db)):
    try:
        db.execute(text("""
            INSERT INTO feed_comments (post_id, author_id, author_name, content, timestamp) 
            VALUES (:post_id, :author_id, :author_name, :content, :timestamp)
        """), {
            "post_id": post_id,
            "author_id": payload.author_id,
            "author_name": payload.author_name,
            "content": payload.content,
            "timestamp": payload.timestamp
        })
        
        # Safely attempt to update count, ignore if original schema lacks the column
        try:
            db.execute(text("UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id=:post_id"), {"post_id": post_id})
        except Exception:
            pass 
            
        db.commit()
        new_id = db.execute(text("SELECT last_insert_rowid()")).scalar()
        
        return {
            "id": new_id,
            "post_id": post_id,
            "author_id": payload.author_id,
            "author_name": payload.author_name,
            "content": payload.content,
            "timestamp": payload.timestamp,
            "likes_count": 0,
            "user_liked": False
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/users/{user_id}/feed", response_model=schemas.FeedPostResponse)
def create_user_post(user_id: int, post: schemas.FeedPostCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    new_post = models.FeedPost(
        author_id=user_id,
        content=post.content,
        post_type="user",
        market=user.home_market
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    return new_post

# --- DIRECT MESSAGING ---

@app.get("/users/{user_id}/inbox")
def get_user_inbox(user_id: int, db: Session = Depends(get_db)):
    sent_to = db.query(models.DirectMessage.recipient_id).filter(models.DirectMessage.sender_id == user_id)
    received_from = db.query(models.DirectMessage.sender_id).filter(models.DirectMessage.recipient_id == user_id)
    
    partner_ids = list(set([r[0] for r in sent_to.union(received_from).all()]))
    
    partners = db.query(models.User).filter(models.User.id.in_(partner_ids)).all()
    return [
        {
            "id": p.id,
            "username": p.username,
            "avatar_url": p.avatar_url,
            "home_market": p.home_market
        }
        for p in partners
    ]

@app.get("/messages/thread/{user1_id}/{user2_id}", response_model=list[schemas.DirectMessageResponse])
def get_chat_thread(user1_id: int, user2_id: int, db: Session = Depends(get_db)):
    messages = db.query(models.DirectMessage).filter(
        ((models.DirectMessage.sender_id == user1_id) & (models.DirectMessage.recipient_id == user2_id)) |
        ((models.DirectMessage.sender_id == user2_id) & (models.DirectMessage.recipient_id == user1_id))
    ).order_by(models.DirectMessage.created_at.asc()).all()
    return messages

@app.post("/messages", response_model=schemas.DirectMessageResponse)
def send_direct_message(msg: schemas.DirectMessageCreate, db: Session = Depends(get_db)):
    # Standardized to read sender_id directly from payload
    sender = db.query(models.User).filter(models.User.id == msg.sender_id).first()
    recipient = db.query(models.User).filter(models.User.id == msg.recipient_id).first()
    
    if not sender or not recipient:
        raise HTTPException(status_code=404, detail="Sender or recipient not found")
        
    db_msg = models.DirectMessage(
        sender_id=msg.sender_id,
        recipient_id=msg.recipient_id,
        content=msg.content,
        message_type=msg.message_type,
        target_event_id=msg.target_event_id
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg
