import './globals.css';

export const viewport = { themeColor: '#232620' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" id="top">
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Manrope:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
