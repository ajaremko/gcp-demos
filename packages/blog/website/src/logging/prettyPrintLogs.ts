export function resolvePrettyPrintLogs(): boolean {
	const value = process.env.PRETTY_PRINT_LOGS;
	if (value === undefined) {
		return process.env.NODE_ENV !== 'production';
	}
	if (value === 'true') return true;
	if (value === 'false') return false;
	throw new Error(
		`PRETTY_PRINT_LOGS must be "true" or "false", got: "${value}"`,
	);
}
