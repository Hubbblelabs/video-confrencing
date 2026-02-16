export interface Wallet {
    id: string;
    userId: string;
    balance: number;
    createdAt: string;
    updatedAt: string;
}

export interface Transaction {
    id: string;
    userId: string;
    meetingId: string | null;
    type: 'topup' | 'debit' | 'refund';
    amount: number;
    status: 'pending' | 'success' | 'failed';
    providerTransactionId: string | null;
    metadata: any;
    createdAt: string;
    meeting?: {
        title: string;
        roomCode: string;
    };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(token: string) {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

export const billingApi = {
    getWallet: async (token: string): Promise<Wallet> => {
        const response = await fetch(`${API_BASE}/billing/wallet`, {
            headers: getAuthHeaders(token),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch wallet');
        }

        return response.json();
    },

    getTransactions: async (token: string): Promise<Transaction[]> => {
        const response = await fetch(`${API_BASE}/billing/transactions`, {
            headers: getAuthHeaders(token),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }

        return response.json();
    },

    topup: async (token: string, amount: number): Promise<Transaction> => {
        const response = await fetch(`${API_BASE}/billing/topup`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ amount }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to topup' }));
            throw new Error(error.message || 'Failed to topup');
        }

        return response.json();
    },
};
