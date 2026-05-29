export function GenerateLogPrefix(module: string, method: string): string {
    return `[${module}::${method}]`;
}