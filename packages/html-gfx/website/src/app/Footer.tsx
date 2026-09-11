import { siGithub } from 'simple-icons'

const REPO_URL =
  'https://github.com/ajaremko/gcp-demos/tree/main/packages/html-gfx'

export function Footer() {
  return (
    <footer className="w-full max-w-3xl border-t border-gray-700 pt-8 text-center">
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <title>{siGithub.title}</title>
          <path d={siGithub.path} />
        </svg>
        View on GitHub
      </a>
      <p className="mt-2 text-xs text-gray-500">
        html-gfx is part of a larger monorepo of demos.
      </p>
    </footer>
  )
}
