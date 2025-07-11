import type {NextConfig} from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // This is needed to get gif.js to work
    if (!isServer) {
        config.resolve.alias['gif.js/src/GIF'] = path.resolve(__dirname, 'node_modules/gif.js/src/GIF.js');
    }

    config.module.rules.push({
        test: /gif\.worker\.js$/,
        type: 'asset/resource',
        generator: {
            filename: 'static/chunks/[name].[hash][ext]'
        }
    });

    return config;
  }
};

export default nextConfig;
