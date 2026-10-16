const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

//Helper function to safely parse the limit and keep it within the max
function sanitiseLimit(limitValue) {
  const parsed = parseInt(limitValue, 10);
  if (isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT); // Enforce max limit of 50
}

// Helper to safely parse page numbers
function sanitisePage(pageValue) {
  const parsed = parseInt(pageValue, 10);
  if (isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

// Function to decode the cursor from base64. This enables us to send just one string that contains a cursor that tells us exactly where the person is
export function decodeCursor(cursorString) {
  // If no cursor is provided, return a safe default state
  if (!cursorString) {
    return {
      type: "CURSOR",
      // We don't want to assume they are on phase 2 as they might be trying to search two terms and therefore be phase one
      // phase: "SECONDARY", // Phase 2 as we presume that they are doing a single term search which is our second phase
      limit: DEFAULT_LIMIT,
    };
  }

  try {
    // 1. Decode Base64 string into raw text, then parse as JSON
    const jsonString = Buffer.from(cursorString, "base64").toString("utf-8");
    const decoded = JSON.parse(jsonString);

    // Being a little more specific if there is an error
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      Array.isArray(decoded)
    ) {
      throw new Error("Invalid cursor shape");
    }

    //2. Determine type based on which fields are populated
    if (
      decoded.page > 0 ||
      decoded.type === "OFFSET" ||
      decoded.type === "PAGE"
    ) {
      return {
        type: "OFFSET",
        phase: ["PRIMARY", "SECONDARY"].includes(decoded.phase)
          ? decoded.phase
          : null, // If they don't specify the phase then we will work it out in the main function
        page: sanitisePage(decoded.page), // Default to the first page if they dont specify one, but they do specify they want paged results
        limit: sanitiseLimit(decoded.limit),
      };
    }

    // 3. Otherwise, treat as standard cursor-based keyset pagination
    // Preferable to be cursor as it is more flexible and quicker
    return {
      type: "CURSOR",
      phase: ["PRIMARY", "SECONDARY"].includes(decoded.phase)
        ? decoded.phase
        : null, // If they don't specify the phase then we will work it out in the main function
      id: typeof decoded.id === "string" ? decoded.id : null, // Handling if we aren't given a cursor id
      limit: sanitiseLimit(decoded.limit),
    };
  } catch (err) {
    // Gracefully fall back if someone sends a malformed or tampered cursor string
    return {
      type: "CURSOR",
      // phase: "SECONDARY",
      limit: DEFAULT_LIMIT,
    };
  }
}

// This will be our encoder - taking the type, current phase, id (if necessary) and limit and turn it into a base64 string
export function encodeCursor(cursorInfo) {
  const cursorString = JSON.stringify(cursorInfo);
  const cursorEncoded = Buffer.from(cursorString, "utf-8").toString("base64");
  return cursorEncoded;
}
