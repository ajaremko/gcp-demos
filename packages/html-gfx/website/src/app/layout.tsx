import './global.css'

export const metadata = {
  title: 'html-gfx',
  description: 'html-gfx website',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-100">{children}</body>
    </html>
  )
}
