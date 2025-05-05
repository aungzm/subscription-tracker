import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust the path if your authOptions are elsewhere

// Export handlers for GET and POST requests
// NextAuth handles all requests under /api/auth/* using these handlers
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
