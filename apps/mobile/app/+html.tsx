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

        <title>CocoPay</title>

        {/* Favicon — emoji SVG renders the coconut in the tab */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🥥</text></svg>" />

        {/* Share sheet / OG meta */}
        <meta property="og:title" content="CocoPay" />
        <meta property="og:description" content="Pay with coconuts" />
        <meta property="og:type" content="website" />
        <meta name="apple-mobile-web-app-title" content="CocoPay" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#1a1a1a" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
