import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { cite } from "../../engine/conformance/_kb.js";
import { beforeEach, describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-10 Henry Wong", () => {
  beforeEach(() => {
    if (!getCardDefinition("ST17-10")?.effectText?.includes("in any order")) {
      throw new Error("Henry printed placement-order clause changed; review the ordering evidence");
    }
    cite(
      "comprehensive-0034",
      "Bracket-only Terriermon-line references require exact names",
      "c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2",
    );
  });
  it.each([
    ["Terriermon", "BT5-046", "ST17-05", "ST17-07"],
    ["Gargomon", "ST17-02", "EX4-035", "ST17-07"],
    ["Rapidmon", "ST17-02", "ST17-05", "EX4-036"],
  ])("refuses near-named %s before paying any processing component", async (_name, host, first, second) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: host, as: "host" },
            { card: "ST17-10", as: "henry" },
          ],
          trash: [
            { card: first, as: "first" },
            { card: second, as: "second" },
          ],
          hand: [{ card: "ST17-08", as: "mega" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const source = observe(s.engine).cardSource(s.perm("henry"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("ST17-10/"),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("henry").instanceId,
        effectKey: effect!.effectKey,
      }).ok,
    ).toBe(false);
    expect(s.perm("host").topCard.cardId).toBe(host);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("henry").topCard.cardId).toBe("ST17-10");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("mega").instanceId);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("offers all three processing cards for arbitrary bottom-stack ordering", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-02", as: "host" },
            { card: "ST17-10", as: "henry" },
          ],
          trash: [
            { card: "ST17-05", as: "gargomon" },
            { card: "ST17-07", as: "rapidmon" },
          ],
          hand: [{ card: "ST17-08", as: "mega" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const ids = [s.inst("henry").instanceId, s.inst("gargomon").instanceId, s.inst("rapidmon").instanceId];
    const source = observe(s.engine).cardSource(s.perm("henry"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("ST17-10/"),
    );
    if (!effect) throw new Error("Missing Henry declaration");
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: ids[0]!, effectKey: effect.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Rush") && s.state.pendingDecision === undefined);
    const order = s.decisions.find(({ req }) => req.kind === "orderCards" && req.sourceCardId === "ST17-10");
    expect(order?.req.options?.candidateInstanceIds).toEqual(expect.arrayContaining(ids));
    expect(order?.req.options?.candidateInstanceIds).toHaveLength(3);
  });

  it("gains 1 memory at the start of your Main Phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-10", as: "henry" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    s.state.memory = 5;
    const turn = s.engine.runOneTurn();
    await settle(() => s.events.some((event) => event.kind === "memoryChanged" && event.from === 5 && event.to === 6));

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "memoryChanged", from: 5, to: 6, reason: "gainMemory" }),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays itself from Security without paying its play cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST17-10", as: "henry" }, "BT1-090"] },
      1: { battleArea: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST17-10"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-10")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("places Henry, Gargomon, and Rapidmon under one Terriermon before the four-memory MegaGargomon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "neutral" },
            { card: "ST17-02", as: "terriermon" },
            { card: "ST17-02", as: "otherHost" },
            { card: "BT5-046", as: "nearHost" },
            { card: "ST17-10", as: "henry" },
          ],
          trash: [
            { card: "ST17-05", as: "gargomon" },
            { card: "ST17-07", as: "rapidmon" },
          ],
          hand: [{ card: "ST17-08", as: "mega" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const [effect] = JSON.parse(s.perm("henry").activatableEffectsJson) as { effectKey: string }[];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("henry").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard.cardId === "ST17-08");

    expect(s.perm("terriermon").topCard.cardId).toBe("ST17-08");
    expect(s.perm("terriermon").stack).toHaveLength(4);
    await settle(
      () => s.state.pendingDecision === undefined && observe(s.engine).hasKeyword(s.perm("terriermon"), "Rush"),
    );
    expect(s.perm("terriermon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("henry").instanceId,
        s.inst("gargomon").instanceId,
        s.inst("rapidmon").instanceId,
      ]),
    );
    expect(s.state.memory).toBe(6);
    for (const alias of ["neutral", "otherHost", "nearHost"]) {
      expect(s.perm(alias).stack).toHaveLength(0);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Rush")).toBe(false);
    }
    const hostChoice = s.decisions.find(({ req }) => req.kind === "chooseTargets" && req.sourceCardId === "ST17-10");
    expect(hostChoice?.req.options?.candidateInstanceIds).toEqual([
      s.perm("terriermon").permanentId,
      s.perm("otherHost").permanentId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
