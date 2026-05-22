/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
