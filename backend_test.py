#!/usr/bin/env python3
"""
StudyMatch Backend Authentication Testing
Tests the new email/password authentication system
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://study-sync-44.preview.emergentagent.com/api"
TEST_EMAIL = "test@studymatch.com"
TEST_PASSWORD = "test123456"
TEST_NAME = "Test Student"

class AuthTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        self.user_data = None
        
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
    
    def test_register_valid_data(self):
        """Test registration with valid data"""
        try:
            # First, clean up any existing test user
            self.cleanup_test_user()
            
            payload = {
                "name": TEST_NAME,
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "gdpr_consent": True
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=payload)
            
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                if "user" in data and "token" in data:
                    self.auth_token = data["token"]
                    self.user_data = data["user"]
                    self.log_test("Register with valid data", True, 
                                f"User created with ID: {data['user']['user_id']}")
                    return True
                else:
                    self.log_test("Register with valid data", False, 
                                f"Missing user or token in response: {data}")
                    return False
            else:
                self.log_test("Register with valid data", False, 
                            f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Register with valid data", False, f"Exception: {str(e)}")
            return False
    
    def test_register_duplicate_email(self):
        """Test registration with duplicate email"""
        try:
            payload = {
                "name": "Another User",
                "email": TEST_EMAIL,  # Same email as before
                "password": "different123",
                "gdpr_consent": True
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=payload)
            
            if response.status_code == 409:
                self.log_test("Register duplicate email returns 409", True, 
                            "Correctly rejected duplicate email")
                return True
            else:
                self.log_test("Register duplicate email returns 409", False, 
                            f"Expected 409, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Register duplicate email returns 409", False, f"Exception: {str(e)}")
            return False
    
    def test_register_short_password(self):
        """Test registration with password < 6 characters"""
        try:
            payload = {
                "name": "Test User",
                "email": "short@test.com",
                "password": "123",  # Too short
                "gdpr_consent": True
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=payload)
            
            if response.status_code == 400:
                self.log_test("Register short password returns 400", True, 
                            "Correctly rejected short password")
                return True
            else:
                self.log_test("Register short password returns 400", False, 
                            f"Expected 400, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Register short password returns 400", False, f"Exception: {str(e)}")
            return False
    
    def test_register_missing_fields(self):
        """Test registration with missing required fields"""
        try:
            payload = {
                "email": "missing@test.com",
                # Missing name and password
                "gdpr_consent": True
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=payload)
            
            if response.status_code == 400:
                self.log_test("Register missing fields returns 400", True, 
                            "Correctly rejected missing fields")
                return True
            else:
                self.log_test("Register missing fields returns 400", False, 
                            f"Expected 400, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Register missing fields returns 400", False, f"Exception: {str(e)}")
            return False
    
    def test_register_invalid_email(self):
        """Test registration with invalid email format"""
        try:
            payload = {
                "name": "Test User",
                "email": "invalid-email",  # Invalid format
                "password": "test123456",
                "gdpr_consent": True
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=payload)
            
            if response.status_code == 400:
                self.log_test("Register invalid email returns 400", True, 
                            "Correctly rejected invalid email")
                return True
            else:
                self.log_test("Register invalid email returns 400", False, 
                            f"Expected 400, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Register invalid email returns 400", False, f"Exception: {str(e)}")
            return False
    
    def test_login_valid_credentials(self):
        """Test login with correct credentials"""
        try:
            payload = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data and "token" in data:
                    # Update token for subsequent tests
                    self.auth_token = data["token"]
                    self.user_data = data["user"]
                    self.log_test("Login with valid credentials", True, 
                                f"Successfully logged in user: {data['user']['email']}")
                    return True
                else:
                    self.log_test("Login with valid credentials", False, 
                                f"Missing user or token in response: {data}")
                    return False
            else:
                self.log_test("Login with valid credentials", False, 
                            f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Login with valid credentials", False, f"Exception: {str(e)}")
            return False
    
    def test_login_wrong_password(self):
        """Test login with wrong password"""
        try:
            payload = {
                "email": TEST_EMAIL,
                "password": "wrongpassword"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=payload)
            
            if response.status_code == 401:
                self.log_test("Login wrong password returns 401", True, 
                            "Correctly rejected wrong password")
                return True
            else:
                self.log_test("Login wrong password returns 401", False, 
                            f"Expected 401, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Login wrong password returns 401", False, f"Exception: {str(e)}")
            return False
    
    def test_login_nonexistent_email(self):
        """Test login with non-existent email"""
        try:
            payload = {
                "email": "nonexistent@test.com",
                "password": TEST_PASSWORD
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=payload)
            
            if response.status_code == 401:
                self.log_test("Login nonexistent email returns 401", True, 
                            "Correctly rejected nonexistent email")
                return True
            else:
                self.log_test("Login nonexistent email returns 401", False, 
                            f"Expected 401, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Login nonexistent email returns 401", False, f"Exception: {str(e)}")
            return False
    
    def test_bearer_token_auth_me(self):
        """Test Bearer token authentication with /auth/me"""
        try:
            if not self.auth_token:
                self.log_test("Bearer token auth /auth/me", False, "No auth token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{BASE_URL}/auth/me", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and "email" in data:
                    self.log_test("Bearer token auth /auth/me", True, 
                                f"Successfully retrieved user data for: {data['email']}")
                    return True
                else:
                    self.log_test("Bearer token auth /auth/me", False, 
                                f"Invalid user data structure: {data}")
                    return False
            else:
                self.log_test("Bearer token auth /auth/me", False, 
                            f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Bearer token auth /auth/me", False, f"Exception: {str(e)}")
            return False
    
    def test_bearer_token_without_token(self):
        """Test /auth/me without token returns 401"""
        try:
            response = self.session.get(f"{BASE_URL}/auth/me")
            
            if response.status_code == 401:
                self.log_test("Auth/me without token returns 401", True, 
                            "Correctly rejected request without token")
                return True
            else:
                self.log_test("Auth/me without token returns 401", False, 
                            f"Expected 401, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Auth/me without token returns 401", False, f"Exception: {str(e)}")
            return False
    
    def test_bearer_token_protected_endpoint(self):
        """Test Bearer token with another protected endpoint"""
        try:
            if not self.auth_token:
                self.log_test("Bearer token protected endpoint", False, "No auth token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{BASE_URL}/users/profile", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Bearer token protected endpoint", True, 
                            f"Successfully accessed /users/profile")
                return True
            else:
                self.log_test("Bearer token protected endpoint", False, 
                            f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Bearer token protected endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_full_auth_flow(self):
        """Test complete authentication flow"""
        try:
            # Clean up first
            self.cleanup_test_user()
            
            # 1. Register
            register_payload = {
                "name": "Flow Test User",
                "email": f"flowtest_{uuid.uuid4().hex[:8]}@studymatch.com",
                "password": "flowtest123",
                "gdpr_consent": True
            }
            
            register_response = self.session.post(f"{BASE_URL}/auth/register", json=register_payload)
            if register_response.status_code not in [200, 201]:
                self.log_test("Full auth flow", False, f"Register failed: {register_response.text}")
                return False
            
            register_data = register_response.json()
            flow_token = register_data["token"]
            
            # 2. Use token for /auth/me
            headers = {"Authorization": f"Bearer {flow_token}"}
            me_response = self.session.get(f"{BASE_URL}/auth/me", headers=headers)
            if me_response.status_code != 200:
                self.log_test("Full auth flow", False, f"/auth/me failed: {me_response.text}")
                return False
            
            # 3. Login with same credentials
            login_payload = {
                "email": register_payload["email"],
                "password": register_payload["password"]
            }
            
            login_response = self.session.post(f"{BASE_URL}/auth/login", json=login_payload)
            if login_response.status_code != 200:
                self.log_test("Full auth flow", False, f"Login failed: {login_response.text}")
                return False
            
            login_data = login_response.json()
            new_token = login_data["token"]
            
            # 4. Use new token for protected endpoint
            headers = {"Authorization": f"Bearer {new_token}"}
            profile_response = self.session.get(f"{BASE_URL}/users/profile", headers=headers)
            if profile_response.status_code != 200:
                self.log_test("Full auth flow", False, f"Profile access failed: {profile_response.text}")
                return False
            
            self.log_test("Full auth flow", True, 
                        "Complete flow: Register → Get token → /auth/me → Login → New token → Protected endpoint")
            return True
            
        except Exception as e:
            self.log_test("Full auth flow", False, f"Exception: {str(e)}")
            return False
    
    def cleanup_test_user(self):
        """Clean up test user if exists"""
        try:
            # Try to login and delete session if user exists
            payload = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
            response = self.session.post(f"{BASE_URL}/auth/login", json=payload)
            if response.status_code == 200:
                data = response.json()
                token = data["token"]
                headers = {"Authorization": f"Bearer {token}"}
                # Logout to clean session
                self.session.post(f"{BASE_URL}/auth/logout", headers=headers)
        except:
            pass  # Ignore cleanup errors
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("=" * 60)
        print("StudyMatch Backend Authentication Testing")
        print("=" * 60)
        print(f"Testing against: {BASE_URL}")
        print()
        
        # Test registration
        print("🔐 REGISTRATION TESTS")
        print("-" * 30)
        self.test_register_valid_data()
        self.test_register_duplicate_email()
        self.test_register_short_password()
        self.test_register_missing_fields()
        self.test_register_invalid_email()
        
        print()
        print("🔑 LOGIN TESTS")
        print("-" * 30)
        self.test_login_valid_credentials()
        self.test_login_wrong_password()
        self.test_login_nonexistent_email()
        
        print()
        print("🎫 BEARER TOKEN TESTS")
        print("-" * 30)
        self.test_bearer_token_auth_me()
        self.test_bearer_token_without_token()
        self.test_bearer_token_protected_endpoint()
        
        print()
        print("🔄 FULL FLOW TEST")
        print("-" * 30)
        self.test_full_auth_flow()
        
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
    tester = AuthTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)