import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
      target: { filter: { digivolutionCardsAtMost: 1 } },
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
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("twoSources").permanentId]);
    expect(s.perm("twoSources").isSuspended).toBe(false);
  });

  it("Q2622 naturally suspends by stack-count on a non-DNA digivolution without the DNA-only lock", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-018", as: "base" }],
          hand: [{ card: "BT16-025", as: "paildramon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "noSources" },
            { card: "BT1-010", as: "oneSource", under: ["BT1-011"] },
            { card: "BT1-011", as: "twoSources", under: ["BT1-009", "BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-025");

    expect(s.perm("noSources").isSuspended).toBe(true);
    expect(s.perm("oneSource").isSuspended).toBe(true);
    expect(s.perm("twoSources").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("noSources"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("oneSource"), "unsuspend")).toBe(false);
  });

  it("naturally suspends an opposing target when attacking once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-025", as: "paildramon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("naturally unsuspends itself when its once-per-turn attack effect cannot suspend", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-025", as: "paildramon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("paildramon").isSuspended === false);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("paildramon").isSuspended).toBe(false);
  });
});
