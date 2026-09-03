import { defineLiveCollection } from 'astro:content'
import { postsLoader, blogPostSchema } from './loaders/posts'

const blog = defineLiveCollection({
  loader: postsLoader,
  schema: blogPostSchema,
})

export const collections = { blog }
