// Subjects API service

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(token: string) {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

export interface Subject {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        teachers: number;
        students: number;
    };
    teachers?: Array<{
        id: string;
        teacherId: string;
        assignedAt: string;
        teacher: { id: string; displayName: string; email: string };
    }>;
    students?: Array<{
        id: string;
        studentId: string;
        grantedAt: string;
        student: { id: string; displayName: string; email: string };
    }>;
}

export interface TeacherSubjectEntry {
    id: string;
    teacherId: string;
    subjectId: string;
    assignedAt: string;
    subject: Subject;
}

export interface StudentSubjectEntry {
    id: string;
    studentId: string;
    subjectId: string;
    grantedAt: string;
    subject: Subject;
}

export const subjectsApi = {
    // ─── SUBJECT CRUD ──────────────────────────────

    getAll: async (token: string): Promise<Subject[]> => {
        const response = await fetch(`${API_BASE}/admin/subjects`, {
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to fetch subjects' }));
            throw new Error(error.message || 'Failed to fetch subjects');
        }
        return response.json();
    },

    create: async (token: string, data: { name: string; description?: string; icon?: string; color?: string }): Promise<Subject> => {
        const response = await fetch(`${API_BASE}/admin/subjects`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to create subject' }));
            throw new Error(error.message || 'Failed to create subject');
        }
        return response.json();
    },

    update: async (token: string, id: string, data: { name?: string; description?: string; icon?: string; color?: string; isActive?: boolean }): Promise<Subject> => {
        const response = await fetch(`${API_BASE}/admin/subjects/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(token),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to update subject' }));
            throw new Error(error.message || 'Failed to update subject');
        }
        return response.json();
    },

    delete: async (token: string, id: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/admin/subjects/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to delete subject' }));
            throw new Error(error.message || 'Failed to delete subject');
        }
    },

    // ─── TEACHER MAPPING ──────────────────────────────

    getSubjectTeachers: async (token: string, subjectId: string) => {
        const response = await fetch(`${API_BASE}/admin/subjects/${subjectId}/teachers`, {
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to fetch teachers' }));
            throw new Error(error.message || 'Failed to fetch teachers');
        }
        return response.json();
    },

    assignTeacher: async (token: string, subjectId: string, teacherId: string) => {
        const response = await fetch(`${API_BASE}/admin/subjects/${subjectId}/teachers`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ teacherId }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to assign teacher' }));
            throw new Error(error.message || 'Failed to assign teacher');
        }
        return response.json();
    },

    removeTeacher: async (token: string, subjectId: string, teacherId: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/admin/subjects/${subjectId}/teachers/${teacherId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to remove teacher' }));
            throw new Error(error.message || 'Failed to remove teacher');
        }
    },

    // ─── STUDENT ACCESS ──────────────────────────────

    getSubjectStudents: async (token: string, subjectId: string) => {
        const response = await fetch(`${API_BASE}/admin/subjects/${subjectId}/students`, {
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to fetch students' }));
            throw new Error(error.message || 'Failed to fetch students');
        }
        return response.json();
    },

    grantStudentAccess: async (token: string, subjectId: string, studentId: string) => {
        const response = await fetch(`${API_BASE}/admin/subjects/${subjectId}/students`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ studentId }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to grant access' }));
            throw new Error(error.message || 'Failed to grant access');
        }
        return response.json();
    },

    revokeStudentAccess: async (token: string, subjectId: string, studentId: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/admin/subjects/${subjectId}/students/${studentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to revoke access' }));
            throw new Error(error.message || 'Failed to revoke access');
        }
    },

    // ─── SELF-SERVICE ──────────────────────────────

    getMySubjects: async (token: string): Promise<TeacherSubjectEntry[]> => {
        const response = await fetch(`${API_BASE}/admin/subjects/my-subjects`, {
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to fetch your subjects' }));
            throw new Error(error.message || 'Failed to fetch your subjects');
        }
        return response.json();
    },

    getStudentAccessibleSubjects: async (token: string): Promise<StudentSubjectEntry[]> => {
        const response = await fetch(`${API_BASE}/admin/subjects/student-subjects`, {
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to fetch subjects' }));
            throw new Error(error.message || 'Failed to fetch subjects');
        }
        return response.json();
    },
};
