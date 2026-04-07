#!/usr/bin/env python3
"""
StudyMatch Backend API Testing - Study Locations Endpoints
Testing the new Study Locations endpoints for StudyMatch
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://study-sync-44.preview.emergentagent.com/api"
TEST_EMAIL = "test@studymatch.com"
TEST_PASSWORD = "test123456"
TEST_NAME = "Test Student"

class StudyLocationsAPITester:
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
        
    def register_and_login(self):
        """Register a new user and login to get auth token"""
        print("\n=== AUTHENTICATION SETUP ===")
        
        # Try to register (might fail if user exists, that's ok)
        register_data = {
            "name": TEST_NAME,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "gdpr_consent": True
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=register_data)
            if response.status_code == 201:
                print("✅ User registered successfully")
            elif response.status_code == 409:
                print("ℹ️  User already exists, proceeding to login")
            else:
                print(f"⚠️  Registration response: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Registration error: {e}")
        
        # Login to get token
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token") or data.get("session_token")
                self.user_data = data.get("user")
                print(f"✅ Login successful, token: {self.auth_token[:20]}...")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def test_locations_search_no_params(self):
        """Test GET /api/locations/search with no parameters (should return all 8 locations)"""
        try:
            response = self.session.get(f"{BACKEND_URL}/locations/search")
            
            if response.status_code == 200:
                data = response.json()
                locations = data.get("locations", [])
                
                if len(locations) == 8:
                    # Check if each location has required fields
                    required_fields = ["location_id", "name", "type", "address", "description", "opening_hours", "amenities", "busyness"]
                    all_valid = True
                    
                    for loc in locations:
                        for field in required_fields:
                            if field not in loc:
                                all_valid = False
                                break
                        
                        # Check busyness structure
                        busyness = loc.get("busyness", {})
                        if not isinstance(busyness, dict) or "level" not in busyness or "percentage" not in busyness:
                            all_valid = False
                            break
                    
                    if all_valid:
                        self.log_test("GET /locations/search (no params)", True, f"Returned {len(locations)} locations with all required fields and busyness data")
                    else:
                        self.log_test("GET /locations/search (no params)", False, "Some locations missing required fields or busyness data")
                else:
                    self.log_test("GET /locations/search (no params)", False, f"Expected 8 locations, got {len(locations)}")
            else:
                self.log_test("GET /locations/search (no params)", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /locations/search (no params)", False, f"Exception: {e}")
    
    def test_locations_search_with_query(self):
        """Test GET /api/locations/search with query parameter"""
        try:
            response = self.session.get(f"{BACKEND_URL}/locations/search?q=Library")
            
            if response.status_code == 200:
                data = response.json()
                locations = data.get("locations", [])
                
                # Should return libraries (Main Library, Science Library, Law Library)
                library_count = 0
                for loc in locations:
                    if "library" in loc.get("name", "").lower() or loc.get("type") == "library":
                        library_count += 1
                
                if library_count >= 3:  # We have 3 libraries in seed data
                    self.log_test("GET /locations/search?q=Library", True, f"Found {library_count} libraries matching query")
                else:
                    self.log_test("GET /locations/search?q=Library", False, f"Expected at least 3 libraries, found {library_count}")
            else:
                self.log_test("GET /locations/search?q=Library", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /locations/search?q=Library", False, f"Exception: {e}")
    
    def test_locations_search_with_type_filter(self):
        """Test GET /api/locations/search with type filter"""
        try:
            response = self.session.get(f"{BACKEND_URL}/locations/search?type=cafe")
            
            if response.status_code == 200:
                data = response.json()
                locations = data.get("locations", [])
                
                # Should return only cafes (The Study Bean, Quiet Corner Cafe)
                all_cafes = all(loc.get("type") == "cafe" for loc in locations)
                cafe_count = len(locations)
                
                if all_cafes and cafe_count >= 2:  # We have 2 cafes in seed data
                    self.log_test("GET /locations/search?type=cafe", True, f"Found {cafe_count} cafes, all correctly filtered")
                else:
                    self.log_test("GET /locations/search?type=cafe", False, f"Type filter failed or unexpected count: {cafe_count}")
            else:
                self.log_test("GET /locations/search?type=cafe", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /locations/search?type=cafe", False, f"Exception: {e}")
    
    def test_locations_search_combined_filters(self):
        """Test GET /api/locations/search with both query and type filters"""
        try:
            response = self.session.get(f"{BACKEND_URL}/locations/search?q=Study&type=study_hub")
            
            if response.status_code == 200:
                data = response.json()
                locations = data.get("locations", [])
                
                # Should return study hubs with "Study" in name (Student Union Hub might match)
                all_study_hubs = all(loc.get("type") == "study_hub" for loc in locations)
                
                if all_study_hubs:
                    self.log_test("GET /locations/search?q=Study&type=study_hub", True, f"Found {len(locations)} study hubs matching query")
                else:
                    self.log_test("GET /locations/search?q=Study&type=study_hub", False, "Combined filter failed - not all results are study_hub type")
            else:
                self.log_test("GET /locations/search?q=Study&type=study_hub", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /locations/search?q=Study&type=study_hub", False, f"Exception: {e}")
    
    def test_get_location_valid_id(self):
        """Test GET /api/locations/{location_id} with valid ID"""
        try:
            response = self.session.get(f"{BACKEND_URL}/locations/loc_001")
            
            if response.status_code == 200:
                location = response.json()
                
                # Check required fields
                required_fields = ["location_id", "name", "type", "address", "description", "opening_hours", "amenities", "busyness"]
                has_all_fields = all(field in location for field in required_fields)
                
                # Check busyness structure
                busyness = location.get("busyness", {})
                has_busyness = isinstance(busyness, dict) and "level" in busyness and "percentage" in busyness
                
                if has_all_fields and has_busyness and location.get("location_id") == "loc_001":
                    self.log_test("GET /locations/loc_001", True, f"Retrieved location: {location.get('name')} with busyness data")
                else:
                    self.log_test("GET /locations/loc_001", False, "Missing required fields or incorrect location_id")
            else:
                self.log_test("GET /locations/loc_001", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /locations/loc_001", False, f"Exception: {e}")
    
    def test_get_location_invalid_id(self):
        """Test GET /api/locations/{location_id} with invalid ID"""
        try:
            response = self.session.get(f"{BACKEND_URL}/locations/nonexistent")
            
            if response.status_code == 404:
                self.log_test("GET /locations/nonexistent", True, "Correctly returned 404 for invalid location ID")
            else:
                self.log_test("GET /locations/nonexistent", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("GET /locations/nonexistent", False, f"Exception: {e}")
    
    def test_share_location_without_auth(self):
        """Test POST /api/locations/share without authentication"""
        try:
            share_data = {"location_id": "loc_001"}
            response = self.session.post(f"{BACKEND_URL}/locations/share", json=share_data)
            
            if response.status_code == 401:
                self.log_test("POST /locations/share (no auth)", True, "Correctly returned 401 for unauthenticated request")
            else:
                self.log_test("POST /locations/share (no auth)", False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test("POST /locations/share (no auth)", False, f"Exception: {e}")
    
    def test_share_location_missing_location_id(self):
        """Test POST /api/locations/share with missing location_id"""
        if not self.auth_token:
            self.log_test("POST /locations/share (missing location_id)", False, "No auth token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            share_data = {}  # Missing location_id
            response = self.session.post(f"{BACKEND_URL}/locations/share", json=share_data, headers=headers)
            
            if response.status_code == 400:
                self.log_test("POST /locations/share (missing location_id)", True, "Correctly returned 400 for missing location_id")
            else:
                self.log_test("POST /locations/share (missing location_id)", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("POST /locations/share (missing location_id)", False, f"Exception: {e}")
    
    def test_share_location_invalid_location_id(self):
        """Test POST /api/locations/share with invalid location_id"""
        if not self.auth_token:
            self.log_test("POST /locations/share (invalid location_id)", False, "No auth token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            share_data = {"location_id": "invalid_location"}
            response = self.session.post(f"{BACKEND_URL}/locations/share", json=share_data, headers=headers)
            
            if response.status_code == 404:
                self.log_test("POST /locations/share (invalid location_id)", True, "Correctly returned 404 for invalid location_id")
            else:
                self.log_test("POST /locations/share (invalid location_id)", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("POST /locations/share (invalid location_id)", False, f"Exception: {e}")
    
    def test_share_location_no_group(self):
        """Test POST /api/locations/share when user has no group"""
        if not self.auth_token:
            self.log_test("POST /locations/share (no group)", False, "No auth token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            share_data = {"location_id": "loc_001"}
            response = self.session.post(f"{BACKEND_URL}/locations/share", json=share_data, headers=headers)
            
            if response.status_code == 400:
                response_data = response.json()
                if "must be in a group" in response_data.get("detail", "").lower():
                    self.log_test("POST /locations/share (no group)", True, "Correctly returned 400 - user must be in a group")
                else:
                    self.log_test("POST /locations/share (no group)", False, f"Wrong error message: {response_data}")
            else:
                self.log_test("POST /locations/share (no group)", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("POST /locations/share (no group)", False, f"Exception: {e}")
    
    def run_all_tests(self):
        """Run all Study Locations endpoint tests"""
        print("🧪 StudyMatch Study Locations API Testing")
        print("=" * 50)
        
        # Setup authentication
        if not self.register_and_login():
            print("❌ Authentication setup failed, cannot proceed with auth-required tests")
            return False
        
        print("\n=== STUDY LOCATIONS ENDPOINTS TESTING ===")
        
        # Test search endpoints
        self.test_locations_search_no_params()
        self.test_locations_search_with_query()
        self.test_locations_search_with_type_filter()
        self.test_locations_search_combined_filters()
        
        # Test individual location endpoint
        self.test_get_location_valid_id()
        self.test_get_location_invalid_id()
        
        # Test share location endpoint
        self.test_share_location_without_auth()
        self.test_share_location_missing_location_id()
        self.test_share_location_invalid_location_id()
        self.test_share_location_no_group()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = StudyLocationsAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)