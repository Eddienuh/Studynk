from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import stripe
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import requests
import re
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

JWT_SECRET = os.environ.get('JWT_SECRET', 'studymatch-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

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
    # Subscription & Referral fields
    subscription_tier: str = "free"  # free, pro
    pro_expires_at: Optional[datetime] = None
    referral_code: str = ""
    referred_by: Optional[str] = None  # user_id of referrer
    referrals_count: int = 0
    last_rematch_date: Optional[datetime] = None
    rematch_count_this_week: int = 0
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
    
    # Try Authorization header first (mobile-friendly)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_token = auth_header.split(" ")[1]
    
    # Fallback to cookie
    if not session_token:
        session_token = request.cookies.get("session_token")
    
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
    
    # Remove password_hash from response
    user_doc.pop("password_hash", None)
    
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
        logging.info(f"Auth successful for email: {auth_data.get('email')}")
    except requests.exceptions.HTTPError as e:
        logging.error(f"Auth API HTTP error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=400, detail=f"Failed to verify session: {str(e)}")
    except Exception as e:
        logging.error(f"Auth API error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to verify session: {str(e)}")
    
    # Verify university email (.ac.uk domain)
    # TODO: Re-enable for production launch
    email = auth_data.get("email", "")
    # Temporarily disabled for testing - accept any email
    # if not email.endswith(".ac.uk"):
    #     raise HTTPException(
    #         status_code=403,
    #         detail="Only university emails (.ac.uk) are allowed"
    #     )
    
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
    user_doc.pop("password_hash", None)
    return {"user": user_doc, "token": session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user from session"""
    user = await get_current_user(request)
    return user

@api_router.post("/auth/register")
async def register(request: Request):
    """Register a new user with email and password"""
    body = await request.json()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    name = body.get("name", "").strip()
    gdpr_consent = body.get("gdpr_consent", False)

    if not email or not password or not name:
        raise HTTPException(status_code=400, detail="Name, email, and password are required")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Hash password
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    referral_code = generate_referral_code(user_id)

    new_user = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": None,
        "password_hash": hashed_pw,
        "university": None,
        "course": None,
        "study_style": None,
        "grade_goal": None,
        "location_preference": None,
        "weekly_availability": [],
        "work_ethic": 5,
        "onboarding_completed": False,
        "matching_status": "pending",
        "group_id": None,
        "subscription_tier": "free",
        "pro_expires_at": None,
        "referral_code": referral_code,
        "referred_by": None,
        "referrals_count": 0,
        "last_rematch_date": None,
        "rematch_count_this_week": 0,
        "gdpr_consent": gdpr_consent,
        "gdpr_consent_date": datetime.now(timezone.utc) if gdpr_consent else None,
        "created_at": datetime.now(timezone.utc),
    }

    await db.users.insert_one(new_user)

    # Create session token
    session_token = jwt.encode(
        {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    }
    await db.user_sessions.update_one(
        {"user_id": user_id}, {"$set": session_doc}, upsert=True
    )

    # Return user without password_hash
    user_data = {k: v for k, v in new_user.items() if k not in ("password_hash", "_id")}

    return {"user": user_data, "token": session_token}

@api_router.post("/auth/login")
async def login(request: Request):
    """Login with email and password"""
    body = await request.json()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    # Find user
    user_doc = await db.users.find_one({"email": email})

    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check password
    stored_hash = user_doc.get("password_hash")
    if not stored_hash:
        raise HTTPException(status_code=401, detail="This account uses Google sign-in. Please use Google to log in.")

    if not bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create session token
    user_id = user_doc["user_id"]
    session_token = jwt.encode(
        {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    }
    await db.user_sessions.update_one(
        {"user_id": user_id}, {"$set": session_doc}, upsert=True
    )

    # Return user without password_hash
    user_data = {k: v for k, v in user_doc.items() if k not in ("password_hash", "_id")}

    return {"user": user_data, "token": session_token}

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

@api_router.delete("/auth/delete-account")
async def delete_account(request: Request, response: Response):
    """Delete user account and all associated data (GDPR compliance)"""
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    # Remove user from any group
    group_doc = await db.groups.find_one({"members": user_id})
    if group_doc:
        new_members = [m for m in group_doc["members"] if m != user_id]
        if len(new_members) < 2:
            # Disband group if less than 2 members
            await db.groups.delete_one({"group_id": group_doc["group_id"]})
            for remaining in new_members:
                await db.users.update_one(
                    {"user_id": remaining},
                    {"$set": {"group_id": None, "matching_status": "pending"}}
                )
        else:
            await db.groups.update_one(
                {"group_id": group_doc["group_id"]},
                {"$set": {"members": new_members}}
            )
    
    # Delete all user messages
    await db.messages.delete_many({"sender_id": user_id})
    
    # Delete attendance records
    await db.attendance_sessions.update_many(
        {"attendees": user_id},
        {"$pull": {"attendees": user_id}}
    )
    
    # Delete sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Delete user document
    await db.users.delete_one({"user_id": user_id})
    
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Account and all associated data deleted successfully"}

@api_router.post("/users/upload-photo")
async def upload_photo(request: Request):
    """Upload profile photo as base64"""
    user = await get_current_user(request)
    body = await request.json()
    
    photo_data = body.get("photo")
    if not photo_data:
        raise HTTPException(status_code=400, detail="Photo data required")
    
    # Validate base64 size (max ~5MB)
    if len(photo_data) > 7_000_000:
        raise HTTPException(status_code=400, detail="Photo too large. Max 5MB.")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"profile_photo": photo_data}}
    )
    
    return {"message": "Photo uploaded successfully", "profile_photo": photo_data}

# ==================== SUBSCRIPTION HELPER FUNCTIONS ====================

def generate_referral_code(user_id: str) -> str:
    """Generate unique referral code for user"""
    return f"SM{user_id[-6:].upper()}{uuid.uuid4().hex[:4].upper()}"

async def check_pro_status(user: Dict[str, Any]) -> bool:
    """Check if user has active Pro subscription"""
    if user.get("subscription_tier") != "pro":
        return False
    
    pro_expires_at = user.get("pro_expires_at")
    if not pro_expires_at:
        return False
    
    if isinstance(pro_expires_at, str):
        pro_expires_at = datetime.fromisoformat(pro_expires_at)
    if pro_expires_at.tzinfo is None:
        pro_expires_at = pro_expires_at.replace(tzinfo=timezone.utc)
    
    # Check if expired
    if pro_expires_at < datetime.now(timezone.utc):
        # Downgrade to free
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"subscription_tier": "free", "pro_expires_at": None}}
        )
        return False
    
    return True

async def grant_pro_access(user_id: str, duration_days: int, reason: str = "referral"):
    """Grant Pro access to a user for specified duration"""
    expires_at = datetime.now(timezone.utc) + timedelta(days=duration_days)
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "subscription_tier": "pro",
            "pro_expires_at": expires_at
        }}
    )
    
    # Log the grant
    await db.subscription_log.insert_one({
        "user_id": user_id,
        "action": "pro_granted",
        "reason": reason,
        "duration_days": duration_days,
        "expires_at": expires_at,
        "timestamp": datetime.now(timezone.utc)
    })

async def check_rematch_limit(user: Dict[str, Any]) -> bool:
    """Check if user can rematch (free tier: 1/week, pro: unlimited)"""
    is_pro = await check_pro_status(user)
    if is_pro:
        return True  # Unlimited for Pro
    
    # Check weekly limit for free users
    last_rematch = user.get("last_rematch_date")
    if not last_rematch:
        return True  # First rematch
    
    if isinstance(last_rematch, str):
        last_rematch = datetime.fromisoformat(last_rematch)
    if last_rematch.tzinfo is None:
        last_rematch = last_rematch.replace(tzinfo=timezone.utc)
    
    # Check if it's been a week
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    if last_rematch < week_ago:
        # Reset counter
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"rematch_count_this_week": 0}}
        )
        return True
    
    # Check count
    rematch_count = user.get("rematch_count_this_week", 0)
    return rematch_count < 1  # Free tier: 1 per week

# ==================== SUBSCRIPTION & REFERRAL ROUTES ====================

@api_router.get("/subscription/status")
async def get_subscription_status(request: Request):
    """Get current user's subscription status"""
    user = await get_current_user(request)
    is_pro = await check_pro_status(user)
    
    # Refresh user data
    user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    return {
        "tier": user.get("subscription_tier", "free"),
        "is_pro": is_pro,
        "pro_expires_at": user.get("pro_expires_at"),
        "referral_code": user.get("referral_code"),
        "referrals_count": user.get("referrals_count", 0),
        "can_rematch": await check_rematch_limit(user)
    }

@api_router.post("/subscription/generate-referral")
async def generate_referral(request: Request):
    """Generate referral code for user if they don't have one"""
    user = await get_current_user(request)
    
    if user.get("referral_code"):
        return {"referral_code": user["referral_code"]}
    
    # Generate new code
    referral_code = generate_referral_code(user["user_id"])
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"referral_code": referral_code}}
    )
    
    return {"referral_code": referral_code}

@api_router.post("/subscription/apply-referral")
async def apply_referral(request: Request, referral_data: Dict[str, Any]):
    """Apply a referral code (only for new users during onboarding)"""
    user = await get_current_user(request)
    referral_code = referral_data.get("referral_code", "").strip().upper()
    
    if not referral_code:
        raise HTTPException(status_code=400, detail="Referral code required")
    
    # Check if user already used a referral
    if user.get("referred_by"):
        raise HTTPException(status_code=400, detail="You've already used a referral code")
    
    # Find referrer
    referrer = await db.users.find_one(
        {"referral_code": referral_code},
        {"_id": 0}
    )
    
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    if referrer["user_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")
    
    # Update current user
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"referred_by": referrer["user_id"]}}
    )
    
    # Increment referrer's count
    new_count = referrer.get("referrals_count", 0) + 1
    await db.users.update_one(
        {"user_id": referrer["user_id"]},
        {"$set": {"referrals_count": new_count}}
    )
    
    # Check if referrer unlocked Pro (2-3 referrals = 1 month Pro)
    if new_count >= 2 and new_count <= 3:
        # Check if this referral unlocks Pro
        is_already_pro = await check_pro_status(referrer)
        if not is_already_pro:
            await grant_pro_access(referrer["user_id"], 30, "referral_reward")
    
    return {
        "message": "Referral code applied successfully!",
        "referrer_name": referrer.get("name"),
        "referrals_count": new_count
    }

@api_router.post("/subscription/upgrade-to-pro")
async def upgrade_to_pro(request: Request, subscription_data: Dict[str, Any]):
    """Upgrade user to Pro (payment would be handled by Stripe in production)"""
    user = await get_current_user(request)
    duration_type = subscription_data.get("duration_type", "monthly")  # monthly or semester
    
    # In production, this would integrate with Stripe
    # For MVP, we'll just simulate the upgrade
    
    if duration_type == "semester":
        duration_days = 120  # ~4 months
        price = 9.99
    else:
        duration_days = 30
        price = 2.99
    
    # Grant Pro access
    await grant_pro_access(user["user_id"], duration_days, "purchase")
    
    return {
        "message": "Upgraded to Pro successfully!",
        "tier": "pro",
        "duration_days": duration_days,
        "price": price,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=duration_days)
    }

@api_router.post("/subscription/check-group-referral-bonus")
async def check_group_referral_bonus(request: Request):
    """Check if user's group qualifies for group referral bonus"""
    user = await get_current_user(request)
    
    if not user.get("group_id"):
        return {"eligible": False, "message": "Not in a group"}
    
    # Get group
    group = await db.groups.find_one({"group_id": user["group_id"]}, {"_id": 0})
    if not group:
        return {"eligible": False, "message": "Group not found"}
    
    # Get all members
    members = await db.users.find(
        {"user_id": {"$in": group["members"]}},
        {"_id": 0}
    ).to_list(10)
    
    # Check if all members were referred
    all_referred = all(m.get("referred_by") for m in members)
    
    if all_referred and len(members) >= 2:
        # Grant Pro to all members if not already granted for this group
        group_bonus_granted = group.get("referral_bonus_granted", False)
        
        if not group_bonus_granted:
            # Grant 14 days Pro to all members
            for member in members:
                is_pro = await check_pro_status(member)
                if not is_pro:
                    await grant_pro_access(member["user_id"], 14, "group_referral_bonus")
            
            # Mark as granted
            await db.groups.update_one(
                {"group_id": group["group_id"]},
                {"$set": {"referral_bonus_granted": True}}
            )
            
            return {
                "eligible": True,
                "granted": True,
                "message": "Group referral bonus activated! All members get 14 days Pro free!",
                "duration_days": 14
            }
        else:
            return {
                "eligible": True,
                "granted": False,
                "message": "Group bonus already claimed"
            }
    
    return {
        "eligible": False,
        "message": f"Not all members were referred ({sum(1 for m in members if m.get('referred_by'))}/{len(members)})"
    }

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
