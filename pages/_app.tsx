import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
import "@/styles/globals.css";

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useEffect(() => {
    // Remove no-js class from html element
    document.documentElement.classList.remove('no-js');
    
    // Add js-loaded class to the loading div
    const loadingDiv = document.querySelector('.js-loading');
    if (loadingDiv) {
      loadingDiv.classList.add('js-loaded');
    }
  }, []);

  return (
    <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <Head>
        <title>Class Schedule</title>
        <meta name="description" content="Manage your schedule efficiently" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="js-loading">
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}
export default MyApp;

