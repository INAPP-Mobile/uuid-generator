import { describe, it, expect } from "vitest";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function generateUuidV4(): string {
  const hex = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4";
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 0 + 8];
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

function generateUuidV7(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0");
  const hex = "0123456789abcdef";
  let random = "";
  for (let i = 0; i < 18; i++) {
    random += hex[(Math.random() * 16) | 0];
  }
  const variant = hex[(Math.random() * 4) | 0 + 8];
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${random.slice(0, 3)}-${variant}${random.slice(3, 6)}-${random.slice(6)}`;
}

describe("UUID v4", () => {
  it("matches UUID v4 regex", () => {
    const uuid = generateUuidV4();
    expect(uuid).toMatch(UUID_V4_REGEX);
  });

  it("version nibble is 4", () => {
    const uuid = generateUuidV4();
    expect(uuid[14]).toBe("4");
  });

  it("variant nibble is 8, 9, a, or b", () => {
    const uuid = generateUuidV4();
    expect("89ab").toContain(uuid[19]);
  });

  it("consecutive UUIDs are different", () => {
    const a = generateUuidV4();
    const b = generateUuidV4();
    expect(a).not.toBe(b);
  });
});

describe("UUID v7", () => {
  it("matches UUID v7 regex", () => {
    const uuid = generateUuidV7();
    expect(uuid).toMatch(UUID_V7_REGEX);
  });

  it("version nibble is 7", () => {
    const uuid = generateUuidV7();
    expect(uuid[14]).toBe("7");
  });

  it("variant nibble is 8, 9, a, or b", () => {
    const uuid = generateUuidV7();
    expect("89ab").toContain(uuid[19]);
  });

  it("consecutive UUIDs are different", () => {
    const a = generateUuidV7();
    const b = generateUuidV7();
    expect(a).not.toBe(b);
  });
});

describe("Bulk generation", () => {
  it("generates correct count of v4 UUIDs", () => {
    const count = 50;
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(generateUuidV4());
    }
    expect(uuids).toHaveLength(count);
    uuids.forEach((u) => expect(u).toMatch(UUID_V4_REGEX));
  });

  it("generates correct count of v7 UUIDs", () => {
    const count = 100;
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(generateUuidV7());
    }
    expect(uuids).toHaveLength(count);
    uuids.forEach((u) => expect(u).toMatch(UUID_V7_REGEX));
  });
});
