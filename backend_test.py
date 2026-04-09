#!/usr/bin/env python3
"""
StudyMatch Backend API Testing - Social Layer Features
Testing new endpoints: user search, invitations system, phone number in profile
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://study-sync-44.preview.emergentagent.com/api"

# Test credentials from test_credentials.md
TEST_EMAIL = "test@studymatch.com"
TEST_PASSWORD = "test123456"

class StudyMatchTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def test_login(self):
        """Test login and get auth token"""
        self.log("🔐 Testing login...")
        
        response = self.session.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get("token")  # Changed from "session_token" to "token"
            self.user_data = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
            self.log(f"✅ Login successful - User: {self.user_data.get('name', 'Unknown')}")
            return True
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def test_user_search(self):
        """Test GET /api/users/search endpoint"""
        self.log("\n👥 Testing User Search endpoint...")
        
        # Test 1: Search with short query (should return empty)
        self.log("Test 1: Short query (1 character)")
        response = self.session.get(f"{BASE_URL}/users/search?q=t")
        if response.status_code == 200:
            data = response.json()
            if data.get("users") == []:
                self.log("✅ Short query correctly returns empty results")
            else:
                self.log(f"⚠️ Short query returned {len(data.get('users', []))} results (expected 0)")
        else:
            self.log(f"❌ Short query test failed: {response.status_code}")
            
        # Test 2: Search with valid query
        self.log("Test 2: Valid query 'test'")
        response = self.session.get(f"{BASE_URL}/users/search?q=test")
        if response.status_code == 200:
            data = response.json()
            users = data.get("users", [])
            self.log(f"✅ Search returned {len(users)} users")
            if users:
                # Check that current user is not in results
                current_user_id = self.user_data.get("user_id")
                user_ids = [u.get("user_id") for u in users]
                if current_user_id not in user_ids:
                    self.log("✅ Current user correctly excluded from search results")
                else:
                    self.log("⚠️ Current user found in search results (should be excluded)")
        else:
            self.log(f"❌ Valid query test failed: {response.status_code}")
            
        # Test 3: Search without auth (should fail)
        self.log("Test 3: Search without authentication")
        headers_backup = self.session.headers.copy()
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]
        
        response = self.session.get(f"{BASE_URL}/users/search?q=test")
        if response.status_code == 401:
            self.log("✅ Unauthenticated search correctly returns 401")
        else:
            self.log(f"❌ Unauthenticated search should return 401, got {response.status_code}")
            
        # Restore auth headers
        self.session.headers.update(headers_backup)
        
    def test_phone_number_profile_update(self):
        """Test PUT /api/users/profile with phone_number field"""
        self.log("\n📱 Testing phone number in profile update...")
        
        test_phone = "+447123456789"
        
        response = self.session.put(f"{BASE_URL}/users/profile", json={
            "phone_number": test_phone
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("phone_number") == test_phone:
                self.log(f"✅ Phone number successfully updated to {test_phone}")
                
                # Verify by getting profile
                profile_response = self.session.get(f"{BASE_URL}/users/profile")
                if profile_response.status_code == 200:
                    profile_data = profile_response.json()
                    if profile_data.get("phone_number") == test_phone:
                        self.log("✅ Phone number persisted correctly in profile")
                    else:
                        self.log("❌ Phone number not persisted in profile")
                else:
                    self.log("❌ Failed to verify phone number persistence")
            else:
                self.log(f"❌ Phone number not updated correctly. Got: {data.get('phone_number')}")
        else:
            self.log(f"❌ Phone number update failed: {response.status_code} - {response.text}")
    
    def test_pending_invitations(self):
        """Test GET /api/invitations/pending endpoint"""
        self.log("\n📨 Testing pending invitations endpoint...")
        
        # Test with auth
        response = self.session.get(f"{BASE_URL}/invitations/pending")
        if response.status_code == 200:
            data = response.json()
            invitations = data.get("invitations", [])
            self.log(f"✅ Pending invitations endpoint working - Found {len(invitations)} invitations")
            
            if invitations:
                self.log("📋 Invitation details:")
                for inv in invitations[:3]:  # Show first 3
                    self.log(f"  - ID: {inv.get('invitation_id')}, Group: {inv.get('group_name')}, From: {inv.get('invited_by_name')}")
        else:
            self.log(f"❌ Pending invitations failed: {response.status_code} - {response.text}")
            
        # Test without auth
        self.log("Test: Pending invitations without authentication")
        headers_backup = self.session.headers.copy()
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]
        
        response = self.session.get(f"{BASE_URL}/invitations/pending")
        if response.status_code == 401:
            self.log("✅ Unauthenticated request correctly returns 401")
        else:
            self.log(f"❌ Unauthenticated request should return 401, got {response.status_code}")
            
        # Restore auth headers
        self.session.headers.update(headers_backup)
    
    def test_send_invitation(self):
        """Test POST /api/invitations/send endpoint"""
        self.log("\n📤 Testing send invitation endpoint...")
        
        # First, check if user is in a group
        current_group_id = self.user_data.get("group_id")
        
        if not current_group_id:
            self.log("⚠️ User not in a group - testing error case")
            
            # Test sending invitation without being in a group (should fail)
            response = self.session.post(f"{BASE_URL}/invitations/send", json={
                "target_user_id": "dummy_user_id"
            })
            
            if response.status_code == 400 and "must be in a group" in response.text.lower():
                self.log("✅ Correctly prevents invitation when user not in group")
            else:
                self.log(f"❌ Should prevent invitation when not in group. Got: {response.status_code}")
        else:
            self.log(f"✅ User is in group {current_group_id}")
            
            # Test with missing target_user_id
            self.log("Test: Missing target_user_id")
            response = self.session.post(f"{BASE_URL}/invitations/send", json={})
            if response.status_code == 400 and "target_user_id required" in response.text:
                self.log("✅ Correctly validates missing target_user_id")
            else:
                self.log(f"❌ Should validate missing target_user_id. Got: {response.status_code}")
                
            # Test with invalid target_user_id
            self.log("Test: Invalid target_user_id")
            response = self.session.post(f"{BASE_URL}/invitations/send", json={
                "target_user_id": "invalid_user_id_12345"
            })
            if response.status_code == 404:
                self.log("✅ Correctly handles invalid target_user_id")
            else:
                self.log(f"❌ Should return 404 for invalid user. Got: {response.status_code}")
        
        # Test without auth
        self.log("Test: Send invitation without authentication")
        headers_backup = self.session.headers.copy()
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]
        
        response = self.session.post(f"{BASE_URL}/invitations/send", json={
            "target_user_id": "dummy_user_id"
        })
        if response.status_code == 401:
            self.log("✅ Unauthenticated request correctly returns 401")
        else:
            self.log(f"❌ Unauthenticated request should return 401, got {response.status_code}")
            
        # Restore auth headers
        self.session.headers.update(headers_backup)
    
    def test_respond_invitation(self):
        """Test POST /api/invitations/respond endpoint"""
        self.log("\n📥 Testing respond to invitation endpoint...")
        
        # Test with missing parameters
        self.log("Test: Missing invitation_id and action")
        response = self.session.post(f"{BASE_URL}/invitations/respond", json={})
        if response.status_code == 400:
            self.log("✅ Correctly validates missing parameters")
        else:
            self.log(f"❌ Should validate missing parameters. Got: {response.status_code}")
            
        # Test with invalid action
        self.log("Test: Invalid action")
        response = self.session.post(f"{BASE_URL}/invitations/respond", json={
            "invitation_id": "dummy_id",
            "action": "invalid_action"
        })
        if response.status_code == 400:
            self.log("✅ Correctly validates invalid action")
        else:
            self.log(f"❌ Should validate invalid action. Got: {response.status_code}")
            
        # Test with non-existent invitation
        self.log("Test: Non-existent invitation")
        response = self.session.post(f"{BASE_URL}/invitations/respond", json={
            "invitation_id": "non_existent_invitation_id",
            "action": "accept"
        })
        if response.status_code == 404:
            self.log("✅ Correctly handles non-existent invitation")
        else:
            self.log(f"❌ Should return 404 for non-existent invitation. Got: {response.status_code}")
        
        # Test without auth
        self.log("Test: Respond to invitation without authentication")
        headers_backup = self.session.headers.copy()
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]
        
        response = self.session.post(f"{BASE_URL}/invitations/respond", json={
            "invitation_id": "dummy_id",
            "action": "accept"
        })
        if response.status_code == 401:
            self.log("✅ Unauthenticated request correctly returns 401")
        else:
            self.log(f"❌ Unauthenticated request should return 401, got {response.status_code}")
            
        # Restore auth headers
        self.session.headers.update(headers_backup)
    
    def run_all_tests(self):
        """Run all Social Layer API tests"""
        self.log("🚀 Starting StudyMatch Social Layer API Tests")
        self.log(f"Backend URL: {BASE_URL}")
        
        if not self.test_login():
            self.log("❌ Cannot proceed without authentication")
            return False
            
        # Run all Social Layer tests
        self.test_user_search()
        self.test_phone_number_profile_update()
        self.test_pending_invitations()
        self.test_send_invitation()
        self.test_respond_invitation()
        
        self.log("\n🏁 Social Layer API testing completed!")
        return True

if __name__ == "__main__":
    tester = StudyMatchTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)