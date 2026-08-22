import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-025.js";
import "../index.js";

describe("BT16-025", () => {
  it("models Partition", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Partition" }] });
    expect(compiled.effects[3]).toMatchObject({ isInherited: true, keywords: [{ keyword: "Partition" }] });
  });

  it("suspends opposing Digimon and prevents unsuspending during DNA digivolution", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: expect.objectContaining({ count: "all" }),
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
      condition: { kind: "isDnaDigivolving" },
    });
  });

  it("DNA digivolves unsuspended, suspends opponents within the stack-count boundary, and locks unsuspend", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-018", as: "blueMaterial" },
          { card: "BT16-021", as: "greenMaterial" },
        ],
        hand: [{ card: "BT16-025", as: "paildramon" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "noSources" },
          { card: "BT1-010", as: "oneSource", under: ["BT1-011"] },
          { card: "BT1-011", as: "twoSources", under: ["BT1-009", "BT1-010"] },
        ],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueMaterial").permanentId, s.perm("greenMaterial").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-025"));

    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.isSuspended)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("noSources"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oneSource"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "unsuspend")).toBe(true);
  });
});
