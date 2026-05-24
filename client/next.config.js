/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  distDir: process.env.NODE_ENV === 'development' ? '.next' : 'out',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
