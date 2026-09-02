import { convertLexicalToHTMLAsync } from '@payloadcms/richtext-lexical/html-async'
import type { CollectionConfig } from 'payload'

import { pinoLogger } from '../logging/pino'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'publishedDate'],
  },
  access: {
    // Authenticated (admin) requests see everything, including drafts.
    // Anonymous requests (the astro site) only ever see published posts.
    read: ({ req }) => {
      if (req.user) return true
      return { _status: { equals: 'published' } }
    },
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'publishedDate',
      type: 'date',
      required: true,
    },
    {
      // Rendered HTML of `content`, computed on read so the API hands back
      // ready-to-render markup - the astro site never has to understand
      // Lexical's JSON format.
      name: 'contentHTML',
      type: 'text',
      virtual: true,
      admin: {
        hidden: true,
      },
      hooks: {
        afterRead: [
          async ({ siblingData }) => {
            if (!siblingData.content) return ''
            pinoLogger.trace(
              { id: siblingData.id },
              'converting Lexical content to HTML',
            )
            try {
              return await convertLexicalToHTMLAsync({ data: siblingData.content })
            } catch (err) {
              // Degrade gracefully - one post with malformed content
              // shouldn't fail the whole read. contentHTML just comes back
              // empty for this post until the content is fixed.
              pinoLogger.warn(
                { err, id: siblingData.id },
                'failed to convert Lexical content to HTML',
              )
              return ''
            }
          },
        ],
      },
    },
  ],
}
