// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Sample Blog'
export const SITE_DESCRIPTION =
  'A sample showing a custom blog backed by a self-hosted CMS, deployed end to end to GCP.'
export const GITHUB_REPO_URL =
  'https://github.com/ajaremko/gcp-demos/tree/main/packages/blog'

// Sidebar identity - this is a demo/portfolio-style blog, not a real person,
// so these are placeholder values rather than CMS-backed content.
export const AUTHOR_NAME = 'Sample Author'
export const AUTHOR_TAGLINE =
  'A demo software engineer showcasing a real, end-to-end blog stack.'
export const AUTHOR_EMAIL = 'hello@example.com'

// Shared by the sidebar's icon links and the /contact page's list.
// `name` is an astro-icon Iconify identifier (see astro.config.mjs's
// `icon({ include: ... })` for the icon sets these are sourced from).
export const SOCIAL_LINKS = [
  {
    name: 'mdi:email-outline' as const,
    href: `mailto:${AUTHOR_EMAIL}`,
    label: 'Email',
  },
  {
    name: 'simple-icons:github' as const,
    href: 'https://github.com/ajaremko/gcp-demos',
    label: 'GitHub',
  },
  {
    name: 'simple-icons:linkedin' as const,
    href: 'https://www.linkedin.com',
    label: 'LinkedIn',
  },
]
