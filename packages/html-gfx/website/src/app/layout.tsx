import './global.css'
import { ReactQueryProvider } from '@/lib/query/react-query-provider'

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
      <body className="bg-gray-900 text-gray-100">
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  )
}
