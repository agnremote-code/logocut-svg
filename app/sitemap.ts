import type { MetadataRoute } from "next";
import { landingPages } from "@/lib/landing-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const converterRoutes = landingPages.map((page) => ({
    url: `https://www.logocutsvg.com/${page.slug}`,
    lastModified: now,
    priority: 0.86,
  }));

  return [
    {
      url: "https://www.logocutsvg.com",
      lastModified: now,
      priority: 1,
    },
    ...converterRoutes,
    {
      url: "https://www.logocutsvg.com/privacy",
      lastModified: now,
      priority: 0.3,
    },
    {
      url: "https://www.logocutsvg.com/terms",
      lastModified: now,
      priority: 0.3,
    },
  ];
}
