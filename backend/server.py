from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import requests
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    study_style: Optional[str] = None  # Active, Passive, Mixed
    grade_goal: Optional[str] = None  # High achiever, Pass-focused
    location_preference: Optional[str] = None  # Library, Home, Campus
    weekly_availability: Optional[List[Dict[str, Any]]] = []  # [{day, start_time, end_time}]
    work_ethic: Optional[int] = 5  # 1-10 scale
    onboarding_completed: bool = False
    matching_status: str = "pending"  # pending, matched, re-matching
    group_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Group(BaseModel):
    group_id: str
    course: str
    members: List[str]  # List of user_ids
    compatibility_score: float
    suggested_times: List[Dict[str, Any]]  # [{day, time}]
    suggested_location: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    health_score: float = 100.0  # Decreases with inactivity

class Message(BaseModel):
    message_id: str
    group_id: str
    sender_id: str
    sender_name: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceSession(BaseModel):
    session_id: str
    group_id: str
    scheduled_date: datetime
    attendees: List[str] = []  # List of user_ids who checked in
    status: str = "scheduled"  # scheduled, completed, missed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPER ====================

async def get_current_user(request: Request) -> Dict[str, Any]:
    """Extract user from session token (cookie or Authorization header)"""
    session_token = None
    
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify session in database
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_doc

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for user data and create session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth API
    try:
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10
        )
        auth_response.raise_for_status()
        auth_data = auth_response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to verify session: {str(e)}")
    
    # Verify university email (.ac.uk domain)
    email = auth_data.get("email", "")
    if not email.endswith(".ac.uk"):
        raise HTTPException(
            status_code=403,
            detail="Only university emails (.ac.uk) are allowed"
        )
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user_doc:
        # Update existing user
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "name": auth_data.get("name"),
                "picture": auth_data.get("picture")
            }}
        )
        user_id = user_doc["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = User(
            user_id=user_id,
            email=email,
            name=auth_data.get("name"),
            picture=auth_data.get("picture")
        )
        await db.users.insert_one(new_user.model_dump())
    
    # Create session token
    session_token = auth_data.get("session_token") or f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    new_session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    # Store session (upsert to avoid duplicates)
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": new_session.model_dump()},
        upsert=True
    )
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    # Return user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user from session"""
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and delete session"""
    try:
        user = await get_current_user(request)
        await db.user_sessions.delete_one({"user_id": user["user_id"]})
    except:
        pass
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== USER PROFILE ROUTES ====================

@api_router.put("/users/profile")
async def update_profile(request: Request, profile_data: Dict[str, Any]):
    """Update user profile and preferences"""
    user = await get_current_user(request)
    
    # Validate and update fields
    allowed_fields = [
        "university", "course", "study_style", "grade_goal",
        "location_preference", "weekly_availability", "work_ethic"
    ]
    
    update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}
    update_data["onboarding_completed"] = True
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    return updated_user

@api_router.get("/users/profile")
async def get_profile(request: Request):
    """Get current user's profile"""
    user = await get_current_user(request)
    return user

# ==================== MATCHING ALGORITHM ====================

def calculate_compatibility(user1: Dict, user2: Dict) -> float:
    """Calculate compatibility score between two users (0-100)"""
    score = 0.0
    weights = {
        "course": 30,  # Must match (filtered before this)
        "schedule": 25,
        "study_style": 20,
        "grade_goal": 15,
        "location": 10
    }
    
    # Course match (should always be 100% as we filter by course)
    if user1.get("course") == user2.get("course"):
        score += weights["course"]
    
    # Schedule overlap
    schedule1 = user1.get("weekly_availability", [])
    schedule2 = user2.get("weekly_availability", [])
    if schedule1 and schedule2:
        overlaps = 0
        for slot1 in schedule1:
            for slot2 in schedule2:
                if slot1.get("day") == slot2.get("day"):
                    # Simple overlap check (can be improved)
                    overlaps += 1
        overlap_ratio = min(overlaps / max(len(schedule1), len(schedule2)), 1.0)
        score += weights["schedule"] * overlap_ratio
    
    # Study style compatibility
    style1 = user1.get("study_style")
    style2 = user2.get("study_style")
    if style1 and style2:
        if style1 == style2:
            score += weights["study_style"]
        elif "Mixed" in [style1, style2]:
            score += weights["study_style"] * 0.7
        else:
            score += weights["study_style"] * 0.3
    
    # Grade goal alignment
    goal1 = user1.get("grade_goal")
    goal2 = user2.get("grade_goal")
    if goal1 and goal2:
        if goal1 == goal2:
            score += weights["grade_goal"]
        else:
            score += weights["grade_goal"] * 0.5
    
    # Location preference
    loc1 = user1.get("location_preference")
    loc2 = user2.get("location_preference")
    if loc1 and loc2:
        if loc1 == loc2:
            score += weights["location"]
        else:
            score += weights["location"] * 0.3
    
    return round(score, 2)

@api_router.post("/matching/find-matches")
async def find_matches(request: Request):
    """Find compatible study groups for the user"""
    user = await get_current_user(request)
    
    if not user.get("onboarding_completed"):
        raise HTTPException(status_code=400, detail="Complete your profile first")
    
    if user.get("group_id"):
        raise HTTPException(status_code=400, detail="You're already in a group")
    
    # Find users with same course who are not in a group
    potential_matches = await db.users.find(
        {
            "course": user["course"],
            "onboarding_completed": True,
            "group_id": None,
            "user_id": {"$ne": user["user_id"]}
        },
        {"_id": 0}
    ).to_list(100)
    
    if not potential_matches:
        return {"message": "No matches found yet. Check back soon!", "matches": []}
    
    # Calculate compatibility scores
    scored_matches = []
    for match in potential_matches:
        score = calculate_compatibility(user, match)
        if score >= 60:  # Minimum threshold
            scored_matches.append({
                "user": match,
                "compatibility_score": score
            })
    
    # Sort by score
    scored_matches.sort(key=lambda x: x["compatibility_score"], reverse=True)
    
    # Group formation: Try to create groups of 2-4 with high compatibility
    if len(scored_matches) >= 1:
        # For MVP, create group with top 1-3 matches
        group_members = [user["user_id"]]
        group_size = min(3, len(scored_matches))  # Max 4 people total
        
        for i in range(group_size):
            group_members.append(scored_matches[i]["user"]["user_id"])
        
        # Calculate average compatibility
        avg_score = sum(m["compatibility_score"] for m in scored_matches[:group_size]) / group_size
        
        # Create group
        group_id = f"group_{uuid.uuid4().hex[:12]}"
        new_group = Group(
            group_id=group_id,
            course=user["course"],
            members=group_members,
            compatibility_score=avg_score,
            suggested_times=[],  # Can be calculated from overlapping schedules
            suggested_location=user.get("location_preference", "Library")
        )
        
        await db.groups.insert_one(new_group.model_dump())
        
        # Update all members
        await db.users.update_many(
            {"user_id": {"$in": group_members}},
            {"$set": {"group_id": group_id, "matching_status": "matched"}}
        )
        
        return {
            "message": "Group created!",
            "group": new_group.model_dump()
        }
    
    return {
        "message": "No highly compatible matches found yet",
        "matches": scored_matches[:5]
    }

@api_router.get("/groups/my-group")
async def get_my_group(request: Request):
    """Get current user's group"""
    user = await get_current_user(request)
    
    if not user.get("group_id"):
        return {"group": None, "members": []}
    
    group = await db.groups.find_one(
        {"group_id": user["group_id"]},
        {"_id": 0}
    )
    
    if not group:
        return {"group": None, "members": []}
    
    # Get member details
    members = await db.users.find(
        {"user_id": {"$in": group["members"]}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "study_style": 1}
    ).to_list(10)
    
    return {
        "group": group,
        "members": members
    }

@api_router.post("/groups/leave")
async def leave_group(request: Request):
    """Leave current group"""
    user = await get_current_user(request)
    
    if not user.get("group_id"):
        raise HTTPException(status_code=400, detail="You're not in a group")
    
    group_id = user["group_id"]
    
    # Remove user from group
    await db.groups.update_one(
        {"group_id": group_id},
        {"$pull": {"members": user["user_id"]}}
    )
    
    # Update user
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"group_id": None, "matching_status": "pending"}}
    )
    
    # Check if group is now empty or too small
    group = await db.groups.find_one({"group_id": group_id})
    if len(group["members"]) < 2:
        # Disband group
        await db.groups.update_one(
            {"group_id": group_id},
            {"$set": {"is_active": False}}
        )
        # Update remaining members
        await db.users.update_many(
            {"group_id": group_id},
            {"$set": {"group_id": None, "matching_status": "pending"}}
        )
    
    return {"message": "Left group successfully"}

# ==================== MESSAGING ROUTES ====================

@api_router.post("/messages/send")
async def send_message(request: Request, message_data: Dict[str, Any]):
    """Send a message to group"""
    user = await get_current_user(request)
    
    if not user.get("group_id"):
        raise HTTPException(status_code=400, detail="You're not in a group")
    
    message = Message(
        message_id=f"msg_{uuid.uuid4().hex[:12]}",
        group_id=user["group_id"],
        sender_id=user["user_id"],
        sender_name=user["name"],
        content=message_data.get("content", "")
    )
    
    await db.messages.insert_one(message.model_dump())
    return message.model_dump()

@api_router.get("/messages/group/{group_id}")
async def get_group_messages(request: Request, group_id: str):
    """Get messages for a group"""
    user = await get_current_user(request)
    
    # Verify user is in the group
    if user.get("group_id") != group_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await db.messages.find(
        {"group_id": group_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    
    return {"messages": messages}

# ==================== ATTENDANCE ROUTES ====================

@api_router.post("/attendance/checkin")
async def checkin(request: Request, session_data: Dict[str, Any]):
    """Check in to a study session"""
    user = await get_current_user(request)
    
    if not user.get("group_id"):
        raise HTTPException(status_code=400, detail="You're not in a group")
    
    session_id = session_data.get("session_id")
    
    if not session_id:
        # Create new session for today
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        new_session = AttendanceSession(
            session_id=session_id,
            group_id=user["group_id"],
            scheduled_date=datetime.now(timezone.utc),
            attendees=[user["user_id"]]
        )
        await db.attendance_sessions.insert_one(new_session.model_dump())
    else:
        # Add to existing session
        await db.attendance_sessions.update_one(
            {"session_id": session_id},
            {"$addToSet": {"attendees": user["user_id"]}}
        )
    
    return {"message": "Checked in successfully", "session_id": session_id}

@api_router.get("/attendance/streak")
async def get_streak(request: Request):
    """Get user's study streak"""
    user = await get_current_user(request)
    
    if not user.get("group_id"):
        return {"streak": 0}
    
    # Get all sessions user attended
    sessions = await db.attendance_sessions.find(
        {
            "group_id": user["group_id"],
            "attendees": user["user_id"]
        },
        {"_id": 0}
    ).sort("scheduled_date", -1).to_list(100)
    
    # Calculate streak (consecutive days)
    streak = 0
    if sessions:
        today = datetime.now(timezone.utc).date()
        for session in sessions:
            session_date = session["scheduled_date"]
            if isinstance(session_date, str):
                session_date = datetime.fromisoformat(session_date)
            if session_date.tzinfo is None:
                session_date = session_date.replace(tzinfo=timezone.utc)
            
            days_diff = (today - session_date.date()).days
            if days_diff == streak:
                streak += 1
            else:
                break
    
    return {"streak": streak}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "StudyMatch API v1.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
