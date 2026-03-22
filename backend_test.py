#!/usr/bin/env python3
"""
Backend API Testing for The Mughal's Dastarkhwan Restaurant Website
Tests all backend endpoints for functionality, data structure, and MongoDB persistence
"""

import requests
import json
import sys
from datetime import datetime
import time

# Use the external URL from frontend/.env
BASE_URL = "https://lucknow-dastarkhwan.preview.emergentagent.com/api"

class RestaurantAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        
        self.test_results.append(result)
        
        if success:
            print(f"✅ {test_name}: PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {test_name}: FAILED")
            print(f"   Error: {details}")
            self.failed_tests.append(result)
    
    def test_restaurant_info(self):
        """Test GET /api/restaurant endpoint"""
        try:
            response = requests.get(f"{self.base_url}/restaurant", timeout=10)
            
            if response.status_code != 200:
                self.log_test("GET /api/restaurant - Status Code", False, 
                            f"Expected 200, got {response.status_code}")
                return
            
            data = response.json()
            
            # Check required fields
            required_fields = ['name', 'tagline', 'description', 'cuisine', 'price_range', 
                             'rating', 'total_reviews', 'established', 'contact']
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                self.log_test("GET /api/restaurant - Data Structure", False,
                            f"Missing fields: {missing_fields}")
                return
            
            # Validate data types and values
            if not isinstance(data['cuisine'], list) or len(data['cuisine']) == 0:
                self.log_test("GET /api/restaurant - Cuisine Array", False,
                            "Cuisine should be a non-empty array")
                return
            
            if not isinstance(data['rating'], (int, float)) or data['rating'] <= 0:
                self.log_test("GET /api/restaurant - Rating", False,
                            "Rating should be a positive number")
                return
            
            if not isinstance(data['total_reviews'], int) or data['total_reviews'] <= 0:
                self.log_test("GET /api/restaurant - Total Reviews", False,
                            "Total reviews should be a positive integer")
                return
            
            # Check contact info structure
            contact = data.get('contact', {})
            contact_fields = ['address', 'phone', 'email', 'hours']
            missing_contact = [field for field in contact_fields if field not in contact]
            if missing_contact:
                self.log_test("GET /api/restaurant - Contact Info", False,
                            f"Missing contact fields: {missing_contact}")
                return
            
            self.log_test("GET /api/restaurant", True, 
                        f"Restaurant: {data['name']}, Rating: {data['rating']}, Reviews: {data['total_reviews']}")
            
        except requests.exceptions.RequestException as e:
            self.log_test("GET /api/restaurant", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/restaurant", False, f"Invalid JSON response: {str(e)}")
        except Exception as e:
            self.log_test("GET /api/restaurant", False, f"Unexpected error: {str(e)}")
    
    def test_menu_categories(self):
        """Test GET /api/menu/categories endpoint"""
        try:
            response = requests.get(f"{self.base_url}/menu/categories", timeout=10)
            
            if response.status_code != 200:
                self.log_test("GET /api/menu/categories - Status Code", False,
                            f"Expected 200, got {response.status_code}")
                return
            
            data = response.json()
            
            if not isinstance(data, list):
                self.log_test("GET /api/menu/categories - Data Type", False,
                            "Response should be an array")
                return
            
            if len(data) != 6:
                self.log_test("GET /api/menu/categories - Count", False,
                            f"Expected 6 categories, got {len(data)}")
                return
            
            # Check category structure
            for i, category in enumerate(data):
                required_fields = ['id', 'name', 'description']
                missing_fields = [field for field in required_fields if field not in category]
                if missing_fields:
                    self.log_test("GET /api/menu/categories - Category Structure", False,
                                f"Category {i} missing fields: {missing_fields}")
                    return
            
            category_names = [cat['name'] for cat in data]
            self.log_test("GET /api/menu/categories", True,
                        f"Found 6 categories: {', '.join(category_names)}")
            
        except requests.exceptions.RequestException as e:
            self.log_test("GET /api/menu/categories", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/menu/categories", False, f"Invalid JSON response: {str(e)}")
        except Exception as e:
            self.log_test("GET /api/menu/categories", False, f"Unexpected error: {str(e)}")
    
    def test_menu_items(self):
        """Test GET /api/menu endpoint"""
        try:
            response = requests.get(f"{self.base_url}/menu", timeout=10)
            
            if response.status_code != 200:
                self.log_test("GET /api/menu - Status Code", False,
                            f"Expected 200, got {response.status_code}")
                return
            
            data = response.json()
            
            if not isinstance(data, list):
                self.log_test("GET /api/menu - Data Type", False,
                            "Response should be an array")
                return
            
            if len(data) != 28:
                self.log_test("GET /api/menu - Count", False,
                            f"Expected 28 menu items, got {len(data)}")
                return
            
            # Check menu item structure
            required_fields = ['id', 'category_id', 'name', 'price', 'description', 'is_veg', 'is_popular']
            for i, item in enumerate(data):
                missing_fields = [field for field in required_fields if field not in item]
                if missing_fields:
                    self.log_test("GET /api/menu - Item Structure", False,
                                f"Menu item {i} missing fields: {missing_fields}")
                    return
                
                # Validate data types
                if not isinstance(item['id'], int):
                    self.log_test("GET /api/menu - Item ID Type", False,
                                f"Item {i} ID should be integer, got {type(item['id'])}")
                    return
                
                if not isinstance(item['price'], int) or item['price'] <= 0:
                    self.log_test("GET /api/menu - Item Price", False,
                                f"Item {i} price should be positive integer")
                    return
                
                if not isinstance(item['is_veg'], bool):
                    self.log_test("GET /api/menu - Item is_veg", False,
                                f"Item {i} is_veg should be boolean")
                    return
                
                if not isinstance(item['is_popular'], bool):
                    self.log_test("GET /api/menu - Item is_popular", False,
                                f"Item {i} is_popular should be boolean")
                    return
            
            veg_count = sum(1 for item in data if item['is_veg'])
            popular_count = sum(1 for item in data if item['is_popular'])
            
            self.log_test("GET /api/menu", True,
                        f"Found 28 items: {veg_count} vegetarian, {popular_count} popular items")
            
        except requests.exceptions.RequestException as e:
            self.log_test("GET /api/menu", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/menu", False, f"Invalid JSON response: {str(e)}")
        except Exception as e:
            self.log_test("GET /api/menu", False, f"Unexpected error: {str(e)}")
    
    def test_menu_filter_by_category(self):
        """Test GET /api/menu?category_id=kebabs endpoint"""
        try:
            response = requests.get(f"{self.base_url}/menu?category_id=kebabs", timeout=10)
            
            if response.status_code != 200:
                self.log_test("GET /api/menu?category_id=kebabs - Status Code", False,
                            f"Expected 200, got {response.status_code}")
                return
            
            data = response.json()
            
            if not isinstance(data, list):
                self.log_test("GET /api/menu?category_id=kebabs - Data Type", False,
                            "Response should be an array")
                return
            
            # All items should have category_id = "kebabs"
            non_kebab_items = [item for item in data if item.get('category_id') != 'kebabs']
            if non_kebab_items:
                self.log_test("GET /api/menu?category_id=kebabs - Filter", False,
                            f"Found {len(non_kebab_items)} items not in kebabs category")
                return
            
            if len(data) == 0:
                self.log_test("GET /api/menu?category_id=kebabs - Empty Result", False,
                            "No kebab items found")
                return
            
            kebab_names = [item['name'] for item in data]
            self.log_test("GET /api/menu?category_id=kebabs", True,
                        f"Found {len(data)} kebab items: {', '.join(kebab_names[:3])}...")
            
        except requests.exceptions.RequestException as e:
            self.log_test("GET /api/menu?category_id=kebabs", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/menu?category_id=kebabs", False, f"Invalid JSON response: {str(e)}")
        except Exception as e:
            self.log_test("GET /api/menu?category_id=kebabs", False, f"Unexpected error: {str(e)}")
    
    def test_menu_item_by_id(self):
        """Test GET /api/menu/1 endpoint"""
        try:
            response = requests.get(f"{self.base_url}/menu/1", timeout=10)
            
            if response.status_code != 200:
                self.log_test("GET /api/menu/1 - Status Code", False,
                            f"Expected 200, got {response.status_code}")
                return
            
            data = response.json()
            
            if not isinstance(data, dict):
                self.log_test("GET /api/menu/1 - Data Type", False,
                            "Response should be an object")
                return
            
            # Check required fields
            required_fields = ['id', 'category_id', 'name', 'price', 'description', 'is_veg', 'is_popular']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                self.log_test("GET /api/menu/1 - Data Structure", False,
                            f"Missing fields: {missing_fields}")
                return
            
            if data['id'] != 1:
                self.log_test("GET /api/menu/1 - Item ID", False,
                            f"Expected ID 1, got {data['id']}")
                return
            
            self.log_test("GET /api/menu/1", True,
                        f"Item: {data['name']}, Price: ₹{data['price']}, Veg: {data['is_veg']}")
            
        except requests.exceptions.RequestException as e:
            self.log_test("GET /api/menu/1", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/menu/1", False, f"Invalid JSON response: {str(e)}")
        except Exception as e:
            self.log_test("GET /api/menu/1", False, f"Unexpected error: {str(e)}")
    
    def test_testimonials(self):
        """Test GET /api/testimonials endpoint"""
        try:
            response = requests.get(f"{self.base_url}/testimonials", timeout=10)
            
            if response.status_code != 200:
                self.log_test("GET /api/testimonials - Status Code", False,
                            f"Expected 200, got {response.status_code}")
                return
            
            data = response.json()
            
            if not isinstance(data, list):
                self.log_test("GET /api/testimonials - Data Type", False,
                            "Response should be an array")
                return
            
            if len(data) != 3:
                self.log_test("GET /api/testimonials - Count", False,
                            f"Expected 3 testimonials, got {len(data)}")
                return
            
            # Check testimonial structure
            required_fields = ['id', 'name', 'rating', 'comment', 'date']
            for i, testimonial in enumerate(data):
                missing_fields = [field for field in required_fields if field not in testimonial]
                if missing_fields:
                    self.log_test("GET /api/testimonials - Structure", False,
                                f"Testimonial {i} missing fields: {missing_fields}")
                    return
                
                # Validate rating
                if not isinstance(testimonial['rating'], int) or not (1 <= testimonial['rating'] <= 5):
                    self.log_test("GET /api/testimonials - Rating", False,
                                f"Testimonial {i} rating should be 1-5, got {testimonial['rating']}")
                    return
            
            avg_rating = sum(t['rating'] for t in data) / len(data)
            self.log_test("GET /api/testimonials", True,
                        f"Found 3 testimonials, average rating: {avg_rating:.1f}")
            
        except requests.exceptions.RequestException as e:
            self.log_test("GET /api/testimonials", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/testimonials", False, f"Invalid JSON response: {str(e)}")
        except Exception as e:
            self.log_test("GET /api/testimonials", False, f"Unexpected error: {str(e)}")
    
    def test_contact_post(self):
        """Test POST /api/contact endpoint"""
        try:
            # Test data with realistic information
            test_contact = {
                "name": "Arjun Patel",
                "email": "arjun.patel@email.com",
                "phone": "+91 98765 43210",
                "message": "I would like to make a reservation for 6 people this Saturday evening. Do you have availability around 7 PM? Also, could you please let me know if you have any special vegetarian thali options?"
            }
            
            response = requests.post(f"{self.base_url}/contact", 
                                   json=test_contact, 
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)
            
            if response.status_code != 200:
                self.log_test("POST /api/contact - Status Code", False,
                            f"Expected 200, got {response.status_code}. Response: {response.text}")
                return
            
            data = response.json()
            
            # Check response structure
            required_fields = ['id', 'success', 'message']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                self.log_test("POST /api/contact - Response Structure", False,
                            f"Missing fields: {missing_fields}")
                return
            
            if not data.get('success'):
                self.log_test("POST /api/contact - Success Flag", False,
                            f"Success should be true, got {data.get('success')}")
                return
            
            if not data.get('id'):
                self.log_test("POST /api/contact - ID Generation", False,
                            "Response should include generated ID")
                return
            
            self.log_test("POST /api/contact", True,
                        f"Message submitted successfully, ID: {data['id']}")
            
            # Store the ID for later verification
            self.test_contact_id = data['id']
            
        except requests.exceptions.RequestException as e:
            self.log_test("POST /api/contact", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("POST /api/contact", False, f"Invalid JSON response: {str(e)}")
        except Exception as e:
            self.log_test("POST /api/contact", False, f"Unexpected error: {str(e)}")
    
    def test_contact_validation(self):
        """Test POST /api/contact validation"""
        # Test invalid email
        try:
            invalid_contact = {
                "name": "Test User",
                "email": "invalid-email",
                "message": "This should fail due to invalid email"
            }
            
            response = requests.post(f"{self.base_url}/contact", 
                                   json=invalid_contact,
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)
            
            if response.status_code == 200:
                self.log_test("POST /api/contact - Email Validation", False,
                            "Should reject invalid email format")
                return
            
            self.log_test("POST /api/contact - Email Validation", True,
                        f"Correctly rejected invalid email (status: {response.status_code})")
            
        except Exception as e:
            self.log_test("POST /api/contact - Email Validation", False, f"Error: {str(e)}")
        
        # Test short message
        try:
            short_message = {
                "name": "Test User",
                "email": "test@email.com",
                "message": "Short"  # Less than 10 characters
            }
            
            response = requests.post(f"{self.base_url}/contact", 
                                   json=short_message,
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)
            
            if response.status_code == 200:
                self.log_test("POST /api/contact - Message Length Validation", False,
                            "Should reject message shorter than 10 characters")
                return
            
            self.log_test("POST /api/contact - Message Length Validation", True,
                        f"Correctly rejected short message (status: {response.status_code})")
            
        except Exception as e:
            self.log_test("POST /api/contact - Message Length Validation", False, f"Error: {str(e)}")
    
    def test_contact_get(self):
        """Test GET /api/contact endpoint"""
        try:
            response = requests.get(f"{self.base_url}/contact", timeout=10)
            
            if response.status_code != 200:
                self.log_test("GET /api/contact - Status Code", False,
                            f"Expected 200, got {response.status_code}")
                return
            
            data = response.json()
            
            if not isinstance(data, list):
                self.log_test("GET /api/contact - Data Type", False,
                            "Response should be an array")
                return
            
            # Check if our test message is in the results
            if hasattr(self, 'test_contact_id'):
                found_message = any(msg.get('id') == self.test_contact_id for msg in data)
                if not found_message:
                    self.log_test("GET /api/contact - MongoDB Persistence", False,
                                "Test message not found in database")
                    return
                
                self.log_test("GET /api/contact - MongoDB Persistence", True,
                            "Test message successfully persisted to MongoDB")
            
            # Check message structure if any messages exist
            if data:
                required_fields = ['id', 'name', 'email', 'message', 'is_read', 'created_at']
                sample_msg = data[0]
                missing_fields = [field for field in required_fields if field not in sample_msg]
                if missing_fields:
                    self.log_test("GET /api/contact - Message Structure", False,
                                f"Missing fields: {missing_fields}")
                    return
            
            self.log_test("GET /api/contact", True,
                        f"Retrieved {len(data)} contact messages from MongoDB")
            
        except requests.exceptions.RequestException as e:
            self.log_test("GET /api/contact", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/contact", False, f"Invalid JSON response: {str(e)}")
        except Exception as e:
            self.log_test("GET /api/contact", False, f"Unexpected error: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Backend API Tests for The Mughal's Dastarkhwan")
        print(f"📍 Testing URL: {self.base_url}")
        print("=" * 80)
        
        # Test all endpoints
        self.test_restaurant_info()
        print()
        
        self.test_menu_categories()
        print()
        
        self.test_menu_items()
        print()
        
        self.test_menu_filter_by_category()
        print()
        
        self.test_menu_item_by_id()
        print()
        
        self.test_testimonials()
        print()
        
        self.test_contact_post()
        print()
        
        self.test_contact_validation()
        print()
        
        # Wait a moment for database write
        time.sleep(1)
        self.test_contact_get()
        print()
        
        # Summary
        print("=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if self.failed_tests:
            print("\n🔍 FAILED TESTS DETAILS:")
            print("-" * 40)
            for test in self.failed_tests:
                print(f"❌ {test['test']}")
                print(f"   Error: {test['details']}")
                print()
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = RestaurantAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All tests passed! Backend API is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Please check the details above.")
        sys.exit(1)