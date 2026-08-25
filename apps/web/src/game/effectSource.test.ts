import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { effectActivationFromEvent, effectActivationTrack, type EffectSourceLookup } from "./effectSource";

const activated: ServerEvent = {
  kind: "effectActivated",
  seat: 1,
  sourceCardId: "BT1-090",
  effectKey: "main-1",
  description: "Gain 2 memory.",
};

const onField: EffectSourceLookup = () => ({ zone: "field", permanentId: "p-9" });
const nowhere: EffectSourceLookup = () => undefined;

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
