export function decodeCursor(cursorString) {
    // If no cursor is provided, return a safe default state
    if (!cursorString) {
        return {
            type: 'CURSOR',
            phase: 'SECONDARY',
            limit: 10
        };
    }

    try {
        // 1. Decode Base64 string into raw text, then parse as JSON
        const jsonString = Buffer.from(cursorString, 'base64').toString('utf-8');
        const decoded = JSON.parse(jsonString);

        //2. Determine type based on which fields are populated
        if (decoded.page > 0 || decoded.type === 'OFFSET' || decoded.type === 'PAGE') {
            return {
                type: 'OFFSET',
                page: parseInt(decoded.page, 10) || 1,
                limit: parseInt(decoded.limit, 10) || 10,
            };
        }

        // 3. Otherwise, treat as standard cursor-based keyset pagination
        return {
            type: 'CURSOR',
            phase: 
        }
    }
}