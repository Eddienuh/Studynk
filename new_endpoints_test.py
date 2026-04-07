#!/usr/bin/env python3
"""
StudyMatch Backend New Endpoints Testing
Tests the new DELETE /api/auth/delete-account and POST /api/users/upload-photo endpoints
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://study-sync-44.preview.emergentagent.com/api"

class NewEndpointsTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def register_test_user(self, email_suffix=""):
        """Register a test user and return token"""
        try:
            unique_id = uuid.uuid4().hex[:8]
            email = f"delete_test_{unique_id}{email_suffix}@test.com"
            
            payload = {
                "name": "Delete Test User",
                "email": email,
                "password": "test123456",
                "gdpr_consent": True
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=payload)
            
            if response.status_code in [200, 201]:
                data = response.json()
                return data.get("token"), email, data.get("user", {}).get("user_id")
            else:
                print(f"Failed to register test user: {response.status_code} - {response.text}")
                return None, None, None
                
        except Exception as e:
            print(f"Exception during user registration: {str(e)}")
            return None, None, None
    
    def test_delete_account_with_auth(self):
        """Test DELETE /api/auth/delete-account with valid authentication"""
        try:
            # Register a new user
            token, email, user_id = self.register_test_user()
            if not token:
                self.log_test("Delete account with auth", False, "Failed to register test user")
                return False
            
            # Delete the account
            headers = {"Authorization": f"Bearer {token}"}
            response = self.session.delete(f"{BASE_URL}/auth/delete-account", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "deleted" in data["message"].lower():
                    # Verify user no longer exists by trying to login
                    login_payload = {"email": email, "password": "test123456"}
                    login_response = self.session.post(f"{BASE_URL}/auth/login", json=login_payload)
                    
                    if login_response.status_code == 401:
                        self.log_test("Delete account with auth", True, 
                                    f"Account deleted successfully and login verification failed as expected")
                        return True
                    else:
                        self.log_test("Delete account with auth", False, 
                                    f"Account deleted but user can still login: {login_response.status_code}")
                        return False
                else:
                    self.log_test("Delete account with auth", False, 
                                f"Unexpected response message: {data}")
                    return False
            else:
                self.log_test("Delete account with auth", False, 
                            f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Delete account with auth", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_account_without_auth(self):
        """Test DELETE /api/auth/delete-account without authentication"""
        try:
            response = self.session.delete(f"{BASE_URL}/auth/delete-account")
            
            if response.status_code == 401:
                self.log_test("Delete account without auth returns 401", True, 
                            "Correctly rejected request without authentication")
                return True
            else:
                self.log_test("Delete account without auth returns 401", False, 
                            f"Expected 401, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Delete account without auth returns 401", False, f"Exception: {str(e)}")
            return False
    
    def test_upload_photo_with_auth(self):
        """Test POST /api/users/upload-photo with valid authentication"""
        try:
            # Register a new user
            token, email, user_id = self.register_test_user("_photo")
            if not token:
                self.log_test("Upload photo with auth", False, "Failed to register test user")
                return False
            
            # Small test base64 image (1x1 pixel PNG)
            test_photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            
            payload = {"photo": test_photo}
            headers = {"Authorization": f"Bearer {token}"}
            response = self.session.post(f"{BASE_URL}/users/upload-photo", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "profile_photo" in data:
                    # Verify photo persists by calling GET /api/auth/me
                    me_response = self.session.get(f"{BASE_URL}/auth/me", headers=headers)
                    if me_response.status_code == 200:
                        me_data = me_response.json()
                        if "profile_photo" in me_data:
                            self.log_test("Upload photo with auth", True, 
                                        f"Photo uploaded successfully and persists in user profile")
                            return True
                        else:
                            self.log_test("Upload photo with auth", False, 
                                        f"Photo uploaded but not found in /auth/me response")
                            return False
                    else:
                        self.log_test("Upload photo with auth", False, 
                                    f"Photo uploaded but /auth/me failed: {me_response.status_code}")
                        return False
                else:
                    self.log_test("Upload photo with auth", False, 
                                f"Unexpected response structure: {data}")
                    return False
            else:
                self.log_test("Upload photo with auth", False, 
                            f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Upload photo with auth", False, f"Exception: {str(e)}")
            return False
    
    def test_upload_photo_without_data(self):
        """Test POST /api/users/upload-photo without photo data"""
        try:
            # Register a new user
            token, email, user_id = self.register_test_user("_nodata")
            if not token:
                self.log_test("Upload photo without data", False, "Failed to register test user")
                return False
            
            payload = {}  # No photo data
            headers = {"Authorization": f"Bearer {token}"}
            response = self.session.post(f"{BASE_URL}/users/upload-photo", json=payload, headers=headers)
            
            if response.status_code == 400:
                self.log_test("Upload photo without data returns 400", True, 
                            "Correctly rejected request without photo data")
                return True
            else:
                self.log_test("Upload photo without data returns 400", False, 
                            f"Expected 400, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Upload photo without data returns 400", False, f"Exception: {str(e)}")
            return False
    
    def test_upload_photo_without_auth(self):
        """Test POST /api/users/upload-photo without authentication"""
        try:
            test_photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            payload = {"photo": test_photo}
            
            response = self.session.post(f"{BASE_URL}/users/upload-photo", json=payload)
            
            if response.status_code == 401:
                self.log_test("Upload photo without auth returns 401", True, 
                            "Correctly rejected request without authentication")
                return True
            else:
                self.log_test("Upload photo without auth returns 401", False, 
                            f"Expected 401, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Upload photo without auth returns 401", False, f"Exception: {str(e)}")
            return False
    
    def test_existing_endpoints_still_work(self):
        """Test that existing endpoints still work"""
        try:
            # Register a new user
            unique_id = uuid.uuid4().hex[:8]
            email = f"existing_test_{unique_id}@test.com"
            
            # 1. Register
            register_payload = {
                "name": "Existing Test User",
                "email": email,
                "password": "test123456",
                "gdpr_consent": True
            }
            
            register_response = self.session.post(f"{BASE_URL}/auth/register", json=register_payload)
            if register_response.status_code not in [200, 201]:
                self.log_test("Existing endpoints still work", False, 
                            f"Register failed: {register_response.status_code} - {register_response.text}")
                return False
            
            register_data = register_response.json()
            token = register_data.get("token")
            
            # 2. Login
            login_payload = {"email": email, "password": "test123456"}
            login_response = self.session.post(f"{BASE_URL}/auth/login", json=login_payload)
            if login_response.status_code != 200:
                self.log_test("Existing endpoints still work", False, 
                            f"Login failed: {login_response.status_code} - {login_response.text}")
                return False
            
            login_data = login_response.json()
            new_token = login_data.get("token")
            
            # 3. GET /auth/me
            headers = {"Authorization": f"Bearer {new_token}"}
            me_response = self.session.get(f"{BASE_URL}/auth/me", headers=headers)
            if me_response.status_code != 200:
                self.log_test("Existing endpoints still work", False, 
                            f"/auth/me failed: {me_response.status_code} - {me_response.text}")
                return False
            
            me_data = me_response.json()
            if "user_id" not in me_data or "email" not in me_data:
                self.log_test("Existing endpoints still work", False, 
                            f"Invalid /auth/me response structure: {me_data}")
                return False
            
            self.log_test("Existing endpoints still work", True, 
                        "Register, Login, and /auth/me all working correctly")
            return True
            
        except Exception as e:
            self.log_test("Existing endpoints still work", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all new endpoint tests"""
        print("=" * 60)
        print("StudyMatch Backend New Endpoints Testing")
        print("=" * 60)
        print(f"Testing against: {BASE_URL}")
        print()
        
        # Test delete account endpoint
        print("🗑️ DELETE ACCOUNT TESTS")
        print("-" * 30)
        self.test_delete_account_with_auth()
        self.test_delete_account_without_auth()
        
        print()
        print("📸 UPLOAD PHOTO TESTS")
        print("-" * 30)
        self.test_upload_photo_with_auth()
        self.test_upload_photo_without_data()
        self.test_upload_photo_without_auth()
        
        print()
        print("✅ EXISTING ENDPOINTS VERIFICATION")
        print("-" * 30)
        self.test_existing_endpoints_still_work()
        
        # Summary
        print()
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print()
        print("DETAILED RESULTS:")
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = NewEndpointsTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)