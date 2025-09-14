// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { dbAdmin } from "@/firebase/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";

// POST → Upload file
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = getStorage().bucket();

    const fileName = `uploads/${userId}/${uuidv4()}-${file.name}`;
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    const [signedUrl] = await fileRef.getSignedUrl({
      action: "read",
      expires: "03-01-2030",
    });

    await dbAdmin
      .collection("users")
      .doc(userId)
      .collection("uploads")
      .add({
        fileName,
        imageUrl: signedUrl,
        contentType: file.type,
        size: file.size,
        createdAt: new Date(),
      });

    return NextResponse.json({ success: true, url: signedUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// GET → List uploads for a user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const snapshot = await dbAdmin
      .collection("users")
      .doc(userId)
      .collection("uploads")
      .orderBy("createdAt", "desc")
      .get();

    const uploads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, uploads });
  } catch (error) {
    console.error("Fetch uploads error:", error);
    return NextResponse.json({ error: "Failed to fetch uploads" }, { status: 500 });
  }
}
