import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.logocutsvg.com",
      lastModified: new Date(),
      priority: 1,
    },
  ];
}
