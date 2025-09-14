import { dbAdmin } from '@/firebase/firebaseAdmin';
import { verifyAuthToken } from '@/firebase/authToken';
import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';

interface DailyStat {
    name: string;
    views: number;
    likes: number;
}

interface TimeFrameData {
    data: DailyStat[];
    totalViews: number;
    totalLikes: number;
}

interface AnalyticsData {
    today: TimeFrameData;
    week: TimeFrameData;
    month: TimeFrameData;
    year: TimeFrameData;
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split('Bearer ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const { uid } = await verifyAuthToken(token);

        const sitesSnapshot = await dbAdmin.collection('sites').where('ownerId', '==', uid).limit(1).get();
        if (sitesSnapshot.empty) {
             return NextResponse.json({ 
                 today: { data: [], totalViews: 0, totalLikes: 0 }, 
                 week: { data: [], totalViews: 0, totalLikes: 0 }, 
                 month: { data: [], totalViews: 0, totalLikes: 0 }, 
                 year: { data: [], totalViews: 0, totalLikes: 0 } 
             });
        }
        
        const allStatsSnapshot = await dbAdmin.collection('dailyStats').where('uid', '==', uid).orderBy('date', 'asc').get();
        
        const allStats = allStatsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: data.uid,
                siteId: data.siteId,
                views: data.views,
                likes: data.likes,
                date: (data.date as Timestamp).toDate(),
            };
        });

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 6);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        const todayData = allStats.filter(s => s.date >= startOfToday);
        const weekDataRaw = allStats.filter(s => s.date >= weekAgo && s.date <= now);
        const monthDataRaw = allStats.filter(s => s.date >= startOfMonth);
        const yearDataRaw = allStats.filter(s => s.date >= startOfYear);

        const processAndAggregate = (rawData: typeof allStats, formatter: (date: Date) => string) => {
            const aggregation = rawData.reduce((acc, curr) => {
                const key = formatter(curr.date);
                if (!acc[key]) {
                    acc[key] = { name: key, views: 0, likes: 0 };
                }
                acc[key].views += curr.views;
                acc[key].likes += curr.likes;
                return acc;
            }, {} as Record<string, DailyStat>);
            return Object.values(aggregation);
        };
        
        const weekDaySortOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekData = processAndAggregate(weekDataRaw, d => d.toLocaleDateString('en-US', { weekday: 'short' }))
            .sort((a, b) => weekDaySortOrder.indexOf(a.name) - weekDaySortOrder.indexOf(b.name));

        const monthData = processAndAggregate(monthDataRaw, d => d.getDate().toString());
        
        const yearMonthSortOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const yearData = processAndAggregate(yearDataRaw, d => d.toLocaleDateString('en-US', { month: 'short' }))
            .sort((a, b) => yearMonthSortOrder.indexOf(a.name) - yearMonthSortOrder.indexOf(b.name));
        
        const calculateTotals = (data: typeof allStats) => data.reduce((acc, curr) => {
            acc.totalViews += curr.views;
            acc.totalLikes += curr.likes;
            return acc;
        }, { totalViews: 0, totalLikes: 0 });

        const result: AnalyticsData = {
            today: { data: todayData.map(s => ({name: 'Today', views: s.views, likes: s.likes})), ...calculateTotals(todayData) },
            week: { data: weekData, ...calculateTotals(weekDataRaw) },
            month: { data: monthData, ...calculateTotals(monthDataRaw) },
            year: { data: yearData, ...calculateTotals(yearDataRaw) }
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error fetching analytics data:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}