import { StyledComponentsRegistry } from '@/lib/styled-components-registry'
import { GlobalStyles } from '@/lib/global-styles'

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
          <GlobalStyles />
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}
