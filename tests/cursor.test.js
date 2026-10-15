import { decodeCursor, encodeCursor } from "../controllers/cursorController";

describe("Cursor Controller Tests", () => {
  it("Encode and decode loop works", () => {
    const ourCursor = {
      type: "OFFSET",
      phase: "PRIMARY",
      page: 3,
      limit: 25,
    };
    const encodedCursor = encodeCursor(ourCursor);
    const decodedCursor = decodeCursor(encodedCursor);
    expect(decodedCursor).toEqual(ourCursor);
  });
  it("Return default when no cursor is provided", () => {
    const defaultReturn = decodeCursor();
    expect(defaultReturn).toEqual({
      type: "CURSOR",
      phase: "SECONDARY",
      limit: 10,
    });
  });
  it("Make me immune to negative numbers - ew", () => {
    const encodedLimit = encodeCursor({
      type: "OFFSET",
      phase: "SECONDARY",
      page: 12,
      limit: -13,
    });
    const negativeLimit = decodeCursor(encodedLimit);
    expect(negativeLimit).toEqual({
      type: "OFFSET",
      phase: "SECONDARY",
      page: 12,
      limit: 10,
    });
  });
  //   it("Limit the maximum - or maximum the limit");
  //   it("Sanitise - ew");
  //   it("Return defaults if info doesnt make sense");
});
