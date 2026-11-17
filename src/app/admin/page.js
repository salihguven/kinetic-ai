
import AdminClient from "./AdminClient";

export const metadata = {
  title: "Sayfa bulunamadı",
  description: "Aradığınız sayfa bulunamadı.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}

