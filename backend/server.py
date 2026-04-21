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
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

JWT_SECRET = os.environ.get('JWT_SECRET', 'studymatch-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
MAPS_API_KEY = os.environ.get('Maps_API_KEY', '')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
stripe.api_key = STRIPE_SECRET_KEY

# SMTP Configuration
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp-mail.outlook.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))

# Admin bypass
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@studynk.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'BetaPass123!')

STUDYNK_LOGO_URL = "https://customer-assets.emergentagent.com/job_study-sync-44/artifacts/y2ebbdfd_studynk%20logo.png"

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

# ==================== EMAIL VALIDATION ====================

def validate_email_format(email: str) -> tuple[bool, str]:
    """Validate email is a properly formatted RFC-compliant address."""
    email = email.strip().lower()
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return False, "Please enter a valid email address."
    return True, ""


def generate_otp() -> str:
    """Generate a random 6-digit OTP."""
    return str(random.randint(100000, 999999))


def build_otp_email_html(otp: str, user_name: str) -> str:
    """Build a branded HTML email with the OTP code."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#F0F4F8;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F4F8;padding:40px 0;">
            <tr>
                <td align="center">
                    <table width="420" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0EA5E9, #38BDF8);padding:32px 24px;text-align:center;">
                                <img src="{STUDYNK_LOGO_URL}" alt="Studynk" width="64" height="64" style="border-radius:14px;margin-bottom:12px;" />
                                <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:700;">Studynk</h1>
                                <p style="color:#E0F2FE;margin:4px 0 0;font-size:14px;">Verify Your Student Email</p>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding:32px 28px;">
                                <p style="color:#334155;font-size:16px;margin:0 0 8px;">Hi {user_name},</p>
                                <p style="color:#64748B;font-size:14px;line-height:22px;margin:0 0 24px;">
                                    Use the code below to verify your university email and unlock Studynk. This code expires in <strong>10 minutes</strong>.
                                </p>
                                <!-- OTP Box -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="padding:20px 0;">
                                            <div style="display:inline-block;background:#F0F9FF;border:2px dashed #0EA5E9;border-radius:12px;padding:16px 36px;letter-spacing:10px;font-size:36px;font-weight:800;color:#0EA5E9;">
                                                {otp}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                <p style="color:#94A3B8;font-size:13px;text-align:center;margin:20px 0 0;">
                                    If you didn't request this, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color:#F8FAFC;padding:20px 28px;text-align:center;border-top:1px solid #E2E8F0;">
                                <p style="color:#94A3B8;font-size:12px;margin:0;">
                                    &copy; 2025 Studynk &middot; studynk0@outlook.com
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def send_otp_email(email: str, otp: str, user_name: str) -> bool:
    """Send OTP via SMTP (Outlook). Returns True on success."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logger.error("SMTP credentials not configured")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Studynk Verification Code: {otp}"
        msg["From"] = f"Studynk <{SMTP_EMAIL}>"
        msg["To"] = email

        plain_text = f"Hi {user_name},\n\nYour Studynk verification code is: {otp}\n\nThis code expires in 10 minutes.\n\n- Studynk Team"
        html_body = build_otp_email_html(otp, user_name)

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"OTP email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")
        return False


async def store_otp(user_id: str, email: str, otp: str):
    """Store OTP in DB with 10-minute expiration."""
    await db.otp_codes.delete_many({"user_id": user_id})  # Remove old codes
    await db.otp_codes.insert_one({
        "user_id": user_id,
        "email": email,
        "otp": otp,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0,
    })


async def verify_otp(user_id: str, code: str) -> tuple[bool, str]:
    """Verify OTP code. Returns (success, message)."""
    otp_doc = await db.otp_codes.find_one({"user_id": user_id})

    if not otp_doc:
        return False, "No verification code found. Please request a new one."

    # Check expiry - handle timezone-naive datetime from MongoDB
    expires_at = otp_doc["expires_at"]
    if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        await db.otp_codes.delete_one({"user_id": user_id})
        return False, "Verification code has expired. Please request a new one."

    # Check attempts (max 5)
    if otp_doc.get("attempts", 0) >= 5:
        await db.otp_codes.delete_one({"user_id": user_id})
        return False, "Too many attempts. Please request a new code."

    # Increment attempts
    await db.otp_codes.update_one(
        {"user_id": user_id},
        {"$inc": {"attempts": 1}}
    )

    if str(code).strip() != str(otp_doc["otp"]).strip():
        remaining = 5 - (otp_doc.get("attempts", 0) + 1)
        return False, f"Invalid code. {remaining} attempt(s) remaining."

    # Success - delete OTP
    await db.otp_codes.delete_one({"user_id": user_id})
    return True, "Verified successfully"


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

    # Admin bypass — skip domain validation for admin email
    if email != ADMIN_EMAIL.lower():
        # Validate email format (RFC-compliant)
        is_valid, error_msg = validate_email_format(email)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)

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
        "is_verified": False,
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

    # Generate and send OTP
    otp = generate_otp()
    await store_otp(user_id, email, otp)
    email_sent = await send_otp_email(email, otp, name)

    # Return user without password_hash
    user_data = {k: v for k, v in new_user.items() if k not in ("password_hash", "_id")}

    return {
        "user": user_data,
        "token": session_token,
        "otp_sent": email_sent,
    }

@api_router.post("/auth/verify-code")
async def verify_code(request: Request):
    """Verify student account with a 6-digit OTP code"""
    user = await get_current_user(request)
    body = await request.json()
    code = body.get("code", "")

    success, message = await verify_otp(user["user_id"], code)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"is_verified": True}}
    )

    return {"message": "Account verified successfully!", "is_verified": True}


@api_router.post("/auth/resend-otp")
async def resend_otp(request: Request):
    """Resend OTP to user's email"""
    user = await get_current_user(request)

    # Check if already verified
    user_doc = await db.users.find_one({"user_id": user["user_id"]})
    if user_doc and user_doc.get("is_verified"):
        return {"message": "Account is already verified.", "already_verified": True}

    # Rate limit: check if OTP was sent less than 60 seconds ago
    existing_otp = await db.otp_codes.find_one({"user_id": user["user_id"]})
    if existing_otp:
        created_at = existing_otp["created_at"]
        if isinstance(created_at, datetime) and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        
        elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
        if elapsed < 60:
            remaining = int(60 - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before requesting a new code."
            )

    # Generate and send new OTP
    otp = generate_otp()
    await store_otp(user["user_id"], user["email"], otp)
    email_sent = await send_otp_email(user["email"], otp, user.get("name", "Student"))

    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

    return {"message": "Verification code sent!", "otp_sent": True}

@api_router.post("/auth/login")
async def login(request: Request):
    """Login with email and password"""
    body = await request.json()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    # ===== ADMIN BYPASS =====
    if email == ADMIN_EMAIL.lower() and password == ADMIN_PASSWORD:
        # Upsert admin user
        admin_doc = await db.users.find_one({"email": email})
        if not admin_doc:
            admin_id = f"admin_{uuid.uuid4().hex[:12]}"
            admin_doc = {
                "user_id": admin_id,
                "email": email,
                "name": "Admin",
                "picture": None,
                "password_hash": bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                "university": "Studynk HQ",
                "course": "Administration",
                "study_style": "Active",
                "grade_goal": "First",
                "location_preference": "Library",
                "weekly_availability": [],
                "work_ethic": 10,
                "onboarding_completed": True,
                "matching_status": "pending",
                "group_id": None,
                "subscription_tier": "pro",
                "pro_expires_at": None,
                "referral_code": "ADMIN",
                "referred_by": None,
                "referrals_count": 0,
                "last_rematch_date": None,
                "rematch_count_this_week": 0,
                "is_verified": True,
                "created_at": datetime.now(timezone.utc),
            }
            await db.users.insert_one(admin_doc)
        else:
            # Ensure admin is always verified and onboarded
            await db.users.update_one(
                {"email": email},
                {"$set": {"is_verified": True, "onboarding_completed": True}}
            )
            admin_doc = await db.users.find_one({"email": email})

        admin_id = admin_doc["user_id"]
        session_token = jwt.encode(
            {"user_id": admin_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
            JWT_SECRET, algorithm=JWT_ALGORITHM
        )
        await db.user_sessions.update_one(
            {"user_id": admin_id},
            {"$set": {
                "user_id": admin_id,
                "session_token": session_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc),
            }},
            upsert=True
        )
        user_data = {k: v for k, v in admin_doc.items() if k not in ("password_hash", "_id")}
        return {"user": user_data, "token": session_token}
    # ===== END ADMIN BYPASS =====

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
        price = 2.99  # Basic monthly
    
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
        "location_preference", "weekly_availability", "work_ethic",
        "phone_number"
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


@api_router.get("/users/search")
async def search_users(request: Request, q: str = ""):
    """Search users by name, email, or phone number"""
    user = await get_current_user(request)
    if not q or len(q) < 2:
        return {"users": []}

    regex = {"$regex": q, "$options": "i"}
    results = await db.users.find(
        {
            "user_id": {"$ne": user["user_id"]},
            "$or": [
                {"name": regex},
                {"email": regex},
                {"phone_number": regex},
            ],
        },
        {"_id": 0, "password_hash": 0},
    ).to_list(20)

    return {"users": results}


@api_router.get("/invitations/pending")
async def get_pending_invitations(request: Request):
    """Get pending invitations for the current user"""
    user = await get_current_user(request)
    invitations = await db.group_invitations.find(
        {"email": user["email"], "status": "pending"},
        {"_id": 0},
    ).to_list(50)
    return {"invitations": invitations}


@api_router.post("/invitations/send")
async def send_invitation(request: Request, body: Dict[str, Any]):
    """Send a group invitation to a user"""
    user = await get_current_user(request)
    target_user_id = body.get("target_user_id")
    if not target_user_id:
        raise HTTPException(status_code=400, detail="target_user_id required")

    if not user.get("group_id"):
        raise HTTPException(status_code=400, detail="You must be in a group to invite")

    target = await db.users.find_one({"user_id": target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already invited
    existing = await db.group_invitations.find_one({
        "email": target["email"],
        "group_id": user["group_id"],
        "status": "pending",
    })
    if existing:
        raise HTTPException(status_code=400, detail="User already invited")

    group = await db.groups.find_one({"group_id": user["group_id"]}, {"_id": 0})
    await db.group_invitations.insert_one({
        "invitation_id": f"inv_{uuid.uuid4().hex[:12]}",
        "group_id": user["group_id"],
        "group_name": group.get("group_name", group.get("course", "Study Group")),
        "invited_by": user["user_id"],
        "invited_by_name": user.get("name", "Someone"),
        "email": target["email"],
        "target_user_id": target_user_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    })

    return {"message": f"Invitation sent to {target.get('name', target['email'])}"}


@api_router.post("/invitations/respond")
async def respond_invitation(request: Request, body: Dict[str, Any]):
    """Accept or decline a group invitation"""
    user = await get_current_user(request)
    invitation_id = body.get("invitation_id")
    action = body.get("action")  # 'accept' or 'decline'

    if not invitation_id or action not in ("accept", "decline"):
        raise HTTPException(status_code=400, detail="invitation_id and action (accept/decline) required")

    inv = await db.group_invitations.find_one({
        "invitation_id": invitation_id,
        "email": user["email"],
        "status": "pending",
    })
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if action == "decline":
        await db.group_invitations.update_one(
            {"invitation_id": invitation_id},
            {"$set": {"status": "declined"}},
        )
        return {"message": "Invitation declined"}

    # Accept: add user to group
    if user.get("group_id"):
        raise HTTPException(status_code=400, detail="Leave your current group first")

    group = await db.groups.find_one({"group_id": inv["group_id"]})
    if not group:
        raise HTTPException(status_code=404, detail="Group no longer exists")

    await db.groups.update_one(
        {"group_id": inv["group_id"]},
        {"$addToSet": {"members": user["user_id"]}},
    )
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"group_id": inv["group_id"], "matching_status": "matched"}},
    )
    await db.group_invitations.update_one(
        {"invitation_id": invitation_id},
        {"$set": {"status": "accepted"}},
    )

    return {"message": f"Joined {inv.get('group_name', 'the group')}!"}

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
    
    # Sort: Pro users first, then by compatibility score
    for match in scored_matches:
        match_user = match["user"]
        match["is_pro"] = match_user.get("subscriptionStatus") == "pro"
    scored_matches.sort(key=lambda x: (x.get("is_pro", False), x["compatibility_score"]), reverse=True)
    
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
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "study_style": 1, "is_verified": 1}
    ).to_list(10)
    
    return {
        "group": group,
        "members": members
    }


@api_router.post("/groups/create")
async def create_group_manually(request: Request):
    """Create a new study group manually"""
    user = await get_current_user(request)
    body = await request.json()

    if user.get("group_id"):
        raise HTTPException(status_code=400, detail="You are already in a group. Leave your current group first.")

    group_name = body.get("group_name", "").strip()
    course = body.get("course", "").strip()
    location = body.get("location", "").strip()
    invite_emails = body.get("invite_emails", [])
    streak_enabled = body.get("streak_enabled", False)

    if not group_name:
        raise HTTPException(status_code=400, detail="Group name is required")

    group_id = f"group_{uuid.uuid4().hex[:12]}"
    new_group = Group(
        group_id=group_id,
        course=course or group_name,
        members=[user["user_id"]],
        compatibility_score=100,
        suggested_times=[],
        suggested_location=location or "Library",
    )

    group_doc = new_group.model_dump()
    group_doc["group_name"] = group_name
    group_doc["streak_enabled"] = streak_enabled
    group_doc["streak_target"] = "weekly" if streak_enabled else None
    group_doc["invite_emails"] = invite_emails

    await db.groups.insert_one(group_doc)
    group_doc.pop("_id", None)

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"group_id": group_id, "matching_status": "matched"}}
    )

    # Store pending invitations
    for email in invite_emails:
        email = email.strip().lower()
        if email:
            await db.group_invitations.insert_one({
                "invitation_id": f"inv_{uuid.uuid4().hex[:12]}",
                "group_id": group_id,
                "group_name": group_name,
                "invited_by": user["user_id"],
                "invited_by_name": user.get("name", "Someone"),
                "email": email,
                "status": "pending",
                "created_at": datetime.now(timezone.utc),
            })

    return {"message": "Group created!", "group": group_doc}


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
    
    # Increment total check-in count for the user
    total_checkins = user.get("total_checkins", 0) + 1
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"total_checkins": total_checkins}}
    )
    
    # Determine if review prompt should be shown
    # Show after 1st check-in, then every 5 after that (6th, 11th, 16th...)
    last_review_checkin = user.get("last_review_checkin", 0)
    should_prompt_review = False
    if total_checkins == 1:
        should_prompt_review = True
    elif total_checkins > 1 and (total_checkins - 1) % 5 == 0 and total_checkins > last_review_checkin:
        should_prompt_review = True
    
    return {
        "message": "Checked in successfully",
        "session_id": session_id,
        "total_checkins": total_checkins,
        "should_prompt_review": should_prompt_review,
    }

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



# ==================== MEETINGS ROUTES ====================

@api_router.get("/meetings/list")
async def list_meetings(request: Request):
    """List meetings for user's group, split into upcoming and past"""
    user = await get_current_user(request)

    if not user.get("group_id"):
        return {"upcoming": [], "past": []}

    group = await db.groups.find_one({"group_id": user["group_id"]}, {"_id": 0})
    if not group:
        return {"upcoming": [], "past": []}

    # Fetch meetings for this group, sorted by time
    meetings = await db.meetings.find(
        {"group_id": user["group_id"]},
        {"_id": 0}
    ).sort("meeting_time", 1).to_list(50)

    # If no meetings exist, seed some sample ones for demo
    if not meetings:
        now = datetime.now(timezone.utc)
        sample_meetings = [
            {
                "meeting_id": f"mtg_{uuid.uuid4().hex[:12]}",
                "group_id": user["group_id"],
                "title": "Weekly Review Session",
                "location": group.get("suggested_location", "Library"),
                "meeting_time": (now + timedelta(hours=2)).isoformat(),
                "duration_minutes": 60,
                "created_by": user["user_id"],
                "attendees": group.get("members", []),
                "notes": "",
                "created_at": now.isoformat(),
            },
            {
                "meeting_id": f"mtg_{uuid.uuid4().hex[:12]}",
                "group_id": user["group_id"],
                "title": "Exam Prep Study",
                "location": group.get("suggested_location", "Library"),
                "meeting_time": (now + timedelta(days=2, hours=3)).isoformat(),
                "duration_minutes": 90,
                "created_by": user["user_id"],
                "attendees": group.get("members", []),
                "notes": "",
                "created_at": now.isoformat(),
            },
            {
                "meeting_id": f"mtg_{uuid.uuid4().hex[:12]}",
                "group_id": user["group_id"],
                "title": "Group Discussion - Chapter 5",
                "location": group.get("suggested_location", "Library"),
                "meeting_time": (now - timedelta(hours=3)).isoformat(),
                "duration_minutes": 60,
                "created_by": user["user_id"],
                "attendees": group.get("members", []),
                "notes": "Covered main topics. Action items assigned.",
                "created_at": (now - timedelta(days=1)).isoformat(),
            },
            {
                "meeting_id": f"mtg_{uuid.uuid4().hex[:12]}",
                "group_id": user["group_id"],
                "title": "Assignment Walkthrough",
                "location": group.get("suggested_location", "Library"),
                "meeting_time": (now - timedelta(days=1, hours=5)).isoformat(),
                "duration_minutes": 45,
                "created_by": user["user_id"],
                "attendees": group.get("members", []),
                "notes": "Reviewed assignment requirements. Split tasks among members.",
                "created_at": (now - timedelta(days=2)).isoformat(),
            },
        ]
        for m in sample_meetings:
            await db.meetings.insert_one(m)
            m.pop("_id", None)
        meetings = sample_meetings

    # Split into upcoming and past
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    upcoming = []
    past = []

    for m in meetings:
        mt = m.get("meeting_time", "")
        if isinstance(mt, str):
            try:
                meeting_dt = datetime.fromisoformat(mt.replace("Z", "+00:00"))
            except Exception:
                meeting_dt = now
        else:
            meeting_dt = mt

        # Make sure meeting_dt is timezone-aware
        if meeting_dt.tzinfo is None:
            meeting_dt = meeting_dt.replace(tzinfo=timezone.utc)

        end_time = meeting_dt + timedelta(minutes=m.get("duration_minutes", 60))
        if end_time < one_hour_ago:
            m["status"] = "past"
            past.append(m)
        else:
            m["status"] = "upcoming"
            upcoming.append(m)

    return {"upcoming": upcoming, "past": past, "course": group.get("course", "")}


@api_router.post("/meetings/create")
async def create_meeting(request: Request):
    """Create a new meeting for user's group"""
    user = await get_current_user(request)
    body = await request.json()

    if not user.get("group_id"):
        raise HTTPException(status_code=400, detail="You must be in a group")

    title = body.get("title", "").strip()
    location = body.get("location", "").strip()
    meeting_time = body.get("meeting_time", "")
    duration_minutes = body.get("duration_minutes", 60)

    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if not meeting_time:
        raise HTTPException(status_code=400, detail="Meeting time is required")

    group = await db.groups.find_one({"group_id": user["group_id"]}, {"_id": 0})

    meeting = {
        "meeting_id": f"mtg_{uuid.uuid4().hex[:12]}",
        "group_id": user["group_id"],
        "title": title,
        "location": location or group.get("suggested_location", "Library"),
        "meeting_time": meeting_time,
        "duration_minutes": duration_minutes,
        "created_by": user["user_id"],
        "attendees": group.get("members", []) if group else [user["user_id"]],
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.meetings.insert_one(meeting)
    meeting.pop("_id", None)
    return {"message": "Meeting created!", "meeting": meeting}


@api_router.put("/meetings/{meeting_id}/notes")
async def update_meeting_notes(request: Request, meeting_id: str):
    """Update notes for a past meeting"""
    user = await get_current_user(request)
    body = await request.json()
    notes = body.get("notes", "")

    result = await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {"notes": notes}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")

    return {"message": "Notes updated"}



# ==================== REPORT USER ROUTES ====================

@api_router.post("/reports/user")
async def report_user(request: Request):
    """Report a user — logs to DB for admin review"""
    user = await get_current_user(request)
    body = await request.json()

    reported_user_id = body.get("reported_user_id", "")
    reason = body.get("reason", "").strip()

    if not reported_user_id:
        raise HTTPException(status_code=400, detail="reported_user_id is required")

    report = {
        "report_id": f"rpt_{uuid.uuid4().hex[:12]}",
        "reporter_id": user["user_id"],
        "reporter_name": user.get("name", "Unknown"),
        "reported_user_id": reported_user_id,
        "reason": reason or "No reason provided",
        "group_id": user.get("group_id"),
        "created_at": datetime.now(timezone.utc),
    }

    await db.user_reports.insert_one(report)
    report.pop("_id", None)
    logger.info(f"User report: {user['user_id']} reported {reported_user_id} — {reason}")

    return {"message": "Report submitted. Our team will review this.", "report_id": report["report_id"]}


# ==================== APP REVIEW ROUTES ====================

@api_router.post("/reviews/submit")
async def submit_review(request: Request):
    """Submit a star review for the Studynk app"""
    user = await get_current_user(request)
    body = await request.json()

    rating = body.get("rating")
    feedback = body.get("feedback", "").strip()

    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be an integer between 1 and 5")

    review = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "rating": rating,
        "feedback": feedback if feedback else None,
        "total_checkins_at_review": user.get("total_checkins", 0),
        "created_at": datetime.now(timezone.utc),
    }

    await db.reviews.insert_one(review)

    # Record when the user last reviewed so we don't re-prompt immediately
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_review_checkin": user.get("total_checkins", 0)}}
    )

    review.pop("_id", None)
    return {"message": "Thank you for your review!", "review": review}


@api_router.get("/reviews/stats")
async def get_review_stats(request: Request):
    """Get aggregate review stats (internal analytics)"""
    user = await get_current_user(request)

    total_reviews = await db.reviews.count_documents({})
    pipeline = [{"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    avg_rating = round(result[0]["avg_rating"], 1) if result else 0

    # Get user's own reviews
    my_reviews = await db.reviews.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    return {
        "total_reviews": total_reviews,
        "average_rating": avg_rating,
        "my_reviews": my_reviews,
    }


# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Studynk API v1.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include router

# ==================== STUDY LOCATIONS SEED DATA ====================

STUDY_LOCATIONS_SEED = [
    {
        "location_id": "loc_001",
        "name": "Main Library",
        "type": "library",
        "address": "University Campus, Building A",
        "description": "The main university library with 3 floors of study space, group rooms, and silent zones.",
        "opening_hours": {"weekday": "07:00 - 23:00", "saturday": "08:00 - 22:00", "sunday": "09:00 - 21:00"},
        "amenities": ["WiFi", "Power outlets", "Group rooms", "Silent zone", "Printers", "Cafe"],
        "latitude": 51.5074,
        "longitude": -0.1278,
        "capacity": 500,
        "image_url": None,
    },
    {
        "location_id": "loc_002",
        "name": "Science Library",
        "type": "library",
        "address": "Science Quarter, Floor 2",
        "description": "Specialist science and engineering library with lab-adjacent study pods and STEM resources.",
        "opening_hours": {"weekday": "08:00 - 22:00", "saturday": "09:00 - 20:00", "sunday": "10:00 - 18:00"},
        "amenities": ["WiFi", "Power outlets", "STEM databases", "3D printers", "Whiteboards"],
        "latitude": 51.5084,
        "longitude": -0.1268,
        "capacity": 200,
        "image_url": None,
    },
    {
        "location_id": "loc_003",
        "name": "The Study Bean",
        "type": "cafe",
        "address": "12 College Road",
        "description": "Student-friendly cafe with great coffee, fast WiFi, and a relaxed atmosphere perfect for group work.",
        "opening_hours": {"weekday": "07:30 - 21:00", "saturday": "08:00 - 21:00", "sunday": "09:00 - 19:00"},
        "amenities": ["WiFi", "Power outlets", "Coffee", "Snacks", "Background music"],
        "latitude": 51.5064,
        "longitude": -0.1288,
        "capacity": 60,
        "image_url": None,
    },
    {
        "location_id": "loc_004",
        "name": "Student Union Hub",
        "type": "study_hub",
        "address": "Student Union Building, Level 1",
        "description": "Open-plan study area in the SU with bookable group tables and presentation screens.",
        "opening_hours": {"weekday": "08:00 - 00:00", "saturday": "09:00 - 22:00", "sunday": "10:00 - 22:00"},
        "amenities": ["WiFi", "Power outlets", "Group tables", "Screens", "Vending machines", "Microwave"],
        "latitude": 51.5094,
        "longitude": -0.1258,
        "capacity": 150,
        "image_url": None,
    },
    {
        "location_id": "loc_005",
        "name": "Quiet Corner Cafe",
        "type": "cafe",
        "address": "34 Academic Avenue",
        "description": "A cozy, quiet cafe popular with postgrads. No loud music policy makes it ideal for deep focus sessions.",
        "opening_hours": {"weekday": "08:00 - 20:00", "saturday": "09:00 - 18:00", "sunday": "Closed"},
        "amenities": ["WiFi", "Power outlets", "Quiet policy", "Tea & Coffee", "Pastries"],
        "latitude": 51.5054,
        "longitude": -0.1298,
        "capacity": 35,
        "image_url": None,
    },
    {
        "location_id": "loc_006",
        "name": "24hr Learning Commons",
        "type": "study_hub",
        "address": "University Campus, Building C",
        "description": "Round-the-clock study space with individual desks, group pods, and a help desk during term time.",
        "opening_hours": {"weekday": "Open 24 hours", "saturday": "Open 24 hours", "sunday": "Open 24 hours"},
        "amenities": ["WiFi", "Power outlets", "24hr access", "Vending machines", "Help desk", "Lockers"],
        "latitude": 51.5104,
        "longitude": -0.1248,
        "capacity": 300,
        "image_url": None,
    },
    {
        "location_id": "loc_007",
        "name": "Law Library",
        "type": "library",
        "address": "Law Faculty, Ground Floor",
        "description": "Dedicated law library with legal databases, case study rooms, and moot court practice facilities.",
        "opening_hours": {"weekday": "08:00 - 21:00", "saturday": "09:00 - 17:00", "sunday": "Closed"},
        "amenities": ["WiFi", "Legal databases", "Case study rooms", "Quiet study", "Printers"],
        "latitude": 51.5044,
        "longitude": -0.1308,
        "capacity": 120,
        "image_url": None,
    },
    {
        "location_id": "loc_008",
        "name": "Campus Green Co-work",
        "type": "study_hub",
        "address": "Innovation Park, Unit 5",
        "description": "Modern co-working space near campus with standing desks, phone booths, and bookable meeting rooms.",
        "opening_hours": {"weekday": "07:00 - 22:00", "saturday": "08:00 - 20:00", "sunday": "09:00 - 18:00"},
        "amenities": ["WiFi", "Standing desks", "Meeting rooms", "Phone booths", "Coffee bar", "Bike storage"],
        "latitude": 51.5114,
        "longitude": -0.1238,
        "capacity": 80,
        "image_url": None,
    },
]

def get_busyness():
    """Simulate real-time busyness level"""
    level = random.choice(["quiet", "moderate", "busy", "very_busy"])
    percentage = {"quiet": random.randint(10, 30), "moderate": random.randint(31, 55),
                  "busy": random.randint(56, 80), "very_busy": random.randint(81, 95)}
    return {"level": level, "percentage": percentage[level]}

async def seed_locations():
    """Seed study locations if collection is empty"""
    count = await db.study_locations.count_documents({})
    if count == 0:
        await db.study_locations.insert_many(STUDY_LOCATIONS_SEED)
        logger.info(f"Seeded {len(STUDY_LOCATIONS_SEED)} study locations")

# ==================== STUDY LOCATION ROUTES ====================

@api_router.get("/locations/search")
async def search_locations(q: str = "", type: str = ""):
    """Search study locations by name or type"""
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if type and type != "all":
        query["type"] = type

    locations = await db.study_locations.find(query, {"_id": 0}).to_list(50)

    # Add simulated busyness to each
    for loc in locations:
        loc["busyness"] = get_busyness()

    return {"locations": locations}

@api_router.get("/locations/{location_id}")
async def get_location(location_id: str):
    """Get study location details with busyness"""
    location = await db.study_locations.find_one({"location_id": location_id}, {"_id": 0})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    location["busyness"] = get_busyness()
    return location

@api_router.post("/locations/share")
async def share_location(request: Request):
    """Share a study location to the user's group chat"""
    user = await get_current_user(request)
    body = await request.json()
    location_id = body.get("location_id")
    # Support sharing Google Places results too
    place_data = body.get("place_data")
    meeting_note = body.get("meeting_note", "").strip()

    if not location_id and not place_data:
        raise HTTPException(status_code=400, detail="location_id or place_data is required")

    if place_data:
        # Sharing a Google Places result
        location_name = place_data.get("name", "Unknown Location")
        location_address = place_data.get("address", "")
        location_type = place_data.get("type", "place")
        hours_text = place_data.get("opening_hours", "Check online")
    else:
        # Sharing a seeded location
        location = await db.study_locations.find_one({"location_id": location_id}, {"_id": 0})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        location_name = location["name"]
        location_address = location["address"]
        location_type = location["type"]
        hours_text = location.get("opening_hours", {}).get("weekday", "N/A")

    # Check user has a group
    if not user.get("group_id"):
        raise HTTPException(status_code=400, detail="You must be in a group to share locations")

    # Build message content with optional meeting note
    content_lines = [
        "📍 Meet Me Here!\n",
        f"{location_name}",
        f"{location_address}",
        f"\nType: {location_type.replace('_', ' ').title()}",
        f"Hours: {hours_text}",
    ]
    if meeting_note:
        content_lines.append(f"\n📌 Meeting Spot: {meeting_note}")

    # Create a special location message in group chat
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "group_id": user["group_id"],
        "sender_id": user["user_id"],
        "sender_name": user.get("name", "Unknown"),
        "content": "\n".join(content_lines),
        "message_type": "location_share",
        "meeting_note": meeting_note if meeting_note else None,
        "location_data": place_data or {
            "location_id": location_id,
            "name": location_name,
            "address": location_address,
            "type": location_type,
        },
        "created_at": datetime.now(timezone.utc),
    }

    await db.messages.insert_one(message)
    message.pop("_id", None)

    return {"message": "Location shared to group chat!", "chat_message": message}

# ==================== GOOGLE PLACES API PROXY ====================

@api_router.get("/places/autocomplete")
async def places_autocomplete(q: str = "", types: str = ""):
    """Google Places Autocomplete - returns predictions as user types"""
    if not q or len(q) < 2:
        return {"predictions": []}

    if not MAPS_API_KEY:
        raise HTTPException(status_code=500, detail="Google Maps API key not configured")

    params = {
        "input": q,
        "key": MAPS_API_KEY,
    }
    if types:
        params["types"] = types

    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/place/autocomplete/json",
            params=params,
            timeout=5,
        )
        data = resp.json()

        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            logger.error(f"Places Autocomplete error: {data.get('status')} - {data.get('error_message', '')}")
            return {"predictions": [], "error": data.get("error_message", data.get("status"))}

        predictions = []
        for p in data.get("predictions", []):
            predictions.append({
                "place_id": p["place_id"],
                "name": p.get("structured_formatting", {}).get("main_text", p["description"]),
                "description": p["description"],
                "types": p.get("types", []),
            })

        return {"predictions": predictions}
    except Exception as e:
        logger.error(f"Places Autocomplete exception: {e}")
        return {"predictions": [], "error": str(e)}


@api_router.get("/places/details/{place_id}")
async def place_details(place_id: str):
    """Get full details for a Google Place by place_id"""
    if not MAPS_API_KEY:
        raise HTTPException(status_code=500, detail="Google Maps API key not configured")

    fields = "name,formatted_address,geometry,opening_hours,types,rating,user_ratings_total,business_status,formatted_phone_number,website,photos"

    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={"place_id": place_id, "fields": fields, "key": MAPS_API_KEY},
            timeout=5,
        )
        data = resp.json()

        if data.get("status") != "OK":
            logger.error(f"Place Details error: {data.get('status')} - {data.get('error_message', '')}")
            raise HTTPException(status_code=404, detail="Place not found")

        result = data["result"]
        location = result.get("geometry", {}).get("location", {})

        # Build photo URL if available
        photo_url = None
        photos = result.get("photos", [])
        if photos:
            photo_ref = photos[0].get("photo_reference")
            if photo_ref:
                photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo_ref}&key={MAPS_API_KEY}"

        # Parse opening hours
        hours = result.get("opening_hours", {})
        weekday_text = hours.get("weekday_text", [])
        is_open = hours.get("open_now")

        # Determine type label
        goog_types = result.get("types", [])
        if "library" in goog_types:
            place_type = "library"
        elif "cafe" in goog_types or "coffee" in " ".join(goog_types):
            place_type = "cafe"
        elif "university" in goog_types or "school" in goog_types:
            place_type = "university"
        elif "book_store" in goog_types:
            place_type = "library"
        else:
            place_type = "study_spot"

        return {
            "place_id": place_id,
            "name": result.get("name", ""),
            "address": result.get("formatted_address", ""),
            "type": place_type,
            "latitude": location.get("lat"),
            "longitude": location.get("lng"),
            "rating": result.get("rating"),
            "total_ratings": result.get("user_ratings_total"),
            "is_open_now": is_open,
            "opening_hours": weekday_text,
            "phone": result.get("formatted_phone_number"),
            "website": result.get("website"),
            "photo_url": photo_url,
            "business_status": result.get("business_status"),
            "google_types": goog_types,
        }
    except Exception as e:
        logger.error(f"Place Details exception: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch place details")

# ==================== STRIPE SUBSCRIPTION ROUTES ====================

@api_router.post("/stripe/create-checkout-session")
async def create_checkout_session(request: Request):
    """Create a Stripe Checkout Session for Basic or Pro subscription"""
    user = await get_current_user(request)
    body = await request.json()
    plan = body.get("plan", "pro")  # 'basic' or 'pro'
    success_url = body.get("success_url", "")
    cancel_url = body.get("cancel_url", "")

    if plan not in ("basic", "pro"):
        raise HTTPException(status_code=400, detail="Invalid plan. Must be 'basic' or 'pro'.")

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    # Plan configuration with live Stripe Product IDs
    PLAN_CONFIG = {
        "basic": {
            "product_id": "prod_UJHDtNLIRlOECX",
            "product_name": "Studynk Basic",
            "description": "Unlimited invites, ad-free experience, verified student badge",
            "unit_amount": 299,  # £2.99
            "trial_days": 0,
        },
        "pro": {
            "product_id": "prod_UJHECfOpyQ3DwQ",
            "product_name": "Studynk Pro",
            "description": "Priority Discovery Boost, everything in Basic, boosted profile status",
            "unit_amount": 499,  # £4.99
            "trial_days": 30,
        },
    }

    config = PLAN_CONFIG[plan]

    try:
        # Get or create Stripe customer
        stripe_customer_id = user.get("stripe_customer_id")
        if not stripe_customer_id:
            customer = stripe.Customer.create(
                email=user["email"],
                name=user.get("name", ""),
                metadata={"user_id": user["user_id"]},
            )
            stripe_customer_id = customer.id
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"stripe_customer_id": stripe_customer_id}}
            )

        # Find existing price on the live product, or create one
        prices = stripe.Price.list(
            product=config["product_id"],
            active=True,
            limit=1,
        )

        if prices.data:
            price_id = prices.data[0].id
        else:
            price = stripe.Price.create(
                product=config["product_id"],
                unit_amount=config["unit_amount"],
                currency="gbp",
                recurring={"interval": "month"},
            )
            price_id = price.id

        # Build checkout session params
        session_params = {
            "customer": stripe_customer_id,
            "mode": "subscription",
            "payment_method_types": ["card"],
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url + "?session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": cancel_url,
            "metadata": {"user_id": user["user_id"], "plan": plan},
        }

        # Only Pro gets the 30-day free trial
        if config["trial_days"] > 0:
            session_params["subscription_data"] = {"trial_period_days": config["trial_days"]}

        session = stripe.checkout.Session.create(**session_params)

        return {"checkout_url": session.url, "session_id": session.id}

    except stripe.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@api_router.get("/stripe/checkout-success")
async def checkout_success(session_id: str, request: Request):
    """Handle successful Stripe checkout — update user to Pro"""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        if session.payment_status in ("paid", "no_payment_required"):
            user_id = session.metadata.get("user_id")
            if user_id:
                # Update user to pro
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "subscription_tier": "pro",
                        "subscription_status": "active",
                        "stripe_subscription_id": session.subscription,
                        "pro_started_at": datetime.now(timezone.utc),
                    }}
                )
                return {"status": "success", "subscription_tier": "pro"}

        return {"status": "pending", "payment_status": session.payment_status}

    except stripe.StripeError as e:
        logger.error(f"Stripe checkout verify error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/stripe/confirm-pro")
async def confirm_pro(request: Request):
    """Confirm and activate Pro status after checkout (called from frontend)"""
    user = await get_current_user(request)
    body = await request.json()
    session_id = body.get("session_id")

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        # Verify the session belongs to this user
        if session.metadata.get("user_id") != user["user_id"]:
            raise HTTPException(status_code=403, detail="Session mismatch")

        if session.payment_status in ("paid", "no_payment_required"):
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {
                    "subscription_tier": "pro",
                    "subscription_status": "active",
                    "stripe_subscription_id": session.subscription,
                    "pro_started_at": datetime.now(timezone.utc),
                }}
            )
            return {"status": "success", "subscription_tier": "pro"}

        return {"status": "pending", "payment_status": session.payment_status}

    except stripe.StripeError as e:
        logger.error(f"Stripe confirm error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


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

@app.on_event("startup")
async def startup_event():
    await seed_locations()
