import { authAdmin } from '@/firebase/firebaseAdmin';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Verifies a Firebase ID token.
 * @param token The Firebase ID token string.
 * @returns A promise that resolves with the decoded token if valid.
 */
export const verifyAuthToken = (token: string): Promise<DecodedIdToken> => {
    if (!token) {
        throw new Error('No auth token provided.');
    }
    return authAdmin.verifyIdToken(token);
};
