import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="no-js">
      <Head>
        <style>{`
          .no-js {
            visibility: hidden;
          }
          .js-loading {
            opacity: 0;
            transition: opacity 0.3s ease-in;
          }
          .js-loaded {
            opacity: 1;
          }
        `}</style>
      </Head>
      <body className="antialiased bg-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
