import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

        {/* Share sheet / OG meta */}
        <meta property="og:title" content="CocoPay 🥥" />
        <meta property="og:description" content="Pay with coconuts" />
        <meta property="og:type" content="website" />
        <meta name="apple-mobile-web-app-title" content="CocoPay 🥥" />
        <meta name="apple-mobile-web-app-capable" content="yes" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
