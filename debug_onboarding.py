#!/usr/bin/env python3
"""
Debug the onboarding issue
"""

import requests
import json
import uuid
import time
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Configuration
BASE_URL = "https://study-sync-44.preview.emergentagent.com/api"
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# MongoDB connection for test data setup
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

def debug_onboarding_issue():
    """Debug the onboarding issue"""
    
    # Clean up any existing test data
    db.users.delete_many({"email": {"$regex": "debug.*@example.ac.uk"}})
    db.user_sessions.delete_many({"session_token": {"$regex": "debug_session"}})
    
    # Create test user WITHOUT onboarding completed
    user_id = f"debug_user_{uuid.uuid4().hex[:8]}"
    session_token = f"debug_session_{uuid.uuid4().hex[:8]}"
    
    test_user = {
        "user_id": user_id,
        "email": f"debug.user.{int(time.time())}@example.ac.uk",
        "name": "Debug User",
        "picture": "https://via.placeholder.com/150",
        "university": None,
        "course": None,
        "study_style": None,
        "grade_goal": None,
        "location_preference": None,
        "weekly_availability": [],
        "work_ethic": 5,
        "onboarding_completed": False,  # Explicitly set to False
        "matching_status": "pending",
        "group_id": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    test_session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    
    db.users.insert_one(test_user)
    db.user_sessions.insert_one(test_session)
    
    print(f"Created debug user: {user_id}")
    print(f"Onboarding completed: {test_user['onboarding_completed']}")
    
    # Test the user profile endpoint
    headers = {"Authorization": f"Bearer {session_token}"}
    response = requests.get(f"{BASE_URL}/users/profile", headers=headers, timeout=10)
    
    if response.status_code == 200:
        user_data = response.json()
        print(f"User data from API: {json.dumps(user_data, indent=2)}")
        print(f"API onboarding_completed: {user_data.get('onboarding_completed')}")
    else:
        print(f"Failed to get user profile: {response.status_code}")
        return
    
    # Test matching endpoint
    response = requests.post(f"{BASE_URL}/matching/find-matches", headers=headers, timeout=10)
    print(f"Matching response status: {response.status_code}")
    print(f"Matching response: {response.text}")
    
    # Check user in database again
    db_user = db.users.find_one({"user_id": user_id})
    print(f"DB user onboarding_completed: {db_user.get('onboarding_completed')}")
    
    # Cleanup
    db.users.delete_many({"email": {"$regex": "debug.*@example.ac.uk"}})
    db.user_sessions.delete_many({"session_token": {"$regex": "debug_session"}})

if __name__ == "__main__":
    debug_onboarding_issue()