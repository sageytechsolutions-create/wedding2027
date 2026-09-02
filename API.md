# API Documentation

Complete API reference for the AI Real Estate Investment Platform.

## Base URLs

- **Backend API**: `http://localhost:3001` (dev) or `https://api.yourdomain.com` (prod)
- **AI Service**: `http://localhost:8000` (dev) or `https://ai.yourdomain.com` (prod)
- **Frontend**: `http://localhost:5173` (dev) or `https://yourdomain.com` (prod)

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <supabase_access_token>
```

Obtain a token by signing in with Supabase Auth (handled automatically by frontend).

## Response Format

All responses follow this format:

### Success Response
```json
{
  "data": {...},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "PROPERTY_NOT_FOUND",
    "message": "Property not found",
    "statusCode": 404,
    "details": {...}
  }
}
```

## Properties API

### Search Properties
```
GET /api/properties
```

**Query Parameters:**
- `city` (string): Filter by city
- `state` (string): Filter by state
- `zipCode` (string): Filter by ZIP code
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `minBeds` (number): Minimum bedrooms
- `maxBeds` (number): Maximum bedrooms
- `propertyType` (string): Property type (single_family, condo, townhouse, etc.)
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Results per page

**Response:**
```json
{
  "data": [
    {
      "id": "prop_123",
      "address": "123 Oak Lane",
      "city": "Denver",
      "state": "CO",
      "zipCode": "80202",
      "propertyType": "single_family",
      "bedrooms": 3,
      "bathrooms": 2,
      "squareFeet": 1800,
      "listPrice": 450000,
      "estimatedValue": 475000
    }
  ],
  "pagination": {...}
}
```

### Get Property Details
```
GET /api/properties/{id}
```

**Response:**
```json
{
  "id": "prop_123",
  "address": "123 Oak Lane",
  "city": "Denver",
  "state": "CO",
  "zipCode": "80202",
  "propertyType": "single_family",
  "bedrooms": 3,
  "bathrooms": 2,
  "squareFeet": 1800,
  "lotSize": 5000,
  "yearBuilt": 2005,
  "listPrice": 450000,
  "estimatedValue": 475000,
  "propertyImageUrl": "https://...",
  "createdAt": "2024-08-31T00:00:00Z"
}
```

### Add Property to Favorites
```
POST /api/properties/{propertyId}/favorites
```

**Auth Required**: Yes

**Body:**
```json
{
  "notes": "Great property with potential"
}
```

**Response:**
```json
{
  "id": "fav_123",
  "userId": "user_123",
  "propertyId": "prop_123",
  "notes": "Great property with potential",
  "createdAt": "2024-08-31T00:00:00Z"
}
```

### Remove Property from Favorites
```
DELETE /api/properties/{propertyId}/favorites
```

**Auth Required**: Yes

**Response**: 204 No Content

### Get Favorite Properties
```
GET /api/properties/favorites
```

**Auth Required**: Yes

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "fav_123",
      "property": {...},
      "notes": "Great property",
      "createdAt": "2024-08-31T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

## Portfolio API

### Get Portfolio
```
GET /api/portfolio
```

**Auth Required**: Yes

**Response:**
```json
[
  {
    "id": "pp_123",
    "property": {...},
    "acquisitionDate": "2020-01-15T00:00:00Z",
    "acquisitionPrice": 400000,
    "downPayment": 80000,
    "loanAmount": 320000,
    "interestRate": 3.5,
    "annualPropertyTax": 4800,
    "annualInsurance": 1200,
    "annualMaintenanceEstimate": 3000,
    "notes": "Rental property with tenant"
  }
]
```

### Get Portfolio Summary
```
GET /api/portfolio/summary
```

**Auth Required**: Yes

**Response:**
```json
{
  "propertyCount": 3,
  "totalInvestedCapital": 1200000,
  "totalCurrentValue": 1350000,
  "totalAppreciation": 150000,
  "roi": 12.5,
  "totalAnnualExpenses": 18000
}
```

### Get Property Details
```
GET /api/portfolio/{portfolioPropertyId}
```

**Auth Required**: Yes

**Response:**
```json
{
  "id": "pp_123",
  "property": {...},
  "acquisitionDate": "2020-01-15T00:00:00Z",
  "acquisitionPrice": 400000,
  "transactions": [
    {
      "id": "tx_123",
      "date": "2024-08-20T00:00:00Z",
      "category": "Rent Income",
      "type": "income",
      "amount": 2500,
      "description": "August rent"
    }
  ]
}
```

### Add Property to Portfolio
```
POST /api/portfolio
```

**Auth Required**: Yes

**Body:**
```json
{
  "propertyId": "prop_123",
  "acquisitionDate": "2024-08-31T00:00:00Z",
  "acquisitionPrice": 450000,
  "downPayment": 90000,
  "loanAmount": 360000,
  "interestRate": 4.0,
  "annualPropertyTax": 5400,
  "annualInsurance": 1200,
  "annualMaintenanceEstimate": 3000,
  "notes": "Investment property"
}
```

**Response:** 201 Created
```json
{
  "id": "pp_123",
  "property": {...},
  "acquisitionDate": "2024-08-31T00:00:00Z",
  "acquisitionPrice": 450000,
  ...
}
```

### Update Portfolio Property
```
PATCH /api/portfolio/{portfolioPropertyId}
```

**Auth Required**: Yes

**Body:** (any field to update)
```json
{
  "notes": "Updated notes",
  "annualPropertyTax": 5500
}
```

**Response:**
```json
{
  "id": "pp_123",
  ...
}
```

### Remove Property from Portfolio
```
DELETE /api/portfolio/{portfolioPropertyId}
```

**Auth Required**: Yes

**Response**: 204 No Content

## Transactions API

### Add Transaction
```
POST /api/transactions
```

**Auth Required**: Yes

**Body:**
```json
{
  "portfolioPropertyId": "pp_123",
  "transactionType": "income",
  "category": "Rent Income",
  "amount": 2500,
  "date": "2024-08-31T00:00:00Z",
  "description": "August rent payment"
}
```

**Response:** 201 Created
```json
{
  "id": "tx_123",
  "portfolioPropertyId": "pp_123",
  "userId": "user_123",
  "transactionType": "income",
  "category": "Rent Income",
  "amount": 2500,
  "date": "2024-08-31T00:00:00Z",
  "description": "August rent payment",
  "createdAt": "2024-08-31T00:00:00Z"
}
```

### Get Transactions
```
GET /api/transactions
```

**Auth Required**: Yes

**Query Parameters:**
- `portfolioPropertyId` (string, optional): Filter by property

**Response:**
```json
[
  {
    "id": "tx_123",
    "date": "2024-08-31T00:00:00Z",
    "category": "Rent Income",
    "type": "income",
    "amount": 2500,
    "portfolioProperty": {...}
  }
]
```

### Update Transaction
```
PATCH /api/transactions/{transactionId}
```

**Auth Required**: Yes

**Body:** (any field)
```json
{
  "amount": 2600,
  "description": "Updated amount"
}
```

**Response:**
```json
{
  "id": "tx_123",
  ...
}
```

### Delete Transaction
```
DELETE /api/transactions/{transactionId}
```

**Auth Required**: Yes

**Response**: 204 No Content

### Get Category Totals
```
GET /api/transactions/analytics/category-totals
```

**Auth Required**: Yes

**Query Parameters:**
- `startDate` (ISO string): Start date
- `endDate` (ISO string): End date

**Response:**
```json
{
  "Rent Income": 5000,
  "Property Tax": -1200,
  "Insurance": -600,
  "Maintenance": -350
}
```

## AI Service API

### Estimate Property Value
```
POST /api/ai/valuation/estimate
```

**Body:**
```json
{
  "bedrooms": 3,
  "bathrooms": 2,
  "square_feet": 1800,
  "lot_size": 5000,
  "year_built": 2005,
  "city": "Denver",
  "state": "CO",
  "zip_code": "80202"
}
```

**Response:**
```json
{
  "estimated_value": 475000,
  "confidence_interval_low": 427500,
  "confidence_interval_high": 522500,
  "valuation_breakdown": {
    "base_value_sqft": {
      "amount": 450000,
      "description": "1800 sqft × $250/sqft"
    },
    "bedroom_adjustment": {
      "amount": 150000,
      "description": "3 bedrooms × $50000"
    },
    "bathroom_adjustment": {
      "amount": 60000,
      "description": "2 bathrooms × $30000"
    },
    "age_adjustment": {
      "amount": -28500,
      "description": "19 years old (depreciation)"
    },
    "lot_bonus": {
      "amount": -156500,
      "description": "Lot size bonus (5000 sqft)"
    }
  }
}
```

### Score Investment
```
POST /api/ai/scoring/score
```

**Body:**
```json
{
  "profile": {
    "investment_style": "rental",
    "target_roi": 8.0,
    "risk_tolerance": "moderate"
  },
  "property_data": {
    "acquisition_price": 450000,
    "estimated_value": 475000,
    "annual_rental_income": 30000,
    "annual_expenses": 9000,
    "bedrooms": 3,
    "bathrooms": 2,
    "square_feet": 1800,
    "market_appreciation_rate": 0.03
  }
}
```

**Response:**
```json
{
  "overall_score": 78.5,
  "roi_score": 85.0,
  "cash_flow_score": 80.0,
  "appreciation_score": 75.0,
  "risk_score": 75.0,
  "recommendation": "Good investment potential",
  "key_factors": [
    "Strong ROI: 4.7%",
    "Positive cash flow: $21,000/year",
    "Positive equity: $25,000",
    "Low expense ratio"
  ]
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Authentication required or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| INVALID_REQUEST | 400 | Invalid request body or parameters |
| CONFLICT | 409 | Resource conflict (e.g., duplicate) |
| INTERNAL_ERROR | 500 | Server error |
| PROPERTY_NOT_FOUND | 404 | Property doesn't exist |
| PORTFOLIO_NOT_FOUND | 404 | Portfolio property doesn't exist |
| USER_NOT_FOUND | 404 | User doesn't exist |

## Rate Limiting

- **API**: 100 requests per minute per IP
- **AI Service**: 50 requests per minute per user

Exceeding limits returns `429 Too Many Requests`.

## CORS

**Allowed Origins:**
- Development: `*`
- Production: `https://yourdomain.com`

**Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS

**Allowed Headers:** Content-Type, Authorization

## Webhooks (Future)

Planned webhooks for Phase 3:
- Property price updates
- Portfolio performance changes
- Transaction confirmations
- Market analysis updates

---

For more information, see:
- [README.md](./README.md) - Project overview
- [SETUP.md](./SETUP.md) - Development setup
- Interactive API docs: `/docs` on AI service
