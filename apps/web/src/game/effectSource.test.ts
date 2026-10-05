import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import {
  effectActivationFromEvent,
  effectActivationTrack,
  effectActivationPreparationMs,
  trashEffectCardFromSources,
  type EffectSourceLookup,
  type EffectActivation,
} from "./effectSource";

const activated: ServerEvent = {
  kind: "effectActivated",
  seat: 1,
  sourceCardId: "BT1-090",
  effectKey: "main-1",
  description: "Gain 2 memory.",
};

const onField: EffectSourceLookup = () => ({ zone: "field", permanentId: "p-9" });
const nowhere: EffectSourceLookup = () => undefined;

describe("trashEffectCardFromSources", () => {
  const buried: EffectActivation = { key: 3, seat: 0, cardId: "ST1-02", site: { zone: "trash", instanceId: "buried" } };
  const trash = [
    { cardId: "ST1-02", instanceId: "buried", artId: "own-alternate" },
    { cardId: "ST1-02", instanceId: "another-copy", artId: "other-alternate" },
    { cardId: "ST1-03", instanceId: "top", artId: "top-art" },
  ];
  it("keeps the buried source's physical copy and alternate art rather than the top card", () => {
    expect(trashEffectCardFromSources([buried], 0, trash)).toEqual({
      key: 3,
      cardId: "ST1-02",
      instanceId: "buried",
      artId: "own-alternate",
      linked: undefined,
    });
    expect(trash.map((card) => card.instanceId)).toEqual(["buried", "another-copy", "top"]);
  });
  it("keeps the same physical occurrence across clause reading without selecting another seat", () => {
    expect(trashEffectCardFromSources([buried], 1, trash)).toBeUndefined();
    expect(trashEffectCardFromSources([{ ...buried, linked: true }], 0, trash)).toEqual({
      key: 3,
      cardId: "ST1-02",
      instanceId: "buried",
      artId: "own-alternate",
      linked: true,
    });
  });
});

describe("effectActivationPreparationMs", () => {
  it("allows clause reading during the final trash shrink while respecting longer configured holds", () => {
    expect(effectActivationPreparationMs({ zone: "trash", instanceId: "buried" }, 720)).toBe(750);
    expect(effectActivationPreparationMs({ zone: "trash", instanceId: "buried" }, 100)).toBe(750);
    expect(effectActivationPreparationMs({ zone: "trash", instanceId: "buried" }, 1200)).toBe(1200);
    expect(effectActivationPreparationMs({ zone: "field", permanentId: "p1" }, 100)).toBe(100);
    expect(effectActivationPreparationMs({ zone: "hand", instanceId: "h1" }, 540)).toBe(540);
    expect(effectActivationPreparationMs({ zone: "hand", instanceId: "h1" }, 100)).toBe(500);
    expect(effectActivationPreparationMs({ zone: "hand", instanceId: "h1" }, 100, 0.55)).toBe(275);
    expect(effectActivationPreparationMs({ zone: "hand", instanceId: "h1" }, 396, 0.55)).toBe(396);
    expect(effectActivationPreparationMs({ zone: "trash", instanceId: "buried" }, 396, 0.55)).toBeCloseTo(412.5, 8);
  });
});

describe("effectActivationFromEvent", () => {
  it("locates the source and carries its zone", () => {
    expect(effectActivationFromEvent(activated, 3, onField)).toEqual({
      key: 3,
      seat: 1,
      cardId: "BT1-090",
      site: { zone: "field", permanentId: "p-9" },
    });
  });

  it("plays nothing when the source cannot be found on the board", () => {
    expect(effectActivationFromEvent(activated, 1, nowhere)).toBeNull();
  });

  it("does not focus a direct Main completion receipt after declining processing", () => {
    expect(effectActivationFromEvent({ ...activated, receiptOnly: true }, 1, onField)).toBeNull();
  });

  it("ignores every other event", () => {
    const resolved: ServerEvent = {
      kind: "effectResolved",
      seat: 0,
      sourceCardId: "BT1-090",
      effectKey: "k",
      description: "d",
    };
    expect(effectActivationFromEvent(resolved, 1, onField)).toBeNull();
  });
});

describe("effectActivationTrack", () => {
  it("keys a field source by its permanent and a loose card by its instance", () => {
    expect(effectActivationTrack({ key: 1, seat: 0, cardId: "c", site: { zone: "field", permanentId: "p" } })).toBe(
      "effectSource-field-p",
    );
    expect(effectActivationTrack({ key: 1, seat: 0, cardId: "c", site: { zone: "trash", instanceId: "i" } })).toBe(
      "effectSource-trash-i",
    );
  });
});
