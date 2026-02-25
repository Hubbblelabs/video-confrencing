// Admin API endpoints for user management

import type { UserRole } from '../types/api.types';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateAdminUserRequest {
  email?: string;
  password?: string;
  displayName?: string;
  isActive?: boolean;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

export interface UserStatistics {
  total: number;
  students: number;
  teachers: number;
  admins: number;
  active: number;
  inactive: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAuthHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const adminUsersApi = {
  // Get all users (optionally filter by role)
  getAll: async (token: string, role?: UserRole): Promise<AdminUser[]> => {
    const url = new URL(`${API_BASE}/admin/users`);
    if (role) {
      url.searchParams.append('role', role);
    }

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch users' }));
      throw new Error(error.message || 'Failed to fetch users');
    }

    return response.json();
  },

  // Get statistics
  getStatistics: async (token: string): Promise<UserStatistics> => {
    const response = await fetch(`${API_BASE}/admin/users/statistics`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch statistics' }));
      throw new Error(error.message || 'Failed to fetch statistics');
    }

    return response.json();
  },

  // Get single user
  getOne: async (token: string, id: string): Promise<AdminUser> => {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'User not found' }));
      throw new Error(error.message || 'User not found');
    }

    return response.json();
  },

  // Create user
  create: async (token: string, data: CreateAdminUserRequest): Promise<AdminUser> => {
    const response = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create user' }));
      throw new Error(error.message || 'Failed to create user');
    }

    return response.json();
  },

  // Update user
  update: async (token: string, id: string, data: UpdateAdminUserRequest): Promise<AdminUser> => {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update user' }));
      throw new Error(error.message || 'Failed to update user');
    }

    return response.json();
  },

  // Update user role
  updateRole: async (token: string, id: string, data: UpdateUserRoleRequest): Promise<AdminUser> => {
    const response = await fetch(`${API_BASE}/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update role' }));
      throw new Error(error.message || 'Failed to update role');
    }

    return response.json();
  },

  // Delete user
  delete: async (token: string, id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to delete user' }));
      throw new Error(error.message || 'Failed to delete user');
    }
  },
};
