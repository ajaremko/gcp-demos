import Link from 'next/link'

export default function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">html-gfx</h1>
      <Link
        href="/create"
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white"
      >
        Create a graphic
      </Link>
    </main>
  )
}
