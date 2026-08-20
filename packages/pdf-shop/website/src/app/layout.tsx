import { StyledComponentsRegistry } from '@/lib/styled-components-registry'
import { GlobalStyles } from '@/lib/global-styles'
import { ReactQueryProvider } from '@/lib/react-query-provider'

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
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <ReactQueryProvider>
            <GlobalStyles />
            {children}
          </ReactQueryProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}
