import { http, HttpResponse, delay } from 'msw';

/**
 * Standardized mock handlers for ZecurX CTF Platform.
 * These simulate the NestJS backend API.
 */
export const handlers = [
    // Authentication: Get current user
    http.get('*/api/auth/me', async () => {
        await delay(300); // Realistic latency
        return HttpResponse.json({
            id: 'usr_mock_8821',
            username: 'AlphaTester',
            email: 'tester@zecurx-mock.io',
            role: 'ADMIN',
            preferences: { theme: 'dark', language: 'en' }
        });
    }),

    // Features: Get enabled/disabled platform features
    http.get('*/api/features', () => {
        return HttpResponse.json([
            { id: 'feat_1', name: 'Terminal Access', status: 'enabled' },
            { id: 'feat_2', name: 'Flag Submission', status: 'enabled' },
            { id: 'feat_3', name: 'Dynamic Hinting', status: 'disabled' }
        ]);
    }),

    // Authentication: Login
    http.post('*/api/auth/login', () => {
        return HttpResponse.json({
            access_token: 'mock-jwt-token-eyjhbg...',
            user: { id: 'usr_mock_8821', username: 'AlphaTester' }
        });
    }),

    // Challenges: List all challenges
    http.get('*/api/challenges', () => {
        return HttpResponse.json([
            {
                id: 'chal-1',
                title: 'SQL Injection: The Beginning',
                category: 'Web Exploitation',
                points: 100,
                difficulty: 'Easy',
                description: 'Practice basic SQL injection on a login form.',
                author: 'Admin',
                solves: 156
            },
            {
                id: 'chal-2',
                title: 'Buffer Overflow #1',
                category: 'Binary Exploitation',
                points: 250,
                difficulty: 'Medium',
                description: 'A classic stack-based buffer overflow.',
                author: 'BinaryWizard',
                solves: 42
            },
            {
                id: 'chal-3',
                title: 'AES-ECB Leak',
                category: 'Cryptography',
                points: 400,
                difficulty: 'Hard',
                description: 'Identify flaws in ECB mode encryption.',
                author: 'CryptoNerd',
                solves: 12
            }
        ]);
    }),

    // Submissions: Submit a flag
    http.post('*/api/challenges/:id/submit', async ({ params }) => {
        const { id } = params;
        await delay(500);
        return HttpResponse.json({
            success: true,
            message: 'Correct flag!',
            points_awarded: 100
        });
    }),
];
