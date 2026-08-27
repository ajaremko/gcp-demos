export function resolveLogLevel(): string {
	return (
		process.env.LOG_LEVEL ??
		(process.env.NODE_ENV === 'production' ? 'info' : 'trace')
	);
}
