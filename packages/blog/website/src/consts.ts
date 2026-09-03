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
export const AUTHOR_TAGLINE = 'A demo showcasing a real, end-to-end blog stack.'
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

// Sidebar "Built with" row - the technologies behind the whole blog
// stack (website, admin/CMS, and infra are separate packages/blog/*
// projects), not just this Astro site.
export const BUILT_WITH = [
  {
    name: 'simple-icons:typescript' as const,
    label: 'TypeScript',
    href: 'https://www.typescriptlang.org',
  },
  {
    name: 'simple-icons:react' as const,
    label: 'React',
    href: 'https://react.dev',
  },
  {
    name: 'simple-icons:nodedotjs' as const,
    label: 'Node.js',
    href: 'https://nodejs.org',
  },
  {
    name: 'simple-icons:astro' as const,
    label: 'Astro',
    href: 'https://astro.build',
  },
  {
    name: 'simple-icons:nextdotjs' as const,
    label: 'Next.js',
    href: 'https://nextjs.org',
  },
  {
    name: 'simple-icons:payloadcms' as const,
    label: 'Payload CMS',
    href: 'https://payloadcms.com',
  },
  {
    name: 'simple-icons:sqlite' as const,
    label: 'SQLite',
    href: 'https://www.sqlite.org',
  },
  {
    name: 'simple-icons:docker' as const,
    label: 'Docker',
    href: 'https://www.docker.com',
  },
  {
    name: 'simple-icons:nginx' as const,
    label: 'nginx',
    href: 'https://nginx.org',
  },
  {
    name: 'simple-icons:googlecloud' as const,
    label: 'Google Cloud',
    href: 'https://cloud.google.com',
  },
  {
    name: 'simple-icons:pulumi' as const,
    label: 'Pulumi',
    href: 'https://www.pulumi.com',
  },
]
