/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "@langchain/langgraph",
      "@langchain/core",
      "@langchain/google-genai",
      "@langchain/tavily",
      "langchain",
    ],
  },
};

export default nextConfig;
