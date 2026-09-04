export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ldrphotobooth.web.id';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cms', '/cms/*'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
