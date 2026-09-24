from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Time, Date, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import datetime

# --- User Account & Profiles ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_host = Column(Boolean, default=False)
    home_market = Column(String, nullable=False, default="austin")
    
    # Profile Data (Zero-BS logic: Strict data points, no self-reported bio)
    avatar_url = Column(String, nullable=True)
    ig_handle = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    comics = relationship("Comic", back_populates="user")


class MicSeries(Base):
    __tablename__ = "mic_series"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    venue = Column(String)
    market = Column(String, nullable=False, default="austin")
    host_pin = Column(String)
    day_of_week = Column(Integer)  
    start_time = Column(Time)      
    default_stage_time = Column(Integer, default=5)
    
    consecutive_misses = Column(Integer, default=0)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    events = relationship("MicEvent", back_populates="series")


class MicEvent(Base):
    __tablename__ = "mic_events"

    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(Integer, ForeignKey("mic_series.id"))
    event_date = Column(Date)
    
    status = Column(String, default="scheduled")
    started_at = Column(DateTime(timezone=True), nullable=True)

    series = relationship("MicSeries", back_populates="events")
    queue = relationship("QueueEntry", back_populates="event")


class Comic(Base):
    __tablename__ = "comics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Links registered users to their queue history
    name = Column(String, unique=True, index=True)
    push_enabled = Column(Boolean, default=False)
    
    # NOTE: trust_score removed. We now calculate a hard Attendance Percentage 
    # directly by querying QueueEntry history for this comic.
    
    user = relationship("User", back_populates="comics")
    entries = relationship("QueueEntry", back_populates="comic")


class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("mic_events.id"))
    comic_id = Column(Integer, ForeignKey("comics.id"))
    
    # Supported statuses to enable Attendance Percentage calculation:
    # "waiting", "on_deck", "on_stage", "completed", "excused", "no_show"
    status = Column(String, default="waiting")
    position = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("MicEvent", back_populates="queue")
    comic = relationship("Comic", back_populates="entries")


# --- Peer-Reviewed Badges ---
class BadgeVote(Base):
    __tablename__ = "badge_votes"

    id = Column(Integer, primary_key=True, index=True)
    voter_id = Column(Integer, ForeignKey("users.id"))
    target_id = Column(Integer, ForeignKey("users.id"))
    
    # Category constraints: "tight_5", "tight_15", "can_host", "feature_material"
    category = Column(String, index=True) 
    
    # Stored as float to handle the 3.34 points from verified hosts vs 1.0 from comics
    points = Column(Float) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    voter = relationship("User", foreign_keys=[voter_id])
    target = relationship("User", foreign_keys=[target_id])


# --- Messaging Models ---
class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String) 
    
    # "text", "swap_request", or "swap_accepted"
    message_type = Column(String, default="text") 
    target_event_id = Column(Integer, ForeignKey("mic_events.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
    target_event = relationship("MicEvent", foreign_keys=[target_event_id])


class EventMessage(Base):
    __tablename__ = "event_messages"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("mic_events.id"))
    
    # If user_id is null, it's a guest!
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    guest_name = Column(String, nullable=True)
    
    content = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("MicEvent")
    user = relationship("User")

class AudioSet(Base):
    __tablename__ = "audio_sets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("mic_events.id"), nullable=True)
    file_url = Column(String, nullable=False)
    duration_seconds = Column(Integer, default=0)
    title = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    event = relationship("MicEvent")

class FeedPost(Base):
    __tablename__ = "feed_posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for system posts
    content = Column(String, nullable=False)
    market = Column(String, nullable=False, default="austin")
    post_type = Column(String, default="user") # 'user', 'mic_listed', 'mic_started', 'mic_ended'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    author = relationship("User")
