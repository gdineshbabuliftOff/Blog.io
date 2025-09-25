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

        if (!siteDoc.exists) return NextResponse.json({ message: 'Site not found' }, { status: 404 });

        const siteData = siteDoc.data();
        if (siteData?.ownerId !== uid) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

        return NextResponse.json({ id: siteDoc.id, ...siteData });
    } catch (error) {
        console.error(`Error fetching site ${params.siteId}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

        if (!siteDoc.exists) return NextResponse.json({ message: 'Site not found' }, { status: 404 });

        if (siteDoc.data()?.ownerId !== uid) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

        await siteRef.update({
            draftContent: content, // Save to draftContent
            draftPageStyles: pageStyles,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ message: 'Draft updated successfully' }, { status: 200 });
    } catch (error) {
        console.error(`Error updating site ${params.siteId}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}