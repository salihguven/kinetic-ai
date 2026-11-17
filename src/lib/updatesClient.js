import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizePublicUpdate } from "@/lib/updateContent";

export async function loadPublishedUpdates() {
  const updatesQuery = query(
    collection(db, "updates"),
    where("status", "==", "published"),
    limit(100)
  );
  const snapshot = await getDocs(updatesQuery);

  return snapshot.docs
    .map((entry) => normalizePublicUpdate(entry.id, entry.data()))
    .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
    .slice(0, 50);
}
