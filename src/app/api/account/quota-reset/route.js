import { handleQuotaReset } from "@/lib/quotaResetHandler";
import { resetMonthlyQuota, verifyFirebaseToken } from "@/lib/firebaseServer";
import { checkRateLimit } from "@/lib/security";

export async function POST(request) {
  return handleQuotaReset(request, {
    checkRateLimit,
    verifyFirebaseToken,
    resetMonthlyQuota,
  });
}
