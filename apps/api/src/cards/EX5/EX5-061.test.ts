import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX5-061.js";

describe("EX5-061 Cerberusmon (X Antibody)", () => {
  it("plays a purple level 3 Digimon from trash without cost on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levels: [3] } },
    });
  });
  it("draws, trashes, and reactivates On Play when Cerberusmon or X Antibody is in the stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      {
        kind: "ReactivateEffect",
        fromTrigger: "OnPlay",
        count: 1,
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { match: "name", tokens: ["Cerberusmon"] },
              { match: "nameExact", tokens: ["X Antibody"] },
            ],
          },
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          cost: {
            kind: "deleteOwn",
            target: { count: 1, filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] } },
          },
        },
      ],
    });
  });

  it("plays a purple level 3 from trash through the public On Play intent", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-061", as: "source" }], trash: [{ card: "BT10-073", as: "candidate" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-073"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-073")).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT10-073")).toBe(false);
  });

  it("may decline the On Play revival when no effect is chosen", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-061", as: "source" }], trash: [{ card: "BT10-073", as: "candidate" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT10-073")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-073")).toBe(false);
  });

  it("reactivates On Play only for an exact X Antibody stack card", async () => {
    const resolve = async (stackCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT14-072", as: "base", under: [stackCard] }],
            hand: [
              { card: "EX5-061", as: "evolving" },
              { card: "BT1-010", as: "discard" },
            ],
            trash: [{ card: "BT10-073", as: "candidate" }],
            deck: ["BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      return s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-073");
    };

    expect(await resolve("BT9-109")).toBe(true);
    expect(await resolve("BT13-063")).toBe(false);
  });

  it("unsuspends once after deleting another Digimon through a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-072", as: "attacker", under: ["EX5-061"] },
            { card: "BT1-009", as: "sacrifice" },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sacrificeId = s.perm("sacrifice").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === sacrificeId)).toBe(false);
  });
});
