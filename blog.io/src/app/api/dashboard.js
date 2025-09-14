// /pages/api/dashboard.js
import { admin } from '@/lib/firebase-admin'; // Your Firebase Admin SDK initialization

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // 1. Verify user token from Authorization header
        const token = req.headers.authorization?.split('Bearer ')[1];
        const { uid } = await verifyAuthToken(token);
        if (!uid) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        // 2. Fetch user's sites from Firestore
        const sitesSnapshot = await admin.firestore().collection('sites').where('ownerId', '==', uid).get();
        const sites = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Fetch user's recent posts from Firestore
        const postsSnapshot = await admin.firestore().collection('posts').where('authorId', '==', uid).orderBy('createdAt', 'desc').limit(5).get();
        const recentPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 4. Aggregate stats
        let totalViews = 0;
        sites.forEach(site => {
            totalViews += site.stats?.views || 0;
        });
        const stats = {
            totalSites: sites.length,
            totalPosts: (await admin.firestore().collection('posts').where('authorId', '==', uid).get()).size,
            totalViews: totalViews,
        };

        // 5. Return all data in one payload
        res.status(200).json({ sites, recentPosts, stats });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}