import { defineLiveCollection } from 'astro:content';
import { cmsLoader, blogPostSchema } from './loaders/cms';

const blog = defineLiveCollection({
	loader: cmsLoader,
	schema: blogPostSchema,
});

export const collections = { blog };
