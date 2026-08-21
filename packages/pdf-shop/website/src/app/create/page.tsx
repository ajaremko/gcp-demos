import { PageShell } from '@/lib/ui'
import { FlowGrid } from '@/lib/ui/FlowGrid'

import { OrderDocumentPanel } from './OrderDocumentPanel'
import { WhatYouGetPanel } from './WhatYouGetPanel'

export default function DocumentSpecPage() {
  return (
    <PageShell>
      <FlowGrid>
        <OrderDocumentPanel />
        <WhatYouGetPanel />
      </FlowGrid>
    </PageShell>
  )
}
