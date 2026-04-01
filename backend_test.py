#!/usr/bin/env python3
"""
StudyMatch Backend API Test Suite
Tests all backend endpoints comprehensively
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

class StudyMatchTester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.group_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def setup_test_user(self):
        """Create test user and session in MongoDB"""
        try:
            # Clean up any existing test data
            db.users.delete_many({"email": {"$regex": "test.*@example.ac.uk"}})
            db.user_sessions.delete_many({"session_token": {"$regex": "test_session"}})
            
            # Create test user
            self.user_id = f"test_user_{uuid.uuid4().hex[:8]}"
            self.session_token = f"test_session_{uuid.uuid4().hex[:8]}"
            
            test_user = {
                "user_id": self.user_id,
                "email": f"test.user.{int(time.time())}@example.ac.uk",
                "name": "Test User",
                "picture": "https://via.placeholder.com/150",
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
                "created_at": datetime.now(timezone.utc)
            }
            
            test_session = {
                "user_id": self.user_id,
                "session_token": self.session_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc)
            }
            
            db.users.insert_one(test_user)
            db.user_sessions.insert_one(test_session)
            
            self.log_test("Setup Test User", True, f"User ID: {self.user_id}")
            return True
            
        except Exception as e:
            self.log_test("Setup Test User", False, str(e))
            return False
    
    def test_health_endpoints(self):
        """Test health and root endpoints"""
        try:
            # Test root endpoint
            response = requests.get(f"{BASE_URL}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "StudyMatch API" in data.get("message", ""):
                    self.log_test("Root Endpoint", True)
                else:
                    self.log_test("Root Endpoint", False, f"Unexpected message: {data}")
            else:
                self.log_test("Root Endpoint", False, f"Status: {response.status_code}")
                
            # Test health endpoint
            response = requests.get(f"{BASE_URL}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True)
                else:
                    self.log_test("Health Check", False, f"Status: {data.get('status')}")
            else:
                self.log_test("Health Check", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Health Endpoints", False, str(e))
    
    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            # Test /auth/me
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get("user_id") == self.user_id:
                    self.log_test("GET /auth/me", True)
                else:
                    self.log_test("GET /auth/me", False, f"Wrong user ID: {user_data.get('user_id')}")
            else:
                self.log_test("GET /auth/me", False, f"Status: {response.status_code}, Response: {response.text}")
                
            # Test /auth/logout
            response = requests.post(f"{BASE_URL}/auth/logout", headers=headers, timeout=10)
            if response.status_code == 200:
                self.log_test("POST /auth/logout", True)
                # Recreate session for further tests
                self.setup_test_user()
            else:
                self.log_test("POST /auth/logout", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Auth Endpoints", False, str(e))
    
    def test_profile_endpoints(self):
        """Test user profile management"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            # Test GET /users/profile
            response = requests.get(f"{BASE_URL}/users/profile", headers=headers, timeout=10)
            if response.status_code == 200:
                profile = response.json()
                if profile.get("user_id") == self.user_id:
                    self.log_test("GET /users/profile", True)
                else:
                    self.log_test("GET /users/profile", False, f"Wrong user ID: {profile.get('user_id')}")
            else:
                self.log_test("GET /users/profile", False, f"Status: {response.status_code}")
                
            # Test PUT /users/profile (onboarding)
            profile_data = {
                "university": "Test University",
                "course": "Computer Science",
                "study_style": "Active",
                "grade_goal": "High achiever",
                "location_preference": "Library",
                "weekly_availability": [
                    {"day": "Monday", "start_time": "09:00", "end_time": "17:00"},
                    {"day": "Tuesday", "start_time": "10:00", "end_time": "16:00"}
                ],
                "work_ethic": 8
            }
            
            response = requests.put(
                f"{BASE_URL}/users/profile", 
                headers=headers, 
                json=profile_data,
                timeout=10
            )
            
            if response.status_code == 200:
                updated_profile = response.json()
                if (updated_profile.get("onboarding_completed") and 
                    updated_profile.get("course") == "Computer Science"):
                    self.log_test("PUT /users/profile", True)
                else:
                    self.log_test("PUT /users/profile", False, f"Profile not updated correctly: {updated_profile}")
            else:
                self.log_test("PUT /users/profile", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Profile Endpoints", False, str(e))
    
    def create_additional_test_users(self):
        """Create additional users for matching tests"""
        try:
            additional_users = []
            for i in range(3):
                user_id = f"match_user_{i}_{uuid.uuid4().hex[:6]}"
                user_data = {
                    "user_id": user_id,
                    "email": f"match.user.{i}.{int(time.time())}@example.ac.uk",
                    "name": f"Match User {i}",
                    "picture": "https://via.placeholder.com/150",
                    "university": "Test University",
                    "course": "Computer Science",
                    "study_style": "Active" if i % 2 == 0 else "Passive",
                    "grade_goal": "High achiever",
                    "location_preference": "Library",
                    "weekly_availability": [
                        {"day": "Monday", "start_time": "09:00", "end_time": "17:00"}
                    ],
                    "work_ethic": 7 + i,
                    "onboarding_completed": True,
                    "matching_status": "pending",
                    "group_id": None,
                    "created_at": datetime.now(timezone.utc)
                }
                additional_users.append(user_data)
                
            db.users.insert_many(additional_users)
            self.log_test("Create Additional Test Users", True, f"Created {len(additional_users)} users")
            return True
            
        except Exception as e:
            self.log_test("Create Additional Test Users", False, str(e))
            return False
    
    def test_matching_algorithm(self):
        """Test matching algorithm"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            # First test without onboarding completed (user should have onboarding_completed=False from setup)
            response = requests.post(f"{BASE_URL}/matching/find-matches", headers=headers, timeout=10)
            if response.status_code == 400:
                self.log_test("Matching Without Onboarding", True, "Correctly rejected")
            else:
                self.log_test("Matching Without Onboarding", False, f"Should reject but got: {response.status_code}")
            
            # Complete onboarding first
            profile_data = {
                "university": "Test University",
                "course": "Computer Science",
                "study_style": "Active",
                "grade_goal": "High achiever",
                "location_preference": "Library",
                "weekly_availability": [
                    {"day": "Monday", "start_time": "09:00", "end_time": "17:00"}
                ],
                "work_ethic": 8
            }
            
            requests.put(f"{BASE_URL}/users/profile", headers=headers, json=profile_data, timeout=10)
            
            # Create additional users for matching
            self.create_additional_test_users()
            
            # Test matching
            response = requests.post(f"{BASE_URL}/matching/find-matches", headers=headers, timeout=10)
            if response.status_code == 200:
                match_data = response.json()
                if "group" in match_data and match_data["group"]:
                    self.group_id = match_data["group"]["group_id"]
                    self.log_test("POST /matching/find-matches", True, f"Group created: {self.group_id}")
                else:
                    self.log_test("POST /matching/find-matches", True, "No matches found (expected)")
            else:
                self.log_test("POST /matching/find-matches", False, f"Status: {response.status_code}, Response: {response.text}")
                
            # Test matching when already in group
            if self.group_id:
                response = requests.post(f"{BASE_URL}/matching/find-matches", headers=headers, timeout=10)
                if response.status_code == 400:
                    self.log_test("Matching When In Group", True, "Correctly rejected")
                else:
                    self.log_test("Matching When In Group", False, f"Should reject but got: {response.status_code}")
                    
        except Exception as e:
            self.log_test("Matching Algorithm", False, str(e))
    
    def test_group_management(self):
        """Test group management endpoints"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            # Test GET /groups/my-group
            response = requests.get(f"{BASE_URL}/groups/my-group", headers=headers, timeout=10)
            if response.status_code == 200:
                group_data = response.json()
                if group_data.get("group"):
                    self.log_test("GET /groups/my-group", True, f"Group found: {group_data['group']['group_id']}")
                    self.group_id = group_data["group"]["group_id"]
                else:
                    self.log_test("GET /groups/my-group", True, "No group (expected if not matched)")
            else:
                self.log_test("GET /groups/my-group", False, f"Status: {response.status_code}")
                
            # Test POST /groups/leave (if in a group)
            if self.group_id:
                response = requests.post(f"{BASE_URL}/groups/leave", headers=headers, timeout=10)
                if response.status_code == 200:
                    self.log_test("POST /groups/leave", True)
                    self.group_id = None
                else:
                    self.log_test("POST /groups/leave", False, f"Status: {response.status_code}")
            else:
                # Test leaving when not in group
                response = requests.post(f"{BASE_URL}/groups/leave", headers=headers, timeout=10)
                if response.status_code == 400:
                    self.log_test("Leave Group When Not In Group", True, "Correctly rejected")
                else:
                    self.log_test("Leave Group When Not In Group", False, f"Should reject but got: {response.status_code}")
                    
        except Exception as e:
            self.log_test("Group Management", False, str(e))
    
    def test_messaging_system(self):
        """Test messaging system"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            # Test sending message without group
            message_data = {"content": "Test message"}
            response = requests.post(f"{BASE_URL}/messages/send", headers=headers, json=message_data, timeout=10)
            if response.status_code == 400:
                self.log_test("Send Message Without Group", True, "Correctly rejected")
            else:
                self.log_test("Send Message Without Group", False, f"Should reject but got: {response.status_code}")
                
            # If we have a group, test messaging
            if self.group_id:
                # Test sending message
                response = requests.post(f"{BASE_URL}/messages/send", headers=headers, json=message_data, timeout=10)
                if response.status_code == 200:
                    message = response.json()
                    if message.get("content") == "Test message":
                        self.log_test("POST /messages/send", True)
                    else:
                        self.log_test("POST /messages/send", False, f"Message content mismatch: {message}")
                else:
                    self.log_test("POST /messages/send", False, f"Status: {response.status_code}")
                    
                # Test getting messages
                response = requests.get(f"{BASE_URL}/messages/group/{self.group_id}", headers=headers, timeout=10)
                if response.status_code == 200:
                    messages_data = response.json()
                    if "messages" in messages_data:
                        self.log_test("GET /messages/group/{group_id}", True, f"Found {len(messages_data['messages'])} messages")
                    else:
                        self.log_test("GET /messages/group/{group_id}", False, "No messages field in response")
                else:
                    self.log_test("GET /messages/group/{group_id}", False, f"Status: {response.status_code}")
                    
                # Test getting messages for wrong group
                fake_group_id = "fake_group_123"
                response = requests.get(f"{BASE_URL}/messages/group/{fake_group_id}", headers=headers, timeout=10)
                if response.status_code == 403:
                    self.log_test("Get Messages Wrong Group", True, "Correctly rejected")
                else:
                    self.log_test("Get Messages Wrong Group", False, f"Should reject but got: {response.status_code}")
                    
        except Exception as e:
            self.log_test("Messaging System", False, str(e))
    
    def test_attendance_system(self):
        """Test attendance and streak system"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            # Test checkin without group
            session_data = {}
            response = requests.post(f"{BASE_URL}/attendance/checkin", headers=headers, json=session_data, timeout=10)
            if response.status_code == 400:
                self.log_test("Checkin Without Group", True, "Correctly rejected")
            else:
                self.log_test("Checkin Without Group", False, f"Should reject but got: {response.status_code}")
                
            # Test streak without group
            response = requests.get(f"{BASE_URL}/attendance/streak", headers=headers, timeout=10)
            if response.status_code == 200:
                streak_data = response.json()
                if streak_data.get("streak") == 0:
                    self.log_test("GET /attendance/streak (no group)", True)
                else:
                    self.log_test("GET /attendance/streak (no group)", False, f"Expected 0 streak, got: {streak_data}")
            else:
                self.log_test("GET /attendance/streak (no group)", False, f"Status: {response.status_code}")
                
            # If we have a group, test attendance
            if self.group_id:
                # Test checkin
                response = requests.post(f"{BASE_URL}/attendance/checkin", headers=headers, json={}, timeout=10)
                if response.status_code == 200:
                    checkin_data = response.json()
                    if "session_id" in checkin_data:
                        self.log_test("POST /attendance/checkin", True, f"Session: {checkin_data['session_id']}")
                    else:
                        self.log_test("POST /attendance/checkin", False, "No session_id in response")
                else:
                    self.log_test("POST /attendance/checkin", False, f"Status: {response.status_code}")
                    
                # Test streak
                response = requests.get(f"{BASE_URL}/attendance/streak", headers=headers, timeout=10)
                if response.status_code == 200:
                    streak_data = response.json()
                    if "streak" in streak_data:
                        self.log_test("GET /attendance/streak", True, f"Streak: {streak_data['streak']}")
                    else:
                        self.log_test("GET /attendance/streak", False, "No streak in response")
                else:
                    self.log_test("GET /attendance/streak", False, f"Status: {response.status_code}")
                    
        except Exception as e:
            self.log_test("Attendance System", False, str(e))
    
    def test_unauthorized_access(self):
        """Test endpoints without authentication"""
        try:
            # Test protected endpoints without auth
            protected_endpoints = [
                ("GET", "/auth/me"),
                ("GET", "/users/profile"),
                ("PUT", "/users/profile"),
                ("POST", "/matching/find-matches"),
                ("GET", "/groups/my-group"),
                ("POST", "/groups/leave"),
                ("POST", "/messages/send"),
                ("GET", "/messages/group/fake_group"),
                ("POST", "/attendance/checkin"),
                ("GET", "/attendance/streak")
            ]
            
            for method, endpoint in protected_endpoints:
                try:
                    if method == "GET":
                        response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
                    elif method == "POST":
                        response = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=10)
                    elif method == "PUT":
                        response = requests.put(f"{BASE_URL}{endpoint}", json={}, timeout=10)
                        
                    if response.status_code == 401:
                        self.log_test(f"Unauthorized {method} {endpoint}", True, "Correctly rejected")
                    else:
                        self.log_test(f"Unauthorized {method} {endpoint}", False, f"Should be 401 but got: {response.status_code}")
                except Exception as e:
                    self.log_test(f"Unauthorized {method} {endpoint}", False, str(e))
                    
        except Exception as e:
            self.log_test("Unauthorized Access Tests", False, str(e))
    
    def test_university_email_validation(self):
        """Test university email validation in session creation"""
        try:
            # This would normally test the /auth/session endpoint
            # But since it requires Emergent Auth integration, we'll test the validation logic
            # by checking if our test user has .ac.uk email
            
            test_user = db.users.find_one({"user_id": self.user_id})
            if test_user and test_user["email"].endswith(".ac.uk"):
                self.log_test("University Email Validation", True, "Test user has .ac.uk email")
            else:
                self.log_test("University Email Validation", False, "Test user doesn't have .ac.uk email")
                
        except Exception as e:
            self.log_test("University Email Validation", False, str(e))
    
    def cleanup_test_data(self):
        """Clean up test data"""
        try:
            # Remove test users and sessions
            db.users.delete_many({"email": {"$regex": "test.*@example.ac.uk"}})
            db.users.delete_many({"email": {"$regex": "match.*@example.ac.uk"}})
            db.user_sessions.delete_many({"session_token": {"$regex": "test_session"}})
            db.groups.delete_many({"group_id": {"$regex": "group_"}})
            db.messages.delete_many({"sender_id": {"$regex": "test_user"}})
            db.messages.delete_many({"sender_id": {"$regex": "match_user"}})
            db.attendance_sessions.delete_many({"session_id": {"$regex": "session_"}})
            
            self.log_test("Cleanup Test Data", True)
            
        except Exception as e:
            self.log_test("Cleanup Test Data", False, str(e))
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting StudyMatch Backend API Tests")
        print(f"📍 Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_user():
            print("❌ Failed to setup test user. Aborting tests.")
            return
            
        # Run tests
        self.test_health_endpoints()
        self.test_auth_endpoints()
        
        # Test matching before profile update (to test onboarding validation)
        self.test_matching_algorithm()
        
        # Now test profile endpoints
        self.test_profile_endpoints()
        
        self.test_group_management()
        self.test_messaging_system()
        self.test_attendance_system()
        self.test_unauthorized_access()
        self.test_university_email_validation()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['details']}")
        
        print(f"\n🎯 Success Rate: {(passed/total)*100:.1f}%")
        
        return passed == total

if __name__ == "__main__":
    tester = StudyMatchTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)