// src/app/page.js
import HomeClient from "@/components/HomeClient";

export const metadata = {
  title: "KineticAI · Ücretsiz Açık Yapay Zeka Çalışma Alanı",
  description:
    "Kendi yapay zeka modellerinizi (OpenAI, Gemini, Groq, OpenRouter) tek bir arayüzde bağlayın. Sohbet edin, notlar çıkarın, görevlerinizi AI ile planlayın. Tamamen ücretsiz.",
};

export default function Page() {
  return <HomeClient />;
}