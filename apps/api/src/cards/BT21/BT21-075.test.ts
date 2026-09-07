import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-075.js";
import "../index.js";
describe("BT21-075 SkullGreymon", () => {
  it("grants Raid and Retaliation and recurs ADVENTURE", () => {
    for (const t of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((e) => e.trigger === t)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Raid" } });
      expect(actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Retaliation" },
        target: { sameTarget: true },
      });
    }
    expect(compiled.effects.filter((e) => e.trigger === "OnDeletion")).toHaveLength(2);
    expect(compiled.effects.find((e) => e.trigger === "OnDeletion" && e.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Greymon"], cost: 3, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays a qualifying ADVENTURE Digimon from trash when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-075", as: "skullgreymon" }],
          trash: [{ card: "BT21-057", as: "adventureGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("skullgreymon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-057"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-057")).toBe(true);
  });

  it("grants Raid and Retaliation to the same selected Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-075", as: "skullgreymon" },
            { card: "BT1-009", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("target").permanentId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("skullgreymon"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Raid")).toBe(false);
  });

  it("naturally uses granted Raid to redirect a public player attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-075", as: "target" }], hand: [{ card: "BT21-075", as: "skull" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    const victimId = s.perm("victim").permanentId;
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "Raid"));
    // The public play grants Raid; this test then uses the established Digimon in the
    // same production turn to isolate Raid's redirection behavior from summoning sickness.
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Raid")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("publicly proves granted Retaliation deletes an established host after it loses to higher DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "host" }],
          hand: [{ card: "BT21-075", as: "skull" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT10-055", as: "higher", suspended: true }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);

    const hostId = s.perm("host").permanentId;
    const higherId = s.perm("higher").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: higherId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === higherId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-075")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT10-055")).toBe(true);
  });

  it("keeps play grants through the opponent turn and expires Raid and Retaliation on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "host" }],
          hand: [{ card: "BT21-075", as: "skull" }, "BT1-010"],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it.each([
    [false, true],
    [false, false],
    [true, true],
    [true, false],
  ] as const)(
    "resolves natural deletion after normal cost-4 evolution with inherited=%s and accept=%s",
    async (inherited, accept) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT15-011", as: "base" }],
            hand: [{ card: "BT21-075", as: "skull" }, ...(inherited ? [{ card: "BT1-025", as: "war" }] : [])],
            trash: [{ card: "BT21-057", as: "adventure" }],
            deck: ["BT1-001", "BT1-002"],
          },
          1: { battleArea: [{ card: "BT10-055", as: "higher", suspended: true }] },
        },
        { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("skull").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Retaliation"));
      expect(s.state.memory).toBe(6);
      expect(s.perm("base").topCard.cardId).toBe("BT21-075");
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
      if (inherited) {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("war").instanceId,
          }),
        ).toEqual({ ok: true });
        await settle(() => s.perm("base").topCard.cardId === "BT1-025");
        expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT15-011", "BT21-075"]);
        expect(s.state.memory).toBe(3);
      }
      const baseId = s.perm("base").permanentId;
      const higherId = s.perm("higher").permanentId;
      const skullId = s.inst("skull").instanceId;
      const recoveryId = s.inst("adventure").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: baseId,
          target: { kind: "permanent", permanentId: higherId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.players[0]!.trash.some((card) => card.instanceId === skullId) && !observe(s.engine).isAttacking(),
      );
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === baseId)).toBe(false);
      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === higherId)).toBe(false);
      expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === recoveryId)).toBe(accept);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === recoveryId)).toBe(!accept);
      expect(s.state.memory).toBe(inherited ? 3 : 6);
    },
  );

  it("plays an ADVENTURE Tamer at the play-cost-4 boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-075", as: "skullgreymon" }],
          trash: [{ card: "BT21-102", as: "tai" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("skullgreymon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((card) => card.topCard.instanceId === s.inst("tai").instanceId),
    );
  });

  it("does not play an ADVENTURE card above play cost 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-075", as: "skullgreymon" }],
          trash: [{ card: "AD1-001", as: "cost5" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("skullgreymon").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost5").instanceId)).toBe(true);
  });

  it("does not cross the ADVENTURE trait boundary for a cheap non-ADVENTURE card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-075", as: "skullgreymon" }],
          trash: [{ card: "BT1-009", as: "nonAdventure" }],
        },
        1: { battleArea: [{ card: "BT10-055", as: "victim", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const nonAdventureId = s.inst("nonAdventure").instanceId;
    const victimId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skullgreymon").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-075")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === nonAdventureId)).toBe(true);
  });

  it("does not play an eligible ADVENTURE card from the opponent's trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-075", as: "skullgreymon" }] },
        1: {
          battleArea: [{ card: "BT10-055", as: "victim", suspended: true }],
          trash: [{ card: "BT21-057", as: "opponentAdventure" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const opponentAdventureId = s.inst("opponentAdventure").instanceId;
    const victimId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skullgreymon").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-075")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === opponentAdventureId)).toBe(true);
  });

  it("executes the inherited deletion play from a realistic stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-057", as: "base" }],
          hand: [
            { card: "BT21-075", as: "source" },
            { card: "ST6-13", as: "host" },
          ],
          trash: [{ card: "BT21-057", as: "adventure" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-075");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST6-13");
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((card) => card.topCard.instanceId === s.inst("adventure").instanceId),
    );
  });

  it.each([
    ["Greymon-name", "BT1-015", 0],
    ["ADVENTURE", "BT21-067", 1],
  ] as const)("uses the %s alternate evolution route for 3", async (_label, base, requirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT21-075", as: "skullgreymon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullgreymon").instanceId,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("skullgreymon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
