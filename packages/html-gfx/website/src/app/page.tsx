import Link from 'next/link'

import { About } from './About'
import { TechStack } from './TechStack'
import { FAQ } from './FAQ'

export default function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-16 px-6 py-16">
      <section className="flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">html-gfx</h1>
        <p className="text-gray-400">
          Design social cards, thumbnails, and more in a live editor, rendered
          pixel-perfect in the cloud.
        </p>
        <Link
          href="/create"
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white"
        >
          Create a graphic
        </Link>
      </section>

      <div className="flex w-full max-w-3xl flex-col gap-10">
        <About />
        <FAQ />
        <TechStack />
      </div>
    </main>
  )
}
