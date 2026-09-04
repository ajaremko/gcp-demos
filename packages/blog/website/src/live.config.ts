import { defineLiveCollection } from 'astro:content'
import { postsLoader, blogPostSchema } from './loaders/posts'
import { tagsLoader, tagSchema } from './loaders/tags'

const blog = defineLiveCollection({
  loader: postsLoader,
  schema: blogPostSchema,
})

const tags = defineLiveCollection({
  loader: tagsLoader,
  schema: tagSchema,
})

export const collections = { blog, tags }
