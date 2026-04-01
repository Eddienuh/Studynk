#!/usr/bin/env python3
"""
Additional comprehensive tests for StudyMatch backend
Tests messaging and attendance when user is in a group
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

def test_group_features():
    """Test messaging and attendance features when user is in a group"""
    
    # Clean up any existing test data
    db.users.delete_many({"email": {"$regex": "grouptest.*@example.ac.uk"}})
    db.user_sessions.delete_many({"session_token": {"$regex": "grouptest_session"}})
    db.groups.delete_many({"group_id": {"$regex": "grouptest_"}})
    db.messages.delete_many({"group_id": {"$regex": "grouptest_"}})
    db.attendance_sessions.delete_many({"group_id": {"$regex": "grouptest_"}})
    
    # Create test user with completed onboarding
    user_id = f"grouptest_user_{uuid.uuid4().hex[:8]}"
    session_token = f"grouptest_session_{uuid.uuid4().hex[:8]}"
    group_id = f"grouptest_group_{uuid.uuid4().hex[:8]}"
    
    test_user = {
        "user_id": user_id,
        "email": f"grouptest.user.{int(time.time())}@example.ac.uk",
        "name": "Group Test User",
        "picture": "https://via.placeholder.com/150",
        "university": "Test University",
        "course": "Computer Science",
        "study_style": "Active",
        "grade_goal": "High achiever",
        "location_preference": "Library",
        "weekly_availability": [{"day": "Monday", "start_time": "09:00", "end_time": "17:00"}],
        "work_ethic": 8,
        "onboarding_completed": True,
        "matching_status": "matched",
        "group_id": group_id,
        "created_at": datetime.now(timezone.utc)
    }
    
    test_session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    
    # Create a test group
    test_group = {
        "group_id": group_id,
        "course": "Computer Science",
        "members": [user_id],
        "compatibility_score": 85.0,
        "suggested_times": [],
        "suggested_location": "Library",
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
        "health_score": 100.0
    }
    
    db.users.insert_one(test_user)
    db.user_sessions.insert_one(test_session)
    db.groups.insert_one(test_group)
    
    print(f"Created test user in group: {user_id}")
    print(f"Group ID: {group_id}")
    
    headers = {"Authorization": f"Bearer {session_token}"}
    
    # Test messaging features
    print("\n🔄 Testing Messaging Features...")
    
    # Send a message
    message_data = {"content": "Hello group! This is a test message."}
    response = requests.post(f"{BASE_URL}/messages/send", headers=headers, json=message_data, timeout=10)
    
    if response.status_code == 200:
        message = response.json()
        print(f"✅ Message sent successfully: {message['message_id']}")
        message_id = message['message_id']
    else:
        print(f"❌ Failed to send message: {response.status_code} - {response.text}")
        return
    
    # Get group messages
    response = requests.get(f"{BASE_URL}/messages/group/{group_id}", headers=headers, timeout=10)
    
    if response.status_code == 200:
        messages_data = response.json()
        messages = messages_data.get("messages", [])
        print(f"✅ Retrieved {len(messages)} messages")
        
        if messages and messages[0]["content"] == "Hello group! This is a test message.":
            print("✅ Message content verified")
        else:
            print("❌ Message content mismatch")
    else:
        print(f"❌ Failed to get messages: {response.status_code} - {response.text}")
    
    # Test attendance features
    print("\n🔄 Testing Attendance Features...")
    
    # Check in to a study session
    response = requests.post(f"{BASE_URL}/attendance/checkin", headers=headers, json={}, timeout=10)
    
    if response.status_code == 200:
        checkin_data = response.json()
        session_id = checkin_data.get("session_id")
        print(f"✅ Checked in successfully: {session_id}")
    else:
        print(f"❌ Failed to check in: {response.status_code} - {response.text}")
        return
    
    # Get streak
    response = requests.get(f"{BASE_URL}/attendance/streak", headers=headers, timeout=10)
    
    if response.status_code == 200:
        streak_data = response.json()
        streak = streak_data.get("streak", 0)
        print(f"✅ Current streak: {streak}")
    else:
        print(f"❌ Failed to get streak: {response.status_code} - {response.text}")
    
    # Test group management
    print("\n🔄 Testing Group Management...")
    
    # Get my group
    response = requests.get(f"{BASE_URL}/groups/my-group", headers=headers, timeout=10)
    
    if response.status_code == 200:
        group_data = response.json()
        group = group_data.get("group")
        members = group_data.get("members", [])
        
        if group and group["group_id"] == group_id:
            print(f"✅ Group retrieved successfully: {len(members)} members")
        else:
            print("❌ Group data mismatch")
    else:
        print(f"❌ Failed to get group: {response.status_code} - {response.text}")
    
    # Test session creation endpoint (mock Emergent Auth)
    print("\n🔄 Testing Session Creation (Mock)...")
    
    # This would normally test the /auth/session endpoint
    # Since it requires Emergent Auth integration, we'll just verify the endpoint exists
    mock_session_data = {"session_id": "mock_session_123"}
    response = requests.post(f"{BASE_URL}/auth/session", json=mock_session_data, timeout=10)
    
    # We expect this to fail since we don't have a real Emergent session
    if response.status_code in [400, 403]:
        print("✅ Session endpoint exists and validates input")
    else:
        print(f"⚠️  Session endpoint response: {response.status_code}")
    
    # Cleanup
    print("\n🧹 Cleaning up test data...")
    db.users.delete_many({"email": {"$regex": "grouptest.*@example.ac.uk"}})
    db.user_sessions.delete_many({"session_token": {"$regex": "grouptest_session"}})
    db.groups.delete_many({"group_id": {"$regex": "grouptest_"}})
    db.messages.delete_many({"group_id": {"$regex": "grouptest_"}})
    db.attendance_sessions.delete_many({"group_id": {"$regex": "grouptest_"}})
    print("✅ Cleanup completed")

if __name__ == "__main__":
    test_group_features()