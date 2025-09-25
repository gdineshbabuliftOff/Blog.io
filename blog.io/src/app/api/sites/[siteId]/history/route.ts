import { dbAdmin } from '@/firebase/firebaseAdmin';
import { verifyAuthToken } from '@/firebase/authToken';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

interface RouteParams {
    params: {
        siteId: string;
    };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split('Bearer ')[1];
        const { siteId } = params;

        if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        
        const { uid } = await verifyAuthToken(token);
        const siteRef = dbAdmin.collection('sites').doc(siteId);
        const siteDoc = await siteRef.get();

        if (!siteDoc.exists || siteDoc.data()?.ownerId !== uid) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const historySnapshot = await siteRef.collection('history').orderBy('savedAt', 'desc').get();
        const history = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json({ history });

    } catch (error) {
        console.error(`Error fetching history for site ${params.siteId}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
     try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split('Bearer ')[1];
        const { siteId } = params;

        if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { uid } = await verifyAuthToken(token);
        const { content, pageStyles } = await request.json();

        if (!content || !pageStyles) return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });

        const siteRef = dbAdmin.collection('sites').doc(siteId);
        const siteDoc = await siteRef.get();

        if (!siteDoc.exists || siteDoc.data()?.ownerId !== uid) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const historyRef = siteRef.collection('history').doc();
        await historyRef.set({
            content,
            pageStyles,
            savedAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ message: 'Version saved successfully', historyId: historyRef.id }, { status: 201 });

    } catch (error) {
        console.error(`Error saving version for site ${params.siteId}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}