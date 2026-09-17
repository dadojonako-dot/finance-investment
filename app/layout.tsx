import './globals.css';

export const metadata = { title: 'Финансы и инвестиция', description: 'Учет финансов, криптовалют и инвестиций' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
