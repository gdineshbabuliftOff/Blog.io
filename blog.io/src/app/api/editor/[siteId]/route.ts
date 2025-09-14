import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin, authAdmin } from '@/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

async function verifyOwnership(request: NextRequest, siteId: string) {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
        return { error: 'Unauthorized', status: 401, uid: null };
    }
    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const siteDoc = await dbAdmin.collection('sites').doc(siteId).get();
        if (!siteDoc.exists || siteDoc.data()?.ownerId !== decodedToken.uid) {
            return { error: 'Forbidden', status: 403, uid: null };
        }
        return { error: null, status: 200, uid: decodedToken.uid };
    } catch (e) {
        return { error: 'Unauthorized', status: 401, uid: null };
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { siteId: string } }
) {
    const { siteId } = params;
    const authResult = await verifyOwnership(request, siteId);
    if (authResult.error) {
        return NextResponse.json({ message: authResult.error }, { status: authResult.status });
    }

    const siteRef = dbAdmin.collection('sites').doc(siteId);
    const doc = await siteRef.get();

    if (!doc.exists) {
        return NextResponse.json({ message: 'Site not found' }, { status: 404 });
    }

    return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { siteId: string } }
) {
    const { siteId } = params;
    const authResult = await verifyOwnership(request, siteId);
    if (authResult.error) {
        return NextResponse.json({ message: authResult.error }, { status: authResult.status });
    }

    const { title, draftContent, publish } = await request.json();
    const siteRef = dbAdmin.collection('sites').doc(siteId);

    const dataToUpdate: { [key: string]: any } = {
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (title !== undefined) {
        dataToUpdate.title = title;
    }
    if (draftContent !== undefined) {
        dataToUpdate.draftContent = draftContent;
    }
    if (publish === true && draftContent !== undefined) {
        dataToUpdate.publishedContent = draftContent;
        dataToUpdate.status = 'published'; 
    }

    if (Object.keys(dataToUpdate).length === 1) {
        return NextResponse.json({ message: 'No content provided to update' }, { status: 400 });
    }

    await siteRef.update(dataToUpdate);

    return NextResponse.json({ message: 'Site updated successfully' });
}
