import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-035.js";
import "../BT1/BT1-055.js";

describe("EX6-035 Cherubimon", () => {
  it("has Blast Digivolve and Alliance and plays a level 4 or lower yellow/green Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDigivolve",
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Alliance");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { colors: ["Yellow", "Green"], levelComparison: { op: "lte", value: 4 } } },
    });
  });
  it("reduces an opposing Digimon by 4000 per other allied Digimon on play and digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -4000,
      scaling: { per: 1, unit: "cards", filter: { excludeSelf: true } },
    }));
  it("publicly plays a level-4 yellow/green Digimon from hand on paid play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-035", as: "cherub" },
            { card: "EX6-033", as: "rookie" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cherub").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId),
    ).toBe(true);
  });

  it("publicly reduces an opposing Digimon by 4000 for one other allied Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-035", as: "cherub" },
          { card: "BT1-009", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherub"));
    expect(s.perm("opponent").currentDP).toBe(before - 4000);
  });

  it("still resolves the Then reduction when the optional hand play is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "ally" }],
        hand: [
          { card: "EX6-035", as: "cherub" },
          { card: "EX6-033", as: "rookie" },
        ],
      },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    s.state.memory = 10;
    await s.ready();
    const before = s.perm("opponent").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cherub").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const decision = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("rookie").instanceId)).toBe(true);
    expect(s.perm("opponent").currentDP).toBe(before - 4000);
  });

  it("publicly scales the reduction to zero or two other allied Digimon", async () => {
    const none = setupEngine(
      {
        0: { hand: [{ card: "EX6-035", as: "cherub" }] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    none.state.memory = 7;
    await none.ready();
    const unchanged = none.perm("opponent").currentDP;

    expect(none.engine.applyIntent(0, { type: "playCard", instanceId: none.inst("cherub").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => none.perm("cherub") !== undefined && none.state.pendingDecision === undefined);

    expect(none.state.memory).toBe(0);
    expect(none.state.players[0]!.hand).toHaveLength(0);
    expect(none.state.players[0]!.battleArea).toHaveLength(1);
    expect(none.perm("opponent").currentDP).toBe(unchanged);

    const two = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "allyA" },
            { card: "BT1-010", as: "allyB" },
          ],
          hand: [{ card: "EX6-035", as: "cherub" }],
        },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    two.state.memory = 7;
    await two.ready();
    const before = two.perm("opponent").currentDP;

    expect(two.engine.applyIntent(0, { type: "playCard", instanceId: two.inst("cherub").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => two.perm("cherub") !== undefined && two.state.pendingDecision === undefined);

    expect(two.state.memory).toBe(0);
    expect(two.state.players[0]!.hand).toHaveLength(0);
    expect(two.state.players[0]!.battleArea).toHaveLength(3);
    expect(two.perm("opponent").currentDP).toBe(before - 8000);
  });

  it("finishes Then before the played Digimon On Play and defers zero-DP deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "ally" }],
          hand: [
            { card: "EX6-035", as: "cherub" },
            { card: "BT1-055", as: "child" },
          ],
        },
        1: { battleArea: [{ card: "EX6-031", as: "target", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetTopId = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cherub").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("child").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("child").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(3);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(false);

    const parentResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "EX6-035" && event.timing === "OnPlay",
    );
    const targetDeleted = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(targetTopId),
    );
    const childOnPlayResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-055" && event.timing === "OnPlay",
    );
    expect(parentResolved).toBeGreaterThanOrEqual(0);
    expect(targetDeleted).toBeGreaterThan(parentResolved);
    expect(childOnPlayResolved).toBeGreaterThan(targetDeleted);
  });

  it("publicly applies the same scaled reduction when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-034", as: "base" },
          { card: "BT1-009", as: "ally" },
        ],
        hand: [{ card: "EX6-035", as: "cherub" }],
      },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    s.state.memory = 3;
    await s.ready();
    const before = s.perm("opponent").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cherub").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX6-035" && s.state.pendingDecision === undefined);
    expect(s.perm("opponent").currentDP).toBe(before - 4000);
  });

  it("Blast Digivolves from a public Counter window and resolves Cherubimon's scaled DP effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-034", as: "antyla", suspended: true },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "EX6-035", as: "cherub" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "EX6-031", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const targetBefore = s.perm("attacker").currentDP;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("cherub").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("cherub").instanceId,
        ) && s.perm("attacker").currentDP === targetBefore - 4000,
    );
    expect(s.perm("attacker").currentDP).toBe(targetBefore - 4000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
