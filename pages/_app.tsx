import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <Head>
        <title>Class Schedule</title>
        <meta name="description" content="Manage your schedule efficiently" />
        <style jsx global>{`
          .js-loading * {
            visibility: hidden;
          }
          .js-loaded * {
            visibility: visible;
          }
          noscript .js-loading * {
            visibility: visible;
          }
        `}</style>
      </Head>
      <div className="js-loading">
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}
export default MyApp;

