# Multi-Store Feature Implementation

## Overview
This document outlines the implementation of multi-store functionality in PAMVENTORY, allowing users to manage multiple stores from a single account.

## Database Schema Changes

### New Store Model
- **File**: `models/Store.js`
- **Purpose**: Stores store-specific information
- **Key Fields**:
  - `name`: Store name (required)
  - `description`: Store description
  - `address`: Store address
  - `phone`: Store phone number
  - `userId`: Reference to owner
  - `isActive`: Soft delete flag
  - `settings`: Store-specific settings (currency, timezone, etc.)

### Updated User Model
- **File**: `models/User.js`
- **New Fields**:
  - `activeStoreId`: Currently active store
  - `stores`: Array of store IDs owned by user

## API Endpoints

### Store Management
- `POST /api/stores` - Create new store
- `GET /api/stores` - Get user's stores
- `GET /api/stores/active` - Get active store
- `GET /api/stores/:storeId` - Get specific store
- `PUT /api/stores/:storeId` - Update store
- `DELETE /api/stores/:storeId` - Delete store
- `PUT /api/stores/set-active` - Set active store

### Updated Auth Endpoints
- `GET /api/auth/me` - Now includes store information

## Middleware

### Store Middleware (`middlewares/storeMiddleware.js`)
- `validateStoreAccess`: Validates user has active store
- `validateSpecificStoreAccess`: Validates access to specific store
- `checkUserStores`: Checks if user has any stores

## Migration

### For Existing Users
Run the migration script to create default stores for existing users:
```bash
npm run migrate
```

This will:
1. Find users without stores
2. Create a default store for each user
3. Set the default store as active
4. Update user records

## Implementation Notes

### Store Creation Flow
1. User signs up → Email verification
2. After verification → Redirect to store creation
3. Store creation → Set as active → Dashboard

### Store Switching
- Users can switch between stores
- Active store is stored in user record
- All data queries use active store ID

### Data Isolation
- All existing models (Product, Sale, Customer, etc.) will be updated to use `storeId` instead of `userId`
- This ensures complete data isolation between stores

## Next Steps

### Phase 1: Backend (✅ Complete)
- [x] Store model and controller
- [x] Store routes and middleware
- [x] User model updates
- [x] Migration script

### Phase 2: Frontend
- [ ] Store context and hooks
- [ ] Store creation flow
- [ ] Store switcher UI
- [ ] Update existing components

### Phase 3: Data Migration
- [ ] Update existing models to use storeId
- [ ] Migrate existing data
- [ ] Update all controllers

### Phase 4: Polish
- [ ] Store settings page
- [ ] Store analytics
- [ ] Advanced store management

## Usage Examples

### Creating a Store
```javascript
const response = await fetch('/api/stores', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'My Store',
    description: 'My first store',
    address: '123 Main St',
    phone: '+1234567890'
  })
});
```

### Switching Stores
```javascript
const response = await fetch('/api/stores/set-active', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    storeId: 'store_id_here'
  })
});
```

### Getting User with Stores
```javascript
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { user } = await response.json();
console.log(user.stores); // Array of stores
console.log(user.activeStoreId); // Active store
```
