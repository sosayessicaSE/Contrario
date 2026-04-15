import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: `output: "standalone"` can fail on Windows/OneDrive with EPERM during symlink tracing.
  // Docker/Railway builds still use `pnpm build` + `next start` with a full `.next` output.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
