#!/bin/bash

# FitBlend API Test Script
# Usage: bash TEST_API.sh

API_URL="http://localhost:5005"
COLORS='\033[0m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

echo -e "${BLUE}========================================${COLORS}"
echo -e "${BLUE}FitBlend API Test Suite${COLORS}"
echo -e "${BLUE}========================================${COLORS}\n"

# Test 1: Health Check
echo -e "${YELLOW}[1/8] Health Check${COLORS}"
RESPONSE=$(curl -s $API_URL/api/health)
if [[ $RESPONSE == *"ok"* ]]; then
  echo -e "${GREEN}✅ Server is running${COLORS}"
  echo "Response: $RESPONSE\n"
else
  echo -e "${RED}❌ Server is not responding${COLORS}\n"
  exit 1
fi

# Test 2: Admin Login
echo -e "${YELLOW}[2/8] Admin Login (vanan/123)${COLORS}"
ADMIN_LOGIN=$(curl -s -X POST $API_URL/api/auth/employee-login \
  -H "Content-Type: application/json" \
  -d '{"username":"vanan","password":"123"}')

if [[ $ADMIN_LOGIN == *"fullName"* ]]; then
  echo -e "${GREEN}✅ Admin login successful${COLORS}"
  ADMIN_ID=$(echo $ADMIN_LOGIN | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "User ID: $ADMIN_ID"
  echo "Response: $ADMIN_LOGIN\n"
else
  echo -e "${RED}❌ Admin login failed${COLORS}"
  echo "Response: $ADMIN_LOGIN\n"
fi

# Test 3: Get Branches
echo -e "${YELLOW}[3/8] Get All Branches${COLORS}"
BRANCHES=$(curl -s $API_URL/api/branches)
if [[ $BRANCHES == *"CN"* ]]; then
  echo -e "${GREEN}✅ Branches fetched${COLORS}"
  BRANCH_COUNT=$(echo $BRANCHES | grep -o '"id":"CN' | wc -l)
  echo "Total branches: $BRANCH_COUNT"
  echo "Sample: $(echo $BRANCHES | cut -c 1-100)...\n"
else
  echo -e "${RED}❌ Failed to fetch branches${COLORS}\n"
fi

# Test 4: Get Employees
echo -e "${YELLOW}[4/8] Get All Employees${COLORS}"
EMPLOYEES=$(curl -s $API_URL/api/employees)
if [[ $EMPLOYEES == *"fullName"* ]]; then
  echo -e "${GREEN}✅ Employees fetched${COLORS}"
  EMP_COUNT=$(echo $EMPLOYEES | grep -o '"id":"' | wc -l)
  echo "Total employees: $EMP_COUNT"
  echo "Sample: $(echo $EMPLOYEES | cut -c 1-100)...\n"
else
  echo -e "${RED}❌ Failed to fetch employees${COLORS}\n"
fi

# Test 5: Get Inventory
echo -e "${YELLOW}[5/8] Get Inventory${COLORS}"
INVENTORY=$(curl -s $API_URL/api/inventory)
if [[ $INVENTORY == *"INV"* ]]; then
  echo -e "${GREEN}✅ Inventory fetched${COLORS}"
  INV_COUNT=$(echo $INVENTORY | grep -o '"id":"INV' | wc -l)
  echo "Total products: $INV_COUNT"
  echo "Sample: $(echo $INVENTORY | cut -c 1-100)...\n"
else
  echo -e "${RED}❌ Failed to fetch inventory${COLORS}\n"
fi

# Test 6: Create Branch
echo -e "${YELLOW}[6/8] Create New Branch${COLORS}"
NEW_BRANCH=$(curl -s -X POST $API_URL/api/branches \
  -H "Content-Type: application/json" \
  -d '{"name":"Branch Test","address":"123 Test St","phone":"0901234567"}')

if [[ $NEW_BRANCH == *"name"* ]]; then
  echo -e "${GREEN}✅ Branch created${COLORS}"
  NEW_BRANCH_ID=$(echo $NEW_BRANCH | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "New Branch ID: $NEW_BRANCH_ID"
  echo "Response: $NEW_BRANCH\n"
else
  echo -e "${RED}❌ Failed to create branch${COLORS}"
  echo "Response: $NEW_BRANCH\n"
fi

# Test 7: Get Orders
echo -e "${YELLOW}[7/8] Get All Orders${COLORS}"
ORDERS=$(curl -s $API_URL/api/orders)
if [[ $ORDERS == *"["* ]]; then
  echo -e "${GREEN}✅ Orders fetched${COLORS}"
  ORDER_COUNT=$(echo $ORDERS | grep -o '"id":"ORD' | wc -l)
  echo "Total orders: $ORDER_COUNT"
  if [ $ORDER_COUNT -gt 0 ]; then
    echo "Sample: $(echo $ORDERS | cut -c 1-100)..."
  else
    echo "(No orders yet)"
  fi
  echo ""
else
  echo -e "${RED}❌ Failed to fetch orders${COLORS}\n"
fi

# Test 8: Get Shifts
echo -e "${YELLOW}[8/8] Get All Shifts${COLORS}"
SHIFTS=$(curl -s $API_URL/api/shifts)
if [[ $SHIFTS == *"["* ]]; then
  echo -e "${GREEN}✅ Shifts fetched${COLORS}"
  SHIFT_COUNT=$(echo $SHIFTS | grep -o '"id":"' | wc -l)
  echo "Total shifts: $SHIFT_COUNT"
  if [ $SHIFT_COUNT -gt 0 ]; then
    echo "Sample: $(echo $SHIFTS | cut -c 1-100)..."
  else
    echo "(No shifts yet)"
  fi
  echo ""
else
  echo -e "${RED}❌ Failed to fetch shifts${COLORS}\n"
fi

echo -e "${BLUE}========================================${COLORS}"
echo -e "${GREEN}✅ API Test Complete!${COLORS}"
echo -e "${BLUE}========================================${COLORS}"
