import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT8-024.js";
import "./BT8-024.js";

describe("BT8-024 Angemon", () => {
  it("encodes Recovery as targetless security-stack manipulation at activation time", () => {
    const replacement = compiled.effects[0]!.actions[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
          },
        },
      ],
    });
    expect(replacement).not.toHaveProperty("condition");
  });

  it("recovers before digivolving while you have 3 or fewer security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-024", as: "base" }],
        hand: [{ card: "BT1-038", as: "evolving" }],
        deck: ["BT8-033", "BT8-034"],
        security: ["BT8-035", "BT8-036", "BT8-037"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("does not recover when the digivolution is declared with 4 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-024", as: "base" }],
        hand: [{ card: "BT1-038", as: "evolving" }],
        deck: ["BT8-033", { card: "BT8-034", as: "wouldRecover" }],
        security: ["BT8-034", "BT8-035", "BT8-036", "BT8-037"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("wouldRecover").instanceId)).toBe(true);
  });

  it("returns an opposing level 3 when its host attacks with at least 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-030", as: "host", under: ["BT8-024"] }],
          security: ["BT8-034", "BT8-035", "BT8-036"],
        },
        1: {
          security: ["BT8-034"],
          battleArea: [
            { card: "BT8-033", as: "target" },
            { card: "BT8-039", as: "levelFour" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const targetId = s.perm("target").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("levelFour")).toBeDefined();
  });

  it("does not return a level 3 while its controller has only 2 security cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-030", as: "host", under: ["BT8-024"] }], security: ["BT8-034", "BT8-035"] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("digivolves from a yellow level-3 Digimon for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-034", as: "yellowBase" }],
        hand: [{ card: "BT8-024", as: "angemon" }],
        security: ["BT8-035", "BT8-036", "BT8-037", "BT8-038"],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("angemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("yellowBase").topCard.instanceId).toBe(s.inst("angemon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
