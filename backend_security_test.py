#!/usr/bin/env python3
"""
StudyMatch Backend API Testing - Security Upgrade Features
Testing new OTP verification, domain validation, and admin bypass endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://study-sync-44.preview.emergentagent.com/api"

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@studynk.co.uk"
ADMIN_PASSWORD = "123456"
EXISTING_USER_EMAIL = "test@studymatch.com"
EXISTING_USER_PASSWORD = "test123456"

class SecurityTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def add_result(self, test_name, success, details=""):
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_admin_bypass_login(self):
        """Test 1: Admin Bypass Login"""
        self.log("🔐 Testing Admin Bypass Login...")
        
        response = self.session.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            token = data.get("token")
            
            # Check required fields
            is_verified = user.get("is_verified")
            onboarding_completed = user.get("onboarding_completed")
            
            if is_verified and onboarding_completed and token:
                self.log(f"✅ Admin bypass login successful - User: {user.get('name')}")
                self.log(f"   is_verified: {is_verified}, onboarding_completed: {onboarding_completed}")
                self.add_result("Admin Bypass Login", True, f"User verified and onboarded, token received")
                return True
            else:
                self.log(f"❌ Admin bypass login missing required fields: is_verified={is_verified}, onboarding_completed={onboarding_completed}")
                self.add_result("Admin Bypass Login", False, f"Missing required fields")
                return False
        else:
            self.log(f"❌ Admin bypass login failed: {response.status_code} - {response.text}")
            self.add_result("Admin Bypass Login", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_domain_validation_blocked(self):
        """Test 2: Domain Validation - Blocked Personal Domains"""
        self.log("\n🚫 Testing Domain Validation - Blocked Personal Domains...")
        
        blocked_emails = [
            "fake@outlook.ac.uk",
            "test@gmail.ac.uk", 
            "user@yahoo.ac.uk",
            "student@hotmail.ac.uk"
        ]
        
        all_blocked = True
        for email in blocked_emails:
            self.log(f"Testing blocked email: {email}")
            response = self.session.post(f"{BASE_URL}/auth/register", json={
                "email": email,
                "name": "Test User",
                "password": "test123456",
                "gdpr_consent": True
            })
            
            if response.status_code == 400 and "personal email" in response.text.lower():
                self.log(f"✅ {email} correctly blocked")
            else:
                self.log(f"❌ {email} should be blocked but got: {response.status_code}")
                all_blocked = False
        
        if all_blocked:
            self.add_result("Domain Validation - Blocked Domains", True, "All personal domains correctly blocked")
        else:
            self.add_result("Domain Validation - Blocked Domains", False, "Some personal domains not blocked")
        
        return all_blocked
    
    def test_domain_validation_valid(self):
        """Test 3: Domain Validation - Valid University Email"""
        self.log("\n✅ Testing Domain Validation - Valid University Email...")
        
        # Use a unique email to avoid conflicts
        test_email = f"newtest{datetime.now().strftime('%H%M%S')}@imperial.ac.uk"
        
        response = self.session.post(f"{BASE_URL}/auth/register", json={
            "email": test_email,
            "name": "Test Imperial",
            "password": "test123456",
            "gdpr_consent": True
        })
        
        if response.status_code == 200:
            data = response.json()
            otp_sent = data.get("otp_sent")
            token = data.get("token")
            user = data.get("user", {})
            
            if token:
                self.log(f"✅ Valid university email registration successful")
                self.log(f"   OTP sent: {otp_sent}, Token received: {bool(token)}")
                if not otp_sent:
                    self.log("   ⚠️ OTP email failed (SMTP configuration issue) but registration succeeded")
                self.auth_token = token  # Save for next tests
                self.user_data = user
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.add_result("Domain Validation - Valid Email", True, f"Registration successful, token received")
                return True
            else:
                self.log(f"❌ Valid email registration missing token: otp_sent={otp_sent}, token={bool(token)}")
                self.add_result("Domain Validation - Valid Email", False, "Missing token in response")
                return False
        else:
            self.log(f"❌ Valid university email registration failed: {response.status_code} - {response.text}")
            self.add_result("Domain Validation - Valid Email", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_verify_code_wrong(self):
        """Test 4: Verify Code Endpoint - Wrong Code"""
        self.log("\n🔢 Testing Verify Code Endpoint - Wrong Code...")
        
        if not self.auth_token:
            self.log("❌ No auth token available for verify code test")
            self.add_result("Verify Code - Wrong Code", False, "No auth token available")
            return False
        
        response = self.session.post(f"{BASE_URL}/auth/verify-code", json={
            "code": "000000"
        })
        
        if response.status_code == 400:
            error_text = response.text.lower()
            if "invalid code" in error_text and "attempt" in error_text:
                self.log("✅ Wrong code correctly rejected with attempt count")
                self.add_result("Verify Code - Wrong Code", True, "Wrong code rejected with attempt tracking")
                return True
            else:
                self.log(f"❌ Wrong code rejected but missing attempt info: {response.text}")
                self.add_result("Verify Code - Wrong Code", False, "Missing attempt tracking in error")
                return False
        else:
            self.log(f"❌ Wrong code should return 400, got: {response.status_code} - {response.text}")
            self.add_result("Verify Code - Wrong Code", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_resend_otp(self):
        """Test 5: Resend OTP Endpoint"""
        self.log("\n📧 Testing Resend OTP Endpoint...")
        
        if not self.auth_token:
            self.log("❌ No auth token available for resend OTP test")
            self.add_result("Resend OTP", False, "No auth token available")
            return False
        
        response = self.session.post(f"{BASE_URL}/auth/resend-otp")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("otp_sent"):
                self.log("✅ Resend OTP successful")
                self.add_result("Resend OTP", True, "OTP resent successfully")
                return True
            else:
                self.log(f"❌ Resend OTP response missing otp_sent field: {data}")
                self.add_result("Resend OTP", False, "Missing otp_sent field")
                return False
        elif response.status_code == 429:
            # Rate limit is expected behavior
            self.log("✅ Resend OTP rate limited (expected within 60 seconds)")
            self.add_result("Resend OTP", True, "Rate limit working correctly")
            return True
        else:
            self.log(f"❌ Resend OTP failed: {response.status_code} - {response.text}")
            self.add_result("Resend OTP", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_existing_login(self):
        """Test 6: Existing Login Still Works"""
        self.log("\n🔄 Testing Existing Login Still Works...")
        
        # Clear current auth
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]
        
        response = self.session.post(f"{BASE_URL}/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            token = data.get("token")
            
            if user and token:
                self.log(f"✅ Existing login successful - User: {user.get('name')}")
                self.add_result("Existing Login", True, f"Login successful for {user.get('email')}")
                return True
            else:
                self.log(f"❌ Existing login missing user or token: user={bool(user)}, token={bool(token)}")
                self.add_result("Existing Login", False, "Missing user or token in response")
                return False
        else:
            self.log(f"❌ Existing login failed: {response.status_code} - {response.text}")
            self.add_result("Existing Login", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_unauthenticated_verify_code(self):
        """Test 7: Verify Code Without Auth"""
        self.log("\n🚫 Testing Verify Code Without Authentication...")
        
        # Clear auth headers
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]
        
        response = self.session.post(f"{BASE_URL}/auth/verify-code", json={
            "code": "123456"
        })
        
        if response.status_code == 401:
            self.log("✅ Verify code correctly requires authentication")
            self.add_result("Verify Code - No Auth", True, "Correctly requires authentication")
            return True
        else:
            self.log(f"❌ Verify code should require auth, got: {response.status_code}")
            self.add_result("Verify Code - No Auth", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_unauthenticated_resend_otp(self):
        """Test 8: Resend OTP Without Auth"""
        self.log("\n🚫 Testing Resend OTP Without Authentication...")
        
        response = self.session.post(f"{BASE_URL}/auth/resend-otp")
        
        if response.status_code == 401:
            self.log("✅ Resend OTP correctly requires authentication")
            self.add_result("Resend OTP - No Auth", True, "Correctly requires authentication")
            return True
        else:
            self.log(f"❌ Resend OTP should require auth, got: {response.status_code}")
            self.add_result("Resend OTP - No Auth", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*60)
        self.log("🏁 SECURITY UPGRADE TESTING SUMMARY")
        self.log("="*60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            self.log(f"{status}: {result['test']}")
            if result["details"]:
                self.log(f"     {result['details']}")
        
        self.log(f"\nResults: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            self.log("🎉 All security upgrade tests passed!")
            return True
        else:
            self.log("⚠️  Some tests failed - review implementation")
            return False
    
    def run_all_tests(self):
        """Run all Security Upgrade tests"""
        self.log("🚀 Starting StudyMatch Security Upgrade API Tests")
        self.log(f"Backend URL: {BASE_URL}")
        
        # Run all tests
        self.test_admin_bypass_login()
        self.test_domain_validation_blocked()
        self.test_domain_validation_valid()
        self.test_verify_code_wrong()
        self.test_resend_otp()
        self.test_existing_login()
        self.test_unauthenticated_verify_code()
        self.test_unauthenticated_resend_otp()
        
        return self.print_summary()

if __name__ == "__main__":
    tester = SecurityTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)