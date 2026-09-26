from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, time, date

class MicSeriesCreate(BaseModel):
    name: str
    venue: str
    market: str = "austin"
    host_pin: str
    day_of_week: int
    start_time: time
    default_stage_time: int = 5

class MicEventResponse(BaseModel):
    id: int
    series_id: int
    name: str  
    venue: str
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    status: str
    event_date: date

    class Config:
        from_attributes = True

class ComicRegister(BaseModel):
    name: str
    push_enabled: bool = False

class QueueEntryResponse(BaseModel):
    id: int
    comic_id: int
    comic_name: str
    status: str
    position: int

    class Config:
        from_attributes = True

# --- Auth & User Schemas ---
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    ig_handle: str | None = None
    home_market: str = "austin"

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_host: bool
    avatar_url: str | None = None
    ig_handle: str | None = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# --- NEW: Profile & Economy Schemas ---
class ProfileResponse(BaseModel):
    id: int
    username: str
    is_host: bool
    avatar_url: str | None = None
    ig_handle: str | None = None
    registered_date: date
    home_market: str
    attendance_percentage: int 
    badges: List[str]

class IGHandleUpdate(BaseModel):
    ig_handle: str

class BadgeVoteCreate(BaseModel):
    category: str

# --- Messaging Schemas ---
class DirectMessageCreate(BaseModel):
    sender_id: int
    recipient_id: int
    content: str
    message_type: str = "text"
    target_event_id: int | None = None

class DirectMessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    message_type: str
    target_event_id: int | None
    created_at: datetime  

    class Config:
        from_attributes = True

class EventMessageCreate(BaseModel):
    content: str
    guest_name: str | None = None

class EventMessageResponse(BaseModel):
    id: int
    event_id: int
    user_id: int | None
    guest_name: str | None
    content: str
    created_at: datetime  

    class Config:
        from_attributes = True

class AudioSetBase(BaseModel):
    title: str | None = None
    duration_seconds: int = 0

class AudioSetCreate(AudioSetBase):
    event_id: int | None = None

class AudioSetResponse(AudioSetBase):
    id: int
    user_id: int
    event_id: int | None
    file_url: str
    created_at: datetime

    class Config:
        from_attributes = True

class SetHistoryResponse(BaseModel):
    id: int
    event_id: int | None = None
    event_date: date
    mic_name: str
    venue: str
    status: str
    position: int
    audio_url: str | None = None
    duration_seconds: int | None = None

    class Config:
        from_attributes = True

class DirectoryUserResponse(BaseModel):
    id: int
    username: str
    home_market: str
    avatar_url: str | None = None
    ig_handle: str | None = None
    is_host: bool = False

    class Config:
        from_attributes = True

class FeedPostBase(BaseModel):
    content: str

class FeedPostCreate(FeedPostBase):
    pass

class FeedPostAuthor(BaseModel):
    id: int
    username: str
    avatar_url: str | None = None
    is_host: bool = False
    
    class Config:
        from_attributes = True

class FeedPostResponse(FeedPostBase):
    id: int
    author_id: int | None
    market: str
    post_type: str
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime
    author: FeedPostAuthor | None = None

    class Config:
        from_attributes = True
