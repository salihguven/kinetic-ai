import PublicLanding from "@/components/PublicLanding";

export const metadata = {
  title: "KineticAI by True Kinetic Studios | AI çalışma alanı",
  description:
    "Kendi AI sağlayıcılarını tek bir çalışma alanında kullan. KineticAI ile sohbet et, web kaynaklarını doğrula, notlarını düzenle ve görevlerini planla.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "KineticAI by True Kinetic Studios",
    description: "AI sohbeti, kaynaklarla çalışma ve görev planlama için bağımsız çalışma alanı.",
    type: "website",
    locale: "tr_TR",
  },
};

export default function Page() {
  return <PublicLanding />;
}
