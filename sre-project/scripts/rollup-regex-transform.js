/**
 * Rollup plugin to transform Unicode property escapes in regex patterns
 * to be compatible with older JavaScript engines (like Android's Node.js)
 */

export default function regexTransformPlugin() {
    return {
        name: 'regex-transform',

        transform(code, id) {
            // Skip node_modules that don't need transformation
            if (id.includes('node_modules') && !id.includes('gpt-tokenizer')) {
                return null;
            }

            // Check if the code contains problematic Unicode property escapes
            const hasUnicodePropertyEscapes = /\\p\{[LN]\}/g.test(code);

            if (!hasUnicodePropertyEscapes) {
                return null;
            }

            // Transform the specific problematic regex pattern
            // This regex is from the GPT tokenizer library
            const transformedCode = code.replace(
                /const\s+R50K_TOKEN_SPLIT_REGEX\s*=\s*\/'s\|'t\|'re\|'ve\|'m\|'ll\|'d\|\s*\?\\p\{L\}\+\|\s*\?\\p\{N\}\+\|\s*\?\[\^\\s\\p\{L\}\\p\{N\}\]\+\|\\s\+\(\?\!\\S\)\|\\s\+\/gu;/g,
                `const R50K_TOKEN_SPLIT_REGEX = /'s|'t|'re|'ve|'m|'ll|'d| ?[a-zA-Z]+| ?[0-9]+| ?[^\\s\\w]+|\\s+(?!\\S)|\\s+/g;`
            );

            // Also handle if it's defined differently
            let finalCode = transformedCode;

            // Replace \p{L} (Unicode letter) with [a-zA-Z] (ASCII letters)
            // Replace \p{N} (Unicode number) with [0-9] (ASCII digits)
            // This is a more general transformation
            if (finalCode.includes('\\p{L}') || finalCode.includes('\\p{N}')) {
                finalCode = finalCode
                    .replace(/\\p\{L\}/g, 'a-zA-Z')
                    .replace(/\\p\{N\}/g, '0-9')
                    // Remove the 'u' flag if it exists with these patterns
                    .replace(/\/([^\/]+)\/gu/g, (match, pattern) => {
                        // Only remove 'u' flag if pattern doesn't need it
                        if (!pattern.includes('\\u') && !pattern.includes('\\x')) {
                            return `/${pattern}/g`;
                        }
                        return match;
                    });
            }

            return {
                code: finalCode,
                map: null
            };
        }
    };
}
