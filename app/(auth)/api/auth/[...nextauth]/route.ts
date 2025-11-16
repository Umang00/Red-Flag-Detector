// biome-ignore lint/performance/noBarrelFile: "Required"
export const runtime = "nodejs"; // Force Node.js runtime for auth with database/bcrypt
export { GET, POST } from "@/app/(auth)/auth";
