import { describe, expect, it } from "vitest";
import { validateSealedDeck } from "#shared/sealed/validateSealedDeck";

const mainDeck = Array.from({ length: 40 }, () => "BT3-103");
const pool = [...mainDeck, ...Array.from({ length: 6 }, () => "BT1-001")].map((cardId) => ({ cardId }));

describe("sealed pool conservation", () => {
  it("accepts owned copies of a restricted card without constructed copy limits", () => {
    expect(validateSealedDeck({ pool, mainDeck, eggDeck: [] })).toMatchObject({
      ok: true,
      sideboard: expect.any(Array),
    });
  });
  it.each([39, 41])("refuses a main deck of %i", (size) => {
    expect(validateSealedDeck({ pool, mainDeck: Array.from({ length: size }, () => "BT3-103"), eggDeck: [] }).ok).toBe(
      false,
    );
  });
  it.each([0, 5])("permits %i owned eggs", (size) => {
    expect(validateSealedDeck({ pool, mainDeck, eggDeck: Array.from({ length: size }, () => "BT1-001") }).ok).toBe(
      true,
    );
  });
  it("refuses six eggs", () => {
    expect(validateSealedDeck({ pool, mainDeck, eggDeck: Array.from({ length: 6 }, () => "BT1-001") }).ok).toBe(false);
  });
  it("refuses an unowned copy", () => {
    expect(validateSealedDeck({ pool: pool.slice(1), mainDeck, eggDeck: [] }).ok).toBe(false);
  });
  it("refuses unknown cards and wrong zones", () => {
    for (const cardId of ["fake", "BT1-001"]) {
      expect(
        validateSealedDeck({ pool: [...pool, { cardId }], mainDeck: [cardId, ...mainDeck.slice(1)], eggDeck: [] }).ok,
      ).toBe(false);
    }
    expect(validateSealedDeck({ pool, mainDeck, eggDeck: ["BT3-103"] }).ok).toBe(false);
  });
  it("does not multiply ownership by using a canonical ID and its alternate printing", () => {
    const printedPool = [{ cardId: "BT3-103", artId: "BT3-103_P1" }, ...pool.slice(1)];
    expect(validateSealedDeck({ pool: printedPool, mainDeck, eggDeck: [] }).ok).toBe(false);
    expect(
      validateSealedDeck({ pool: printedPool, mainDeck: ["BT3-103_P1", ...mainDeck.slice(1)], eggDeck: [] }),
    ).toMatchObject({ ok: true, mainDeck, mainDeckArts: ["BT3-103_P1", ...mainDeck.slice(1)] });
  });
});

it("accepts five owned copies and refuses a sixth that displaces another owned card", () => {
  const selected = [...Array<string>(5).fill("BT1-010"), ...Array<string>(35).fill("BT1-011")];
  const owned = selected.map((cardId) => ({ cardId }));
  expect(validateSealedDeck({ pool: owned, mainDeck: selected, eggDeck: [] }).ok).toBe(true);
  expect(validateSealedDeck({ pool: owned, mainDeck: [...selected.slice(0, 39), "BT1-010"], eggDeck: [] }).ok).toBe(
    false,
  );
});

it("allows a banned pull when the entire selected multiset is owned", () => {
  const selected = Array<string>(40).fill("BT5-109");
  expect(validateSealedDeck({ pool: selected.map((cardId) => ({ cardId })), mainDeck: selected, eggDeck: [] }).ok).toBe(
    true,
  );
});
