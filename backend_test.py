#!/usr/bin/env python3
"""
Backend API Testing for StudyMatch - Focus on Updated Endpoints
Testing two specific updated endpoints:
1. Stripe Pricing Update - POST /api/stripe/create-checkout-session
2. Location Share with Meeting Note - POST /api/locations/share
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://study-sync-44.preview.emergentagent.com/api"
TEST_EMAIL = "test@studymatch.com"
TEST_PASSWORD = "test123456"

class StudyMatchTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def authenticate(self):
        """Login and get auth token"""
        print("\n🔐 Authenticating...")
        
        # Login with email/password
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token")
                self.user_data = data.get("user")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_test("Authentication", True, f"Logged in as {self.user_data.get('email')}")
                return True
            else:
                self.log_test("Authentication", False, f"Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Authentication", False, f"Login error: {str(e)}")
            return False
    
    def test_stripe_pricing_update(self):
        """Test updated Stripe checkout session endpoint with plan parameter"""
        print("\n💳 Testing Stripe Pricing Update...")
        
        # Test 1: Basic plan checkout (£2.99, no trial)
        try:
            basic_data = {
                "plan": "basic",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
            response = self.session.post(f"{BASE_URL}/stripe/create-checkout-session", json=basic_data)
            
            if response.status_code == 200:
                data = response.json()
                if "checkout_url" in data and "session_id" in data:
                    self.log_test("Stripe Basic Plan Checkout", True, f"Basic plan checkout created successfully")
                else:
                    self.log_test("Stripe Basic Plan Checkout", False, "Missing checkout_url or session_id in response")
            else:
                self.log_test("Stripe Basic Plan Checkout", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Stripe Basic Plan Checkout", False, f"Error: {str(e)}")
        
        # Test 2: Pro plan checkout (£4.99, 30-day trial)
        try:
            pro_data = {
                "plan": "pro",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
            response = self.session.post(f"{BASE_URL}/stripe/create-checkout-session", json=pro_data)
            
            if response.status_code == 200:
                data = response.json()
                if "checkout_url" in data and "session_id" in data:
                    self.log_test("Stripe Pro Plan Checkout", True, f"Pro plan checkout created successfully")
                else:
                    self.log_test("Stripe Pro Plan Checkout", False, "Missing checkout_url or session_id in response")
            else:
                self.log_test("Stripe Pro Plan Checkout", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Stripe Pro Plan Checkout", False, f"Error: {str(e)}")
        
        # Test 3: Invalid plan value
        try:
            invalid_data = {
                "plan": "premium",  # Invalid plan
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
            response = self.session.post(f"{BASE_URL}/stripe/create-checkout-session", json=invalid_data)
            
            if response.status_code == 400:
                self.log_test("Stripe Invalid Plan Validation", True, "Correctly rejected invalid plan with 400")
            else:
                self.log_test("Stripe Invalid Plan Validation", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Stripe Invalid Plan Validation", False, f"Error: {str(e)}")
        
        # Test 4: Unauthenticated request
        try:
            # Remove auth header temporarily
            auth_header = self.session.headers.pop("Authorization", None)
            
            unauth_data = {
                "plan": "basic",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
            response = self.session.post(f"{BASE_URL}/stripe/create-checkout-session", json=unauth_data)
            
            # Restore auth header
            if auth_header:
                self.session.headers["Authorization"] = auth_header
            
            if response.status_code == 401:
                self.log_test("Stripe Unauthenticated Access", True, "Correctly rejected unauthenticated request with 401")
            else:
                self.log_test("Stripe Unauthenticated Access", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            # Restore auth header in case of error
            if auth_header:
                self.session.headers["Authorization"] = auth_header
            self.log_test("Stripe Unauthenticated Access", False, f"Error: {str(e)}")
    
    def ensure_user_in_group(self):
        """Ensure user is in a group for location sharing tests"""
        print("\n👥 Checking group membership...")
        
        try:
            # Check current user status
            user_response = self.session.get(f"{BASE_URL}/auth/me")
            if user_response.status_code != 200:
                self.log_test("User Status Check", False, "Could not get user status")
                return False
            
            user_data = user_response.json()
            
            # If user already has a group, we're good
            if user_data.get("group_id"):
                self.log_test("Group Membership Check", True, f"User is in group: {user_data.get('group_id')}")
                return True
            
            # If not in group, complete onboarding first
            print("   User not in group, completing onboarding...")
            
            # First ensure user profile is complete
            profile_data = {
                "university": "Test University",
                "course": "Computer Science",
                "study_style": "Active",
                "grade_goal": "High achiever",
                "location_preference": "Library",
                "weekly_availability": [
                    {"day": "Monday", "start_time": "09:00", "end_time": "17:00"},
                    {"day": "Tuesday", "start_time": "09:00", "end_time": "17:00"}
                ],
                "work_ethic": 8
            }
            
            profile_response = self.session.put(f"{BASE_URL}/users/profile", json=profile_data)
            if profile_response.status_code == 200:
                print("   Profile updated successfully")
            else:
                self.log_test("Profile Update", False, f"Profile update failed: {profile_response.status_code}")
                return False
            
            # Try to find matches
            match_response = self.session.post(f"{BASE_URL}/matching/find-matches")
            if match_response.status_code == 200:
                match_data = match_response.json()
                if match_data.get("group_created"):
                    self.log_test("Group Creation", True, f"Successfully created group: {match_data.get('group_id')}")
                    return True
                else:
                    # No matches found, but that's expected in a test environment
                    self.log_test("Group Creation", False, "No matches found to create group - expected in test environment")
                    return False
            else:
                self.log_test("Group Creation", False, f"Match finding failed: {match_response.status_code} - {match_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Group Setup", False, f"Error: {str(e)}")
            return False
    
    def test_location_share_with_meeting_note(self):
        """Test updated location share endpoint with meeting_note functionality"""
        print("\n📍 Testing Location Share with Meeting Note...")
        
        # First test that the endpoint properly validates group membership
        try:
            # Get a location to share
            locations_response = self.session.get(f"{BASE_URL}/locations/search")
            if locations_response.status_code != 200:
                self.log_test("Location Share Setup", False, "Could not fetch locations for testing")
                return
            
            locations_data = locations_response.json()
            locations = locations_data.get("locations", [])
            if not locations:
                self.log_test("Location Share Setup", False, "No locations available for testing")
                return
            
            test_location = locations[0]
            location_id = test_location["location_id"]
            
            # Test validation: user not in group should get 400
            share_data = {
                "location_id": location_id,
                "meeting_note": "Test meeting note"
            }
            response = self.session.post(f"{BASE_URL}/locations/share", json=share_data)
            
            if response.status_code == 400 and "must be in a group" in response.text:
                self.log_test("Location Share Group Validation", True, "Correctly validates user must be in group")
            else:
                self.log_test("Location Share Group Validation", False, f"Unexpected response: {response.status_code} - {response.text}")
            
        except Exception as e:
            self.log_test("Location Share Group Validation", False, f"Error: {str(e)}")
        
        # Try to get user into a group for actual functionality testing
        if not self.ensure_user_in_group():
            print("   Cannot test location sharing functionality - user not in group")
            print("   This is expected in a test environment with no other users")
            self.log_test("Location Share Functionality", False, "Cannot test - requires group membership (expected in test environment)")
            return
        
        # If we reach here, user is in a group, so test the actual functionality
        try:
            # Test 1: Share location WITH meeting note
            share_data_with_note = {
                "location_id": location_id,
                "meeting_note": "Let's meet by the main entrance at 2pm"
            }
            response = self.session.post(f"{BASE_URL}/locations/share", json=share_data_with_note)
            
            if response.status_code == 200:
                data = response.json()
                chat_message = data.get("chat_message", {})
                content = chat_message.get("content", "")
                meeting_note_field = chat_message.get("meeting_note")
                
                # Check if meeting note appears in content
                if "📌 Meeting Spot: Let's meet by the main entrance at 2pm" in content:
                    self.log_test("Location Share with Meeting Note - Content", True, "Meeting note correctly added to message content")
                else:
                    self.log_test("Location Share with Meeting Note - Content", False, f"Meeting note not found in content: {content}")
                
                # Check if meeting note is stored as separate field
                if meeting_note_field == "Let's meet by the main entrance at 2pm":
                    self.log_test("Location Share with Meeting Note - Field", True, "Meeting note correctly stored as separate field")
                else:
                    self.log_test("Location Share with Meeting Note - Field", False, f"Meeting note field incorrect: {meeting_note_field}")
                    
            else:
                self.log_test("Location Share with Meeting Note", False, f"Status: {response.status_code}, Response: {response.text}")
                
            # Test 2: Share location WITHOUT meeting note (should work as before)
            share_data_without_note = {
                "location_id": location_id
            }
            response = self.session.post(f"{BASE_URL}/locations/share", json=share_data_without_note)
            
            if response.status_code == 200:
                data = response.json()
                chat_message = data.get("chat_message", {})
                content = chat_message.get("content", "")
                meeting_note_field = chat_message.get("meeting_note")
                
                # Check that no meeting note appears in content
                if "📌 Meeting Spot:" not in content:
                    self.log_test("Location Share without Meeting Note - Content", True, "No meeting note in content (as expected)")
                else:
                    self.log_test("Location Share without Meeting Note - Content", False, "Unexpected meeting note found in content")
                
                # Check that meeting_note field is None or empty
                if not meeting_note_field:
                    self.log_test("Location Share without Meeting Note - Field", True, "Meeting note field correctly empty/None")
                else:
                    self.log_test("Location Share without Meeting Note - Field", False, f"Unexpected meeting note field: {meeting_note_field}")
                    
            else:
                self.log_test("Location Share without Meeting Note", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Location Share Functionality", False, f"Error: {str(e)}")
    
    def run_tests(self):
        """Run all tests"""
        print("🧪 StudyMatch Backend Testing - Updated Endpoints")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed - cannot proceed with tests")
            return
        
        # Test updated endpoints
        self.test_stripe_pricing_update()
        self.test_location_share_with_meeting_note()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = StudyMatchTester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)