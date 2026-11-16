
import AdminClient from "./AdminClient";

export const metadata = {
  title: "Admin Paneli | KineticAI",
  description: "KineticAI yönetim paneli",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}

