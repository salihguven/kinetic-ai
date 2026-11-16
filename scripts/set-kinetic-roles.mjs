import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccount = JSON.parse(
  readFileSync(new URL("../secrets/service-account.json", import.meta.url), "utf8")
);
serviceAccount.private_key = serviceAccount.private_key?.replace(/\\n/g, "\n");

const appName = "kinetic-role-assignment";
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
}, appName);
const auth = getAuth(app);

const FOUNDER_EMAIL = "minecraftbruh5050@gmail.com";
const ADMIN_EMAIL = "hasansungur655@gmail.com";

const founder = await auth.getUserByEmail(FOUNDER_EMAIL);
const admin = await auth.getUserByEmail(ADMIN_EMAIL);

if (founder.uid === admin.uid) {
  throw new Error("Kurucu ve admin e-posta adresleri farklı hesaplara ait olmalı.");
}

async function assignClaims(user, claims) {
  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    ...claims,
  });
  const updated = await auth.getUser(user.uid);
  return updated.customClaims || {};
}

const founderClaims = await assignClaims(founder, {
  admin: true,
  founder: true,
  tester: false,
});
const adminClaims = await assignClaims(admin, {
  admin: true,
  founder: false,
  tester: false,
});

console.log("Yetkiler yalnızca belirtilen iki hesaba atandı.");
console.log(`${FOUNDER_EMAIL}: founder=${founderClaims.founder === true}, admin=${founderClaims.admin === true}`);
console.log(`${ADMIN_EMAIL}: admin=${adminClaims.admin === true}, founder=${adminClaims.founder === true}`);
