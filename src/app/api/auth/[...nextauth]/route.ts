import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

const wrappedHandler = async (req: any, context: any) => {
  let resolvedParams = null;
  try {
    if (context?.params) {
      resolvedParams = await context.params;
    }
  } catch (e) {
    console.error("Failed to resolve NextAuth route params:", e);
  }

  // Construct a new context object where params is already resolved.
  // This satisfies next-auth v4's expectations on Next.js 15+ without triggering async params warnings.
  const proxyContext = {
    ...context,
    params: resolvedParams,
  };

  return handler(req, proxyContext);
};

export { wrappedHandler as GET, wrappedHandler as POST };


