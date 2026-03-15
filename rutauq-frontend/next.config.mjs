/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — builds to ./out, synced to S3 + served via CloudFront.
  // Dynamic routes use generateStaticParams() returning [] so Next.js generates
  // an empty shell; client-side routing + CloudFront 404→index.html handles the rest.
  output: "export",

  // next/image optimization requires a server; disable it for static export.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
