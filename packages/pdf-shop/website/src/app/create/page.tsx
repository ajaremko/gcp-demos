import { PageShell } from '@/lib/ui'
import { FlowGrid } from '@/lib/ui/FlowGrid'
import { ReturnHomeLink } from '@/lib/ui/ReturnHomeLink'

import { OrderDocumentPanel } from './OrderDocumentPanel'
import { WhatYouGetPanel } from './WhatYouGetPanel'

export default function DocumentSpecPage() {
  return (
    <PageShell>
      <FlowGrid>
        <div>
          <OrderDocumentPanel />
          <ReturnHomeLink />
        </div>
        <WhatYouGetPanel />
      </FlowGrid>
    </PageShell>
  )
}
