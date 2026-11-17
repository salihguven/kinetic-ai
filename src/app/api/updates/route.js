
import { NextResponse, connection } from "next/server";
import { getAdminDb } from "@/lib/firebaseServer";
import { normalizePublicUpdate } from "@/lib/updateContent";

export async function GET() {
  await connection();
  try {
    const db = getAdminDb();

    const snapshot = await db
      .collection("updates")
      .where("status", "==", "published")
      .limit(100)
      .get();

    const updates = snapshot.docs
      .map((doc) => ({ ...normalizePublicUpdate(doc.id, doc.data()), status: "published" }))
      .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
      .slice(0, 50);

    return NextResponse.json(
      {
        success: true,
        updates,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("PUBLIC UPDATES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Güncellemeler şu anda yüklenemiyor.",
      },
      { status: 500 }
    );
  }
}
