import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { listProducts } from "@/server/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const products = await listProducts(await getDb());
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/tienda`, changeFrequency: "daily", priority: 0.9 },
    ...products.map(p => ({ url: `${base}/producto/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
