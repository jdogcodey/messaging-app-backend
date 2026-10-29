import { decodeCursor, encodeCursor } from "../controllers/cursorController";

describe("Cursor Controller Tests", () => {
  it("Encode and decode loop works", () => {
    const ourCursor = {
      type: "OFFSET",
      page: 3,
      limit: 25,
    };
    const encodedCursor = encodeCursor(ourCursor);
    const decodedCursor = decodeCursor(encodedCursor);
    expect(decodedCursor.type).toBe("OFFSET");
    expect(decodedCursor.page).toBe(3);
    expect(decodedCursor.limit).toBe(25);
  });
  it("Return default when no cursor is provided", () => {
    const defaultReturn = decodeCursor();
    expect(defaultReturn.type).toBe("CURSOR");
    expect(defaultReturn.limit).toBe(10);
  });
  it("Make me immune to negative numbers - ew", () => {
    const encodedLimit = encodeCursor({
      type: "OFFSET",
      // phase: "SECONDARY",
      page: 12,
      limit: -13,
    });
    const negativeLimit = decodeCursor(encodedLimit);
    // expect(negativeLimit).toEqual({
    //   type: "OFFSET",
    //   phase: "SECONDARY",
    //   page: 12,
    //   limit: 10,
    // });
    expect(negativeLimit.type).toBe("OFFSET");
    expect(negativeLimit.page).toBe(12);
    expect(negativeLimit.limit).toBe(10);
    const encodedPage = encodeCursor({
      type: "OFFSET",
      // phase: "PRIMARY",
      page: -4,
      limit: 15,
    });
    const negativePage = decodeCursor(encodedPage);
    // expect(negativePage).toEqual({
    //   type: "OFFSET",
    //   phase: "PRIMARY",
    //   page: 1,
    //   limit: 15,
    // });
    expect(negativePage.type).toBe("OFFSET");
    expect(negativePage.page).toBe(1);
    expect(negativePage.limit).toBe(15);
  });
  it("Limit the maximum - or maximum the limit", () => {
    const encodedMax = encodeCursor({
      type: "CURSOR",
      // phase: "SECONDARY",
      limit: 500,
      id: "123",
    });
    const maxLimit = decodeCursor(encodedMax);
    // expect(maxLimit).toEqual({
    //   type: "CURSOR",
    //   phase: "SECONDARY",
    //   limit: 50,
    //   id: "123",
    // });
    expect(maxLimit.type).toBe("CURSOR");
    expect(maxLimit.id).toBe("123");
    expect(maxLimit.limit).toBe(50);
  });
  it.only("Sanitise - ew", () => {
    const encodedSanitiseCursor = encodeCursor({
      type: "CURSO",
      // phase: "PRIMARY",
      id: "123",
      limit: 14,
    });
    const sanitiseCursor = decodeCursor(encodedSanitiseCursor);
    // expect(sanitiseCursor).toEqual({
    //   type: "CURSOR",
    //   phase: "PRIMARY",
    //   id: "123",
    //   limit: 14,
    // });
    expect(sanitiseCursor.type).toBe("CURSOR");
    expect(sanitiseCursor.id).toBe("123");
    expect(sanitiseCursor.limit).toBe(14);
    const encodedSanitiseOffset = encodeCursor({
      type: "OFF",
      page: 1,
      limit: 20,
    });
    const sanitiseOffset = decodeCursor(encodedSanitiseOffset);
    // expect(sanitiseOffset).toEqual({
    //   type: "OFFSET",
    //   phase: "SECONDARY",
    //   page: 1,
    //   limit: 20,
    // });
    expect(sanitiseOffset.type).toBe("OFFSET");
    expect(sanitiseOffset.page).toBe(1);
    expect(sanitiseOffset.limit).toBe(20);
  });
  it("Return defaults if the string is broken", () => {
    const brokenDefaults = decodeCursor("123");
    expect(brokenDefaults).toEqual({
      type: "CURSOR",
      phase: "SECONDARY",
      limit: 10,
    });
  });
});
