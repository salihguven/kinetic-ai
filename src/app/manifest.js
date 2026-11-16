export default function manifest() {
  return {
    id: "/",
    name: "KineticAI by True Kinetic Studios",
    short_name: "KineticAI",
    description: "AI sohbeti, kaynaklarla çalışma ve görev planlama için açık çalışma alanı.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#09090b",
    theme_color: "#09090b",
    categories: ["productivity", "education", "utilities"],
    icons: [
      { src: "/icons/kineticai-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/kineticai-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/kineticai-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Yeni sohbet",
        short_name: "Yeni sohbet",
        url: "/app",
        icons: [{ src: "/icons/kineticai-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
