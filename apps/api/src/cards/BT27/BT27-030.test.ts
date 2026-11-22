import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { compiled } from "./BT27-030.js";
import "#api/cards/index";

const cardId = "BT27-030";

function tamerWithTwoFaceDown(as = "tamer") {
  return {
    card: "BT1-085",
    as,
    under: [
      { card: "BT1-009", as: `${as}Bottom`, faceUp: false },
      { card: "BT1-013", as: `${as}Above`, faceUp: false },
    ],
  };
}

describe("MachGaogamon bounce, Tamer-paid free play, and inherited leave prevention", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "MachGaogamon",
      nameJp: "マッハガオガモン",
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Cyborg", "DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => [effect.trigger, effect.sharedUseKey ?? null])).toEqual([
      ["OnPlay", "returnThenPlay"],
      ["WhenDigivolving", "returnThenPlay"],
      ["WhenAttacking", "returnThenPlay"],
      ["AllTurns", null],
    ]);
  });

  it("digivolves from a DATA SQUAD level 4 for 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-023", as: "source" }], hand: [{ card: cardId, as: "mach" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("mach").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === cardId);
    expect(s.state.memory).toBe(2);
  });

  it.each([
    ["level 4", "BT1-037", true],
    ["level 5", "BT1-038", false],
  ])("returns an opponent's %s Digimon only within the boundary", async (_label, card, returned) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "mach" }] },
        1: { battleArea: [{ card, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mach"));
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[1]!.hand.map((c) => c.cardId)).toEqual(returned ? [card] : []);
  });

  it.each(["BT27-089", "BT25-021", "BT25-096"])(
    "pays two bottom face-down Tamer cards to play or use %s for free",
    async (card) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: cardId, as: "mach" }, tamerWithTwoFaceDown()],
            hand: [{ card, as: "reward" }],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
      );
      await s.ready();
      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mach"));
      await settle(() => !s.state.pendingDecision);
      expect(s.perm("tamer").stack).toHaveLength(0);
      expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("reward").instanceId)).toBe(false);
      expect(s.state.memory).toBe(0);
    },
  );

  it.each([
    ["a cost-7 DATA SQUAD card", cardId],
    ["a non-DATA SQUAD card", "BT1-009"],
  ])("keeps %s in hand", async (_label, card) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "mach" }, tamerWithTwoFaceDown()], hand: [{ card, as: "reward" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mach"));
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([s.inst("reward").instanceId]);
  });

  it("cannot play the reward with only one face-down Tamer card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "mach" },
            { card: "BT1-085", as: "tamer", under: [{ card: "BT1-009", faceUp: false }] },
          ],
          hand: [{ card: "BT27-089", as: "reward" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mach"));
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([s.inst("reward").instanceId]);
  });

  it("shares one use per turn between On Play and When Attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "mach" }] },
        1: {
          battleArea: [
            { card: "BT1-037", as: "firstTarget" },
            { card: "BT1-019", as: "secondTarget" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mach"));
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mach").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !s.state.pendingDecision);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });

  it.each([
    ["a Gaogamon-named host", "BT25-023", 0],
    ["a DATA SQUAD host", "BT27-081", 0],
    ["an unrelated host", "BT1-038", 1],
  ])("inherited prevention protects %s", async (_label, host, deleted) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: host, as: "host", under: [cardId] },
            { card: "BT1-085", as: "tamer", under: [{ card: "BT1-009", as: "cost", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(deleted);
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("tamer").stack).toHaveLength(deleted);
  });

  it("inherited prevention works once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-023", as: "host", under: [cardId] },
            {
              card: "BT1-085",
              as: "tamer",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-013", faceUp: false },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    await settle(() => !s.state.pendingDecision);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.perm("tamer").stack).toHaveLength(1);
  });
});

describe("official rulings", () => {
  it("finishes the Tamer-paid free play after a would-leave effect removes it during the bounce", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "mach" }, tamerWithTwoFaceDown()],
          hand: [{ card: "BT27-089", as: "reward" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT24-018", as: "styracomon" },
            { card: "BT8-013", as: "bounced" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("bounced").permanentId, s.perm("mach").permanentId);
    const machCard = s.perm("mach").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mach"));
    await settle(() => !s.state.pendingDecision);

    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(machCard);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toContain(s.perm("bounced").permanentId);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("reward").instanceId)).toBe(true);
  });

  it("pays the cost with one bottom face-down card from each of two Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "mach" },
            { card: "BT1-085", as: "firstTamer", under: [{ card: "BT1-009", as: "firstCost", faceUp: false }] },
            { card: "BT1-085", as: "secondTamer", under: [{ card: "BT1-013", as: "secondCost", faceUp: false }] },
          ],
          hand: [{ card: "BT27-089", as: "reward" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mach"));
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("firstTamer").stack).toHaveLength(0);
    expect(s.perm("secondTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstCost").instanceId, s.inst("secondCost").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("reward").instanceId)).toBe(true);
  });
});
