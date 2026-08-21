import { Inter } from 'next/font/google'

import { StyledComponentsRegistry } from '@/lib/styled-components-registry'
import { GlobalStyles } from '@/lib/global-styles'
import { ReactQueryProvider } from '@/lib/react-query-provider'
import { SiteHeader } from '@/lib/SiteHeader'
import { SiteFooter } from '@/lib/SiteFooter'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata = {
  title: 'PDF Shop',
  description: 'A demo shop for generating and purchasing PDF documents.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <StyledComponentsRegistry>
          <ReactQueryProvider>
            <GlobalStyles />
            <SiteHeader />
            {children}
            <SiteFooter />
          </ReactQueryProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}
