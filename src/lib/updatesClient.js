import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function loadPublishedUpdates() {
  const updatesQuery = query(
    collection(db, "updates"),
    where("status", "==", "published"),
    limit(100)
  );
  const snapshot = await getDocs(updatesQuery);

  return snapshot.docs
    .map((entry) => {
      const data = entry.data();
      return {
        id: entry.id,
        title: data.title || "",
        description: data.description || "",
        version: data.version || "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    })
    .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
    .slice(0, 50);
}
