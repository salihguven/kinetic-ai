
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccount = JSON.parse(
  readFileSync(
    new URL("../secrets/service-account.json", import.meta.url),
    "utf8"
  )
);

const app = getApps()[0] || initializeApp({
  credential: cert(serviceAccount),
  projectId: "kineticai-4a5d6",
});

const auth = getAuth(app);

const ADMIN_EMAIL = "minecraftbruh5050@gmail.com";
const TESTER_EMAIL = "hasansungur655@gmail.com";

const adminUser = await auth.getUserByEmail(ADMIN_EMAIL);
const testerUser = await auth.getUserByEmail(TESTER_EMAIL);

let pageToken;
let count = 0;

do {
  const page = await auth.listUsers(1000, pageToken);

  for (const user of page.users) {
    const isAdmin = user.uid === adminUser.uid;
    const isTester = user.uid === testerUser.uid;

    const claims = {
      ...(user.customClaims || {}),
      admin: isAdmin,
      tester: isTester,
    };

    await auth.setCustomUserClaims(user.uid, claims);

    if (isAdmin) {
      console.log("ADMIN:", user.email);
    }

    if (isTester) {
      console.log("TESTER:", user.email);
    }

    count++;
  }

  pageToken = page.pageToken;
} while (pageToken);

console.log("Yetkiler güncellendi.");
console.log("Kontrol edilen hesap sayısı:", count);

const check = await auth.getUserByEmail(
  "minecraftbruh5050@gmail.com"
);

console.log("ADMIN CLAIM:", check.customClaims?.admin);
console.log("TESTER CLAIM:", check.customClaims?.tester);