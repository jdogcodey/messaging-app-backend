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
    const encodedPage = encodeCursor({
      type: "OFFSET",
      phase: "PRIMARY",
      page: -4,
      limit: 15,
    });
    const negativePage = decodeCursor(encodedPage);
    expect(negativePage).toEqual({
      type: "OFFSET",
      phase: "PRIMARY",
      page: 1,
      limit: 15,
    });
  });
  it("Limit the maximum - or maximum the limit", () => {
    const encodedMax = encodeCursor({
      type: "CURSOR",
      phase: "SECONDARY",
      limit: 500,
      id: "123",
    });
    const maxLimit = decodeCursor(encodedMax);
    expect(maxLimit).toEqual({
      type: "CURSOR",
      phase: "SECONDARY",
      limit: 50,
      id: "123",
    });
  });
  //   it("Sanitise - ew");
  //   it("Return defaults if info doesnt make sense");
});
