// src/app/api/moderation/status/route.js
import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebaseServer";
import { getUserPenaltyStatus } from "@/lib/moderation";

export async function GET(request) {
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const firebaseUser = await verifyFirebaseToken(idToken);
  if (!firebaseUser) {
    return NextResponse.json({ blocked: false }, { status: 401 });
  }

  const penalty = getUserPenaltyStatus(firebaseUser.uid);
  return NextResponse.json(penalty);
}