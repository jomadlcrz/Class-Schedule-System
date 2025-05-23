import { SessionProvider, useSession } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";
import ProfileSelectionModal from '@/components/ProfileSelectionModal';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <Head>
        <title>Class Schedule</title>
        <meta name="description" content="Manage your schedule efficiently" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ProfileSelectionModal />
      <Component {...pageProps} />
    </SessionProvider>
  );
}