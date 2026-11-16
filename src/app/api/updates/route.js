
import { NextResponse, connection } from "next/server";
import { getAdminDb } from "@/lib/firebaseServer";

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
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          version: data.version || "",
          status: data.status || "published",
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() || null,
        };
      })
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
