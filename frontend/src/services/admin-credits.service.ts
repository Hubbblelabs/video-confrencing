// Admin API endpoints for credit management

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(token: string) {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

export interface StudentWallet {
    userId: string;
    displayName: string;
    email: string;
    balance: number;
}

export const adminCreditsApi = {
    // Get all student wallets
    getStudentWallets: async (token: string, search?: string): Promise<StudentWallet[]> => {
        const url = new URL(`${API_BASE}/billing/admin/wallets`);
        if (search) {
            url.searchParams.append('search', search);
        }

        const response = await fetch(url.toString(), {
            headers: getAuthHeaders(token),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to fetch wallets' }));
            throw new Error(error.message || 'Failed to fetch wallets');
        }

        return response.json();
    },

    // Add credits to a student
    addCredits: async (token: string, userId: string, amount: number): Promise<void> => {
        const response = await fetch(`${API_BASE}/billing/admin/add-credits`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ userId, amount }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to add credits' }));
            throw new Error(error.message || 'Failed to add credits');
        }
    },
};
