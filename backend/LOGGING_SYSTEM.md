# API Logging System

## Overview

Complete logging system for all HTTP requests and error handling in the video conferencing backend.

## Features

### ✅ HTTP Request Logging
- **Incoming requests**: Method, URL, user, IP address
- **Outgoing responses**: Status code, response time
- **Request details**: Query params, body, headers (debug mode only)
- **Response preview**: Truncated response body (debug mode only)
- **Sensitive data redaction**: Passwords, tokens, secrets automatically redacted

### ✅ Error Logging
- **All exceptions caught**: HTTP, Prisma, generic errors
- **Detailed context**: Request method, URL, user, IP, user-agent
- **Stack traces**: Full stack for 5xx errors (non-production only)
- **Prisma errors**: Converted to human-readable messages
- **Validation errors**: Clear field-level error messages

## Components

### 1. HTTP Logging Interceptor
**File**: `src/common/interceptors/http-logging.interceptor.ts`

Intercepts every HTTP request and logs:
- ➡️ Incoming request (before handler)
- ⬅️ Successful response (after handler)
- ❌ Error response (if exception thrown)

**Log Format**:
```
[HTTP] ➡️  GET /api/rooms | User: 123 | IP: ::1
[HTTP] ⬅️  GET /api/rooms | Status: 200 | 45ms | User: 123
```

**Debug Mode** (NODE_ENV !== production):
```
[HTTP] ➡️  POST /api/auth/login | User: anonymous | IP: ::1
[HTTP]    Query: {}
[HTTP]    Body: {"email":"user@example.com","password":"***REDACTED***"}
[HTTP] ⬅️  POST /api/auth/login | Status: 200 | 125ms | User: anonymous
[HTTP]    Response: {"token":"eyJ...", "user":{"id":"123"...
```

### 2. Global Exception Filter
**File**: `src/common/filters/all-exceptions.filter.ts`

Catches all exceptions and formats error responses:

**Handled Errors**:
- **HTTP Exceptions** (400, 401, 403, 404, etc.)
- **Prisma Errors** (P2002, P2003, P2025, etc.)
- **Validation Errors** (class-validator)
- **Generic Errors** (500)

**Log Format**:
```
[ExceptionFilter] 🔥 NotFound | GET /api/rooms/invalid | Status: 404 | User: 123 | IP: ::1
[ExceptionFilter]    Message: Record not found
[ExceptionFilter]    Stack: Error: Record not found at ...
```

**Error Response** (JSON):
```json
{
  "statusCode": 404,
  "message": "Record not found",
  "error": "NotFound",
  "timestamp": "2026-02-09T10:00:00.000Z",
  "path": "/api/rooms/invalid",
  "method": "GET",
  "stack": "Error: Record not found at ..." // Only in development
}
```

## Setup

### 1. Files Created
```
backend/src/
├── common/
│   ├── interceptors/
│   │   ├── http-logging.interceptor.ts  (New)
│   │   └── index.ts                     (New)
│   └── filters/
│       ├── all-exceptions.filter.ts     (New)
│       └── index.ts                     (New)
└── main.ts                              (Updated)
```

### 2. Configuration (main.ts)
```typescript
import { HttpLoggingInterceptor } from './common/interceptors';
import { AllExceptionsFilter } from './common/filters';

// Global exception filter (handle all errors)
app.useGlobalFilters(new AllExceptionsFilter());

// Global logging interceptor (log all API requests)
app.useGlobalInterceptors(new HttpLoggingInterceptor());
```

## Usage Examples

### Successful Request
```bash
curl http://localhost:3000/api/rooms

# Logs:
[HTTP] ➡️  GET /api/rooms | User: 123 | IP: ::1
[HTTP] ⬅️  GET /api/rooms | Status: 200 | 45ms | User: 123
```

### Failed Request (Not Found)
```bash
curl http://localhost:3000/api/rooms/invalid

# Logs:
[HTTP] ➡️  GET /api/rooms/invalid | User: 123 | IP: ::1
[ExceptionFilter] 🔥 NotFound | GET /api/rooms/invalid | Status: 404 | User: 123 | IP: ::1
[ExceptionFilter]    Message: Record not found
[HTTP] ❌ GET /api/rooms/invalid | Status: 404 | 12ms | User: 123
```

### Validation Error
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid"}'

# Logs:
[HTTP] ➡️  POST /api/auth/login | User: anonymous | IP: ::1
[HTTP]    Body: {"email":"invalid"}
[ExceptionFilter] 🔥 BadRequestException | POST /api/auth/login | Status: 400 | User: anonymous | IP: ::1
[ExceptionFilter]    Message: email must be an email, password should not be empty
[HTTP] ❌ POST /api/auth/login | Status: 400 | 8ms | User: anonymous
```

### Prisma Unique Constraint Error
```typescript
// Service code:
await prisma.user.create({
  data: { email: 'existing@example.com' }
});

// Logs:
[HTTP] ➡️  POST /api/auth/register | User: anonymous | IP: ::1
[ExceptionFilter] 🔥 UniqueConstraintViolation | POST /api/auth/register | Status: 409 | User: anonymous | IP: ::1
[ExceptionFilter]    Message: A record with this email already exists
[HTTP] ❌ POST /api/auth/register | Status: 409 | 25ms | User: anonymous

// Response:
{
  "statusCode": 409,
  "message": "A record with this email already exists",
  "error": "UniqueConstraintViolation",
  "timestamp": "2026-02-09T10:00:00.000Z",
  "path": "/api/auth/register",
  "method": "POST"
}
```

## Security Features

### Sensitive Data Redaction
Automatically redacts sensitive fields in logs:
- `password`, `passwordHash`, `hashedPassword`
- `token`, `accessToken`, `refreshToken`
- `secret`, `apiKey`
- `creditCard`, `cvv`

**Example**:
```typescript
// Request body:
{ email: "user@example.com", password: "secret123" }

// Logged as:
{ email: "user@example.com", password: "***REDACTED***" }
```

### Production vs Development

**Production** (NODE_ENV=production):
- ✅ Request/response logging enabled
- ❌ Request body/query NOT logged
- ❌ Response preview NOT logged
- ❌ Stack traces NOT included in responses
- ✅ Error messages still logged

**Development**:
- ✅ Full request logging (query, params, body)
- ✅ Response preview (first 200 chars)
- ✅ Stack traces in responses
- ✅ Detailed error context

## Prisma Error Codes Handled

| Code | HTTP Status | Message |
|------|-------------|---------|
| P2002 | 409 Conflict | A record with this {field} already exists |
| P2003 | 400 Bad Request | Cannot perform this operation due to related records |
| P2016 | 404 Not Found | Record to delete does not exist |
| P2025 | 404 Not Found | Record not found |
| P2021 | 500 Internal Error | Database table does not exist |
| P2022 | 500 Internal Error | Database column does not exist |

## Testing the Logging

### Start the server:
```bash
npm run start:dev
```

### Test requests:
```bash
# Success case
curl http://localhost:3000/api/health

# Not found
curl http://localhost:3000/api/invalid

# Create user (duplicate email - will trigger P2002)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","displayName":"Test"}'

# Create same user again (conflict)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","displayName":"Test"}'
```

## Log Output Examples

### Complete Request Log (Development):
```
[Nest] 12345  - 02/09/2026, 10:00:00 AM     LOG [HTTP] ➡️  POST /api/rooms | User: abc-123 | IP: ::1
[Nest] 12345  - 02/09/2026, 10:00:00 AM   DEBUG [HTTP]    Query: {}
[Nest] 12345  - 02/09/2026, 10:00:00 AM   DEBUG [HTTP]    Body: {"title":"Team Meeting","maxParticipants":10}
[Nest] 12345  - 02/09/2026, 10:00:00 AM     LOG [HTTP] ⬅️  POST /api/rooms | Status: 201 | 156ms | User: abc-123
[Nest] 12345  - 02/09/2026, 10:00:00 AM   DEBUG [HTTP]    Response: {"id":"room-456","title":"Team Meeting","roomCode":"ABC123"...
```

### Complete Error Log (Development):
```
[Nest] 12345  - 02/09/2026, 10:00:05 AM     LOG [HTTP] ➡️  DELETE /api/rooms/invalid-id | User: abc-123 | IP: ::1
[Nest] 12345  - 02/09/2026, 10:00:05 AM   ERROR [ExceptionFilter] 🔥 NotFound | DELETE /api/rooms/invalid-id | Status: 404 | User: abc-123 | IP: ::1
[Nest] 12345  - 02/09/2026, 10:00:05 AM   ERROR [ExceptionFilter]    Message: Record not found
[Nest] 12345  - 02/09/2026, 10:00:05 AM   ERROR [ExceptionFilter]    Stack: Error: Record not found
    at PrismaService.handlePrismaError (prisma.service.ts:75:13)
    at RoomsService.deleteRoom (rooms.service.ts:120:18)
    at RoomsController.deleteRoom (rooms.controller.ts:55:25)
[Nest] 12345  - 02/09/2026, 10:00:05 AM   ERROR [HTTP] ❌ DELETE /api/rooms/invalid-id | Status: 404 | 8ms | User: abc-123
```

## Performance Impact

- **Minimal**: Logging happens asynchronously
- **Zero blocking**: Requests are not delayed by logging
- **Optimized**: Debug logs only in development
- **Efficient**: Only 200 chars of response body logged

## Customization

### Add custom log labels:
```typescript
// In interceptor:
this.logger.log(`🔵 ${method} ${url}...`);  // Custom emoji
```

### Filter specific routes:
```typescript
// In interceptor:
if (url.includes('/health')) {
  return next.handle(); // Skip logging
}
```

### Add correlation IDs:
```typescript
// Generate request ID
const requestId = uuidv4();
this.logger.log(`[${requestId}] ${method} ${url}`);
```

## Benefits

✅ **Debugging**: See exactly what's happening with each request  
✅ **Monitoring**: Track response times and error rates  
✅ **Security**: Audit trail of all API access  
✅ **Troubleshooting**: Full context for every error  
✅ **Performance**: Measure endpoint response times  
✅ **Compliance**: GDPR-compliant logging (no sensitive data)  

---

**Status**: ✅ **Active and logging all API requests!**
