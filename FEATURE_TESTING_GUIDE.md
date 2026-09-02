# Staging Feature Testing Guide

## Overview

Comprehensive testing procedures for the Wedding Planning Platform staging environment.

**Testing Time**: ~30-45 minutes  
**Prerequisites**: Staging environment running

---

## Test Categories

### 1. Authentication & User Management

#### Test 1.1: User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

**Expected**: 200 OK, user created

#### Test 1.2: User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

**Expected**: 200 OK, JWT token returned

#### Test 1.3: Authentication Flow
1. Open http://localhost:3001/
2. Click "Sign Up"
3. Create account with test credentials
4. Verify redirected to dashboard
5. Verify user profile shows correct info

---

### 2. Property Search & Discovery

#### Test 2.1: Search Properties
```bash
curl http://localhost:3000/api/properties
```

**Expected**: 200 OK, list of properties

#### Test 2.2: Filter by Price
```bash
curl "http://localhost:3000/api/properties?minPrice=100000&maxPrice=500000"
```

**Expected**: Properties within price range

#### Test 2.3: Search in UI
1. Login to http://localhost:3001/
2. Go to Properties page
3. Enter search criteria
4. Filter by:
   - Price range
   - Bedrooms/bathrooms
   - Location
5. Verify results update

#### Test 2.4: Property Details
1. Click on a property
2. Verify details display:
   - Address, price, features
   - AI valuation score
   - Investment analysis
   - Market trends

---

### 3. Portfolio Management

#### Test 3.1: Add Property to Portfolio
```bash
curl -X POST http://localhost:3000/api/portfolio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "propertyId": "prop-123",
    "purchasePrice": 250000,
    "downPayment": 50000,
    "notes": "First investment property"
  }'
```

**Expected**: 201 Created

#### Test 3.2: View Portfolio
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/portfolio
```

**Expected**: User's properties with metrics

#### Test 3.3: Portfolio UI
1. Login to http://localhost:3001/
2. Go to Portfolio page
3. Add property:
   - Select property
   - Enter acquisition details
   - Save
4. Verify property appears in list
5. Click property to view details
6. Verify metrics calculate correctly

#### Test 3.4: Update Portfolio Item
1. Click on portfolio property
2. Edit details (price, notes, etc.)
3. Save changes
4. Verify updates persist

---

### 4. Transaction Tracking

#### Test 4.1: Record Transaction
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type": "income",
    "category": "rent",
    "amount": 1500,
    "description": "Monthly rent from Unit A",
    "date": "2024-01-01"
  }'
```

**Expected**: 201 Created

#### Test 4.2: View Transactions
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/transactions
```

**Expected**: User's transactions list

#### Test 4.3: Transactions UI
1. Go to Transactions page
2. Click "Add Transaction"
3. Enter:
   - Type (Income/Expense/Mortgage)
   - Category
   - Amount
   - Description
4. Save
5. Verify appears in list
6. View transaction details
7. Edit transaction
8. Delete transaction (verify confirmation)

#### Test 4.4: Transaction Filtering
1. Filter by type (income/expense)
2. Filter by category
3. Filter by date range
4. Verify calculations update

---

### 5. AI Analysis & Scoring

#### Test 5.1: Property Valuation
1. View property details
2. Verify valuation section shows:
   - Estimated value
   - Confidence interval
   - Valuation breakdown
   - Trend analysis

#### Test 5.2: Investment Score
1. View investment analysis
2. Verify shows:
   - Score (0-100)
   - Recommendation
   - Key factors
   - Risk assessment

#### Test 5.3: Market Trends
1. Go to Market Analytics
2. View trends for different markets
3. Verify shows:
   - 6-month trend
   - 12-month trend
   - Market temperature
   - Inventory levels

---

### 6. API Performance

#### Test 6.1: Response Time
```bash
time curl http://localhost:3000/api/properties
```

**Expected**: < 500ms

#### Test 6.2: Concurrent Requests
```bash
# Test 10 concurrent requests
for i in {1..10}; do
  curl http://localhost:3000/api/properties &
done
wait
```

**Expected**: All succeed, no timeouts

#### Test 6.3: Large Data Sets
1. Load properties page with filter
2. Verify pagination works
3. Load 100+ transactions
4. Verify no slowdown

---

### 7. Data Persistence

#### Test 7.1: Database Persistence
1. Add property to portfolio
2. Restart backend: `podman-compose restart backend`
3. Re-login
4. Verify property still there

#### Test 7.2: Session Persistence
1. Login
2. Close browser
3. Reopen http://localhost:3001/
4. Verify still logged in (or session restored)

---

### 8. Error Handling

#### Test 8.1: Invalid Input
```bash
curl -X POST http://localhost:3000/api/portfolio \
  -H "Content-Type: application/json" \
  -d '{
    "purchasePrice": "invalid"
  }'
```

**Expected**: 400 Bad Request, error message

#### Test 8.2: Unauthorized Access
```bash
curl http://localhost:3000/api/portfolio
```

**Expected**: 401 Unauthorized

#### Test 8.3: Not Found
```bash
curl http://localhost:3000/api/properties/invalid-id
```

**Expected**: 404 Not Found

---

### 9. UI/UX

#### Test 9.1: Navigation
1. Test all navigation links work
2. Verify page loads
3. No dead links

#### Test 9.2: Responsiveness
1. Open http://localhost:3001/ in browser
2. Test on desktop (full width)
3. Test mobile view (DevTools → toggle device toolbar)
4. Verify responsive design

#### Test 9.3: Error Messages
1. Try invalid login
2. Verify clear error message shown
3. Try invalid form submission
4. Verify validation messages

---

### 10. Browser Console

#### Test 10.1: No Errors
1. Open DevTools (F12)
2. Go to Console tab
3. Perform all actions
4. Verify no red errors

#### Test 10.2: No Warnings
1. Check for warnings (yellow messages)
2. Address any security warnings
3. Check Network tab for failed requests

---

## Testing Checklist

- [ ] Authentication works (register, login, logout)
- [ ] Properties can be searched
- [ ] Filters work correctly
- [ ] Portfolio operations work (add, view, update, delete)
- [ ] Transactions tracked correctly
- [ ] AI analysis displays
- [ ] Calculations are correct
- [ ] Data persists after restart
- [ ] API response times < 500ms
- [ ] No console errors
- [ ] UI responsive on mobile
- [ ] All links work
- [ ] Error messages clear

---

## Bug Report Template

If you find issues:

```
**Title**: [Feature] - [Issue]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**:
What should happen

**Actual Result**:
What actually happened

**Screenshots**:
[If applicable]

**Environment**:
- URL: http://localhost:3001/
- Browser: Chrome, Firefox, Safari
- Time: [When it happened]
```

---

## Performance Benchmarks

Record baseline performance:

```
Backend Health Check:   ___ ms
Property List Load:     ___ ms
Portfolio Load:         ___ ms
Transaction Add:        ___ ms
UI Page Load:           ___ seconds
Database Query (avg):   ___ ms
```

---

## Test Results Summary

| Test Category | Status | Issues | Notes |
|---|---|---|---|
| Authentication | ✅ | | |
| Properties | ✅ | | |
| Portfolio | ✅ | | |
| Transactions | ✅ | | |
| AI Analysis | ✅ | | |
| Performance | ✅ | | |
| Persistence | ✅ | | |
| Error Handling | ✅ | | |
| UI/UX | ✅ | | |
| Console | ✅ | | |

---

**Testing Complete!** When satisfied, proceed to load testing.
