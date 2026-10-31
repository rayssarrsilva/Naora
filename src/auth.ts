import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db/client';

declare module 'next-auth' {
  interface Session {
    user: { id: string; isDemo: boolean; name?: string | null; email?: string | null };
  }
}

/** Demo accounts end in this domain, so they are easy to find and clean up. */
export const demoEmailDomain = 'demo.naora.app';

/** Google sign-in is offered only when its keys are set (production). */
export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/** One-click demo, so recruiters can try the signed-in area. On unless DEMO_LOGIN=off. */
export const demoEnabled = process.env.DEMO_LOGIN !== 'off';

/**
 * A production build refuses to sign anyone in without AUTH_SECRET (generate one with
 * `npx auth secret`). `npm run dev` gets a fixed secret so it works out of the box.
 */
const secret =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === 'production' ? undefined : 'naora-dev-secret-do-not-use-in-production');

const providers: NextAuthConfig['providers'] = [];
if (googleEnabled) providers.push(Google);
if (demoEnabled) {
  providers.push(
    Credentials({
      id: 'demo',
      name: 'Demo',
      credentials: {},
      // Each click is a brand-new, empty account: one visitor never sees another visitor's data.
      authorize: async () => {
        const id = crypto.randomUUID().slice(0, 8);
        return db().user.create({
          data: { email: `demo-${id}@${demoEmailDomain}`, name: 'Conta demo' },
          select: { id: true, email: true, name: true },
        });
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret,
  trustHost: true,
  // Only used by Google sign-in, to link the Google account to a User row.
  adapter: process.env.DATABASE_URL ? PrismaAdapter(db()) : undefined,
  // JWT sessions: no session table, and the credentials (demo) provider requires it.
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: '/pt/entrar' },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.sub);
      session.user.isDemo = String(session.user.email).endsWith(`@${demoEmailDomain}`);
      return session;
    },
  },
});

/** The signed-in user's id, or null. */
export async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}
