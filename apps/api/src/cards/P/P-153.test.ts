import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-153.js";
import "../BT7/BT7-021.js";
import "../BT7/BT7-087.js";
import "../EX10/EX10-052.js";

const UNSUSPEND_LABELS = ["Unsuspend this Digimon", "Unsuspend 1 of your Tamers"];

describe("P-153 MagnaGarurumon", () => {
  it("returns one opposing Digimon of each level 3, 4, and 5 when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-024", as: "base" }], hand: [{ card: "P-153", as: "magna" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-010", as: "level3Decoy" },
            { card: "BT1-014", as: "level4" },
            { card: "BT1-038", as: "level5" },
            { card: "BT1-080", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    const magnaId = s.inst("magna").instanceId;
    const baseSourceId = s.perm("base").topCard.instanceId;
    preferred.push(s.inst("level3").instanceId);
    const level3DecoyId = s.inst("level3Decoy").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: magnaId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === magnaId && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.some((card) => card.instanceId === baseSourceId)).toBe(true);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-014", "BT1-038"]);
    expect(s.state.players[1]!.hand.filter((card) => card.cardId === "BT1-009")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === level3DecoyId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-080")).toBe(true);
  });

  it("encodes Armor Purge and one return for each level 3/4/5", () => {
    const compiled = runtimeCompiledCard("P-153")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: expect.arrayContaining([
            { kind: "Return", to: "hand", target: { filter: { controller: "opponent", levels: [3] }, count: 1 } },
            { kind: "Return", to: "hand", target: { filter: { controller: "opponent", levels: [4] }, count: 1 } },
            { kind: "Return", to: "hand", target: { filter: { controller: "opponent", levels: [5] }, count: 1 } },
          ]),
        }),
      ]),
    );
  });

  it("encodes End of Attack top-security payment and the Digimon/Tamer unsuspend choice", () => {
    const end = runtimeCompiledCard("P-153")!.effects.find((effect) => effect.trigger === "EndOfAttack")!;
    expect(end.actions[0]).toMatchObject({
      kind: "Modal",
      choose: 1,
      optional: true,
      abortOnDecline: true,
      labels: UNSUSPEND_LABELS,
      cost: {
        kind: "place",
        destination: "security",
        position: "top",
        target: { count: 1 },
      },
      options: [
        [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } }],
        [{ kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Tamer"] } } }],
      ],
    });
    expect(runtimeCompiledCard("P-153")!.digivolutionRequirement).toEqual([
      { names: ["MagnaGarurumon"], colorCount: 3, cost: 2, isAlternate: true },
    ]);
  });

  it("places its top card on security and unsuspends itself at End of Attack", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-009"],
          battleArea: [{ card: "P-153", as: "magna", under: ["BT16-024"] }],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const magnaId = s.perm("magna").permanentId;
    const p153Id = s.perm("magna").topCard.instanceId;
    const baseId = s.perm("magna").stack[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: magnaId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.security.some((card) => card.instanceId === p153Id),
    );
    const promoted = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === magnaId)!;
    expect(promoted.topCard.instanceId).toBe(baseId);
    expect(promoted.isSuspended).toBe(false);
    expect(promoted.stack).toHaveLength(0);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(p153Id);
    expect(s.state.memory).toBe(10);
    const choices = s.decisions.filter(({ req }) => req.kind === "chooseOption").map(({ req }) => req.options?.choices);
    expect(choices).toContainEqual(UNSUSPEND_LABELS);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("P-153 MagnaGarurumon — KB Q&A rulings", () => {
  it("BT7-087's can't-be-blocked survives this card leaving the top and passes to the next digivolution (Q1661)", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-009"],
          battleArea: [
            { card: "P-153", as: "magna", under: ["BT7-087"] },
            { card: "BT1-009", as: "bounced" },
          ],
          hand: [{ card: "BT7-021", as: "kumamon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const permanentId = s.perm("magna").permanentId;
    const magnaCardId = s.perm("magna").topCard.instanceId;
    const host = () => s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId)!;
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).verb.returnToHand([s.perm("bounced").topCard.instanceId]);
    await settle(() => s.state.memory === 6);
    expect(observe(s.engine).isRestricted(host(), "cantBeBlocked")).toBe(true);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.security.some(({ instanceId }) => instanceId === magnaCardId),
    );
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(magnaCardId);
    expect(host().topCard.cardId).toBe("BT7-087");
    expect(observe(s.engine).isRestricted(host(), "cantBeBlocked")).toBe(true);

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("kumamon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => host().topCard.instanceId === s.inst("kumamon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(host(), "cantBeBlocked")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps EX10-052 in play when <Armor Purge> stops the deletion its replacement asked for (Q5135)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base", under: ["BT1-027"] }],
          hand: [{ card: "P-153", as: "magna" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "EX10-052", as: "lucemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length > 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX10-052"]);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("magna").instanceId]);
    expect(s.perm("base").topCard.cardId).toBe("BT1-038");
  });
});
