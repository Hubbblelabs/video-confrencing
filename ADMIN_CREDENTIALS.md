# Admin Account Credentials

## Default Admin User

The system administrator account has been created with the following credentials:

**Email:** `admin@videoconf.com`  
**Password:** `Admin@123456`  
**Role:** Admin  
**Display Name:** System Administrator

## Important Security Notes

⚠️ **IMPORTANT:** Change this password immediately after first login!

This is a default account with full administrative privileges. For security:

1. Log in with these credentials
2. Navigate to account settings
3. Change the password to a strong, unique password
4. Consider enabling two-factor authentication (if available)

## Login Instructions

1. Navigate to the application URL
2. Click "Sign In" or go to the login page
3. Enter the email: `admin@videoconf.com`
4. Enter the password: `Admin@123456`
5. After successful login, change your password immediately

## Admin Capabilities

As an admin, you have full access to:
- ✅ Create and manage meetings
- ✅ Join any meeting
- ✅ Manage users and permissions
- ✅ Access all system features
- ✅ Override role restrictions

## Re-running the Seed Script

To create the admin account again (if deleted), run:

```bash
cd backend
npm run seed
```

Note: If the admin account already exists, the script will notify you and skip creation.

## Additional Admin Accounts

To create additional admin accounts:

1. Register a new user through the application
2. Manually update their role in the database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'user@example.com';
```

Or use the registration page and select "Admin" role during signup.

---

**Created:** February 13, 2026  
**Last Updated:** February 13, 2026
