import type { CollectionConfig } from 'payload'

import { slugify } from '../utilities/slugify'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug'],
  },
  // Tags are part of the public blog - without this, Payload's default
  // access (authenticated users only) silently blocks relation population
  // for anonymous requests, so `posts.tags` comes back as unpopulated raw
  // IDs for the public site. Same trap already documented on Media.
  access: {
    read: () => true,
  },
  hooks: {
    // Collection-level rather than a field-level hook on `slug`: this runs
    // before field validation, so `slug` can stay `required` while still
    // being filled in for editors who leave it blank (the common case when
    // creating a tag inline from the Posts editor).
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (typeof data.slug === 'string' && data.slug.trim() !== '') {
          return { ...data, slug: slugify(data.slug) }
        }
        if (typeof data.name === 'string' && data.name.trim() !== '') {
          return { ...data, slug: slugify(data.name) }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Leave blank to derive from the name.',
      },
    },
  ],
}
