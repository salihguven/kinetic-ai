export default function sitemap() {
  const base = "https://truekinetichub.com.tr";
  return ["/", "/updates", "/hakkimizda", "/iletisim", "/gizlilik-politikasi", "/kullanim-kosullari"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
