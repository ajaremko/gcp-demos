import { defineLiveCollection } from 'astro:content';
import { ghostLoader, blogPostSchema } from './loaders/ghost';

const blog = defineLiveCollection({
	loader: ghostLoader,
	schema: blogPostSchema,
});

export const collections = { blog };
