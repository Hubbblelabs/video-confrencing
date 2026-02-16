# Role-Based Authentication Implementation

## Overview

This application now implements a comprehensive role-based authentication system with three distinct user roles: **Student**, **Teacher**, and **Admin**.

## User Roles

### 👨‍🎓 Student
- **Permissions**: Can only attend meetings
- **Restrictions**: Cannot create or manage meetings
- **Use Case**: Regular participants who join meetings created by teachers

### 👩‍🏫 Teacher
- **Permissions**: 
  - Can attend meetings
  - Can create new meetings
  - Can manage their own meetings
- **Use Case**: Educators, meeting hosts, presenters

### 🔧 Admin
- **Permissions**: Full access to all features
  - Can attend meetings
  - Can create meetings
  - Can perform all administrative actions
- **Use Case**: System administrators, moderators

## Technical Implementation

### Backend Changes

#### 1. Prisma Schema
- Added `UserRole` enum with values: `STUDENT`, `TEACHER`, `ADMIN`
- Added `role` field to `User` model with default value of `STUDENT`

```prisma
enum UserRole {
  STUDENT
  TEACHER
  ADMIN
}

model User {
  // ... other fields
  role UserRole @default(STUDENT)
}
```

#### 2. Authentication System
- Updated JWT payload to include user role
- Modified registration to accept optional role parameter
- Role is persisted and included in authentication tokens

**Files Modified:**
- `backend/src/shared/interfaces/index.ts` - Updated `JwtPayload` interface
- `backend/src/auth/auth.service.ts` - Added role to JWT generation
- `backend/src/auth/dto/auth.dto.ts` - Added optional role field to `RegisterDto`
- `backend/src/database/entities/user.entity.ts` - Added role column

#### 3. Authorization Guards
Created role-based authorization system:

**Files Created:**
- `backend/src/shared/enums/user-role.enum.ts` - UserRole enum definition
- `backend/src/auth/guards/roles.guard.ts` - Authorization guard
- `backend/src/auth/guards/roles.decorator.ts` - `@Roles()` decorator

**Usage Example:**
```typescript
@SubscribeMessage(WsEvents.CREATE_ROOM)
async handleCreateRoom(@ConnectedSocket() socket: AppSocket) {
  this.assertRole(socket, [UserRole.TEACHER, UserRole.ADMIN]);
  // Only teachers and admins can create rooms
}
```

#### 4. WebSocket Gateway
- Updated `AuthenticatedSocket` interface to include `userRole`
- Added role checking in `handleCreateRoom` - only TEACHER and ADMIN can create rooms
- Admin role has automatic bypass for all role checks

**Files Modified:**
- `backend/src/gateway/conference.gateway.ts`
- `backend/src/gateway/ws-auth.service.ts`

### Frontend Changes

#### 1. Type Definitions
- Added `UserRole` enum to frontend types
- Updated `JwtPayload` and `User` interfaces to include role

**Files Modified:**
- `frontend/src/types/api.types.ts`

#### 2. Authentication Store
- Updated auth store to persist and retrieve user role
- Role is stored in sessionStorage alongside token

**Files Modified:**
- `frontend/src/store/auth.store.ts`

#### 3. User Interface

**Registration Page:**
- Added role selector dropdown during registration
- Users can choose their role: Student, Teacher, or Admin
- Default role is Student

**Lobby Page:**
- Displays user's current role as a badge
- "New Meeting" button is conditionally shown:
  - ✅ Visible for Teachers and Admins
  - ❌ Hidden for Students
- All users can join meetings via room code

**Files Modified:**
- `frontend/src/pages/AuthPage.tsx` - Added role selection
- `frontend/src/pages/LobbyPage.tsx` - Conditional UI based on role

## Database Migration

A new migration has been created and applied:
- Migration: `20260213053200_add_user_roles`
- Adds `user_role` enum to database
- Adds `role` column to `users` table with default value `STUDENT`

## Usage Guide

### For Users

1. **Registration:**
   - Navigate to the registration page
   - Fill in email, password, and display name
   - Select your role from the dropdown (Student, Teacher, or Admin)
   - Default role is Student if not specified

2. **Login:**
   - Your role is automatically loaded from your account
   - The lobby page will show your role as a badge

3. **Creating Meetings (Teachers & Admins only):**
   - Click "New Meeting" button on lobby page
   - Enter meeting details
   - Meeting is created and you become the host

4. **Joining Meetings (All roles):**
   - Enter room code in the input field
   - Click "Join" to enter the meeting

### For Developers

#### Adding New Role-Protected Features

1. **Backend (WebSocket Gateway):**
```typescript
this.assertRole(socket, [UserRole.TEACHER, UserRole.ADMIN]);
```

2. **Frontend (Conditional Rendering):**
```tsx
const role = useAuthStore((s) => s.role);
const canDoAction = role === UserRole.TEACHER || role === UserRole.ADMIN;

{canDoAction && <button>Protected Action</button>}
```

#### Changing Default Role

Update in `backend/prisma/schema.prisma`:
```prisma
role UserRole @default(TEACHER) // Change STUDENT to desired default
```

Then run: `npx prisma migrate dev --name change_default_role`

## Security Considerations

1. **Role Validation:**
   - All role checks are enforced on the backend
   - Frontend UI changes are for UX only - not security
   - Never rely solely on frontend checks for authorization

2. **Admin Privileges:**
   - Admins have automatic access to all features
   - The `assertRole` guard automatically allows admins
   - Be cautious when granting admin role

3. **JWT Security:**
   - Roles are embedded in JWT tokens
   - Tokens are signed and verified on the server
   - Role cannot be tampered with by clients

## Testing Recommendations

1. **Create Test Users:**
   - Register one user of each role type
   - Verify UI displays correctly for each role

2. **Test Authorization:**
   - As a Student, verify you cannot create rooms
   - As a Teacher, verify you can create rooms
   - As an Admin, verify full access

3. **Test Edge Cases:**
   - Try to create room without proper role (should fail)
   - Verify JWT tokens include role information
   - Test role persistence across login sessions

## Future Enhancements

Potential features to add:
- Role-based permissions for specific meeting actions (mute, kick, etc.)
- Custom roles with granular permissions
- Role assignment by admins (promote/demote users)
- Organization-level role management
- Meeting-specific roles (in addition to user roles)
- Audit logging for role changes

## Troubleshooting

**Issue: "New Meeting" button not appearing for teachers**
- Check if role is correctly set in database
- Verify JWT token includes role field
- Clear sessionStorage and re-login

**Issue: Students can create meetings**
- Check backend logs for authorization errors
- Verify `assertRole` is called in `handleCreateRoom`
- Ensure migration was applied successfully

**Issue: Role not persisting after login**
- Check sessionStorage for role key
- Verify auth store is correctly updated
- Check JWT payload includes role field

## Migration Script

If you need to update existing users' roles:

```sql
-- Make all existing users teachers (example)
UPDATE users SET role = 'TEACHER' WHERE email LIKE '%@school.edu';

-- Make specific users admins
UPDATE users SET role = 'ADMIN' WHERE email IN ('admin@example.com');
```

## API Changes

### Register Endpoint
**POST** `/auth/register`

Request body now accepts optional `role` field:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe",
  "role": "TEACHER"  // Optional: STUDENT, TEACHER, or ADMIN
}
```

### JWT Payload
Updated structure:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "displayName": "John Doe",
  "role": "TEACHER",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

**Implementation Date:** February 13, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
