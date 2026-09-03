import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'filename',
  },
  // Hero images are meant to be publicly visible on the blog - without
  // this, Payload's default access (authenticated users only) silently
  // blocks relation population for anonymous requests, so `posts.heroImage`
  // always came back as an unpopulated raw ID for the public site.
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
