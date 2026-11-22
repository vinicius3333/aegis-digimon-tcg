import { Encoder } from "@colyseus/schema";
import { describe, expect, it } from "vitest";
import { CARD_ID_VIEW_TAG, getCardDefinition } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { buildStateView } from "#api/engine/state/visibility";
import { compiled } from "./BT27-019.js";
import "#api/cards/index";

const cardId = "BT27-019";

describe("Gaomon placement under Thomas and inherited draw", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Gaomon",
      nameJp: "ガオモン",
      colors: ["Blue"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Beast", "DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual(["WhenMoving", "OnPlay", "WhenAttacking"]);
  });

  it.each([
    ["Wanyamon by name", "BT1-004"],
    ["a DATA SQUAD level 2", "BT27-002"],
  ])("digivolves from %s for 0", async (_label, source) => {
    const s = setupEngine({
      0: { battleArea: [{ card: source, as: "source" }], hand: [{ card: cardId, as: "gaomon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gaomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === cardId);
    expect(s.state.memory).toBe(3);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenMoving])(
    "places a hand card face down under Thomas, then both players draw at %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: cardId, as: "gaomon" },
              { card: "BT27-089", as: "thomas" },
              { card: "BT1-085", as: "otherTamer" },
            ],
            hand: [{ card: "BT1-009", as: "payment" }],
            deck: [{ card: "BT1-013", as: "drawn" }],
          },
          1: { deck: [{ card: "BT1-013", as: "opponentDrawn" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fire(timing, s.perm("gaomon"));
      expect(s.perm("thomas").stack.map((c) => [c.instanceId, c.faceUp])).toEqual([
        [s.inst("payment").instanceId, false],
      ]);
      expect(s.perm("otherTamer").stack).toHaveLength(0);
      expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([s.inst("drawn").instanceId]);
      expect(s.state.players[1]!.hand.map((c) => c.instanceId)).toEqual([s.inst("opponentDrawn").instanceId]);
    },
  );

  it("accepts a Tamer also named Thomas H. Norstein", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gaomon" },
            { card: "ST24-13", as: "pair" },
          ],
          hand: [{ card: "BT1-009", as: "payment" }],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gaomon"));
    expect(s.perm("pair").stack.map((c) => c.instanceId)).toEqual([s.inst("payment").instanceId]);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });

  it.each(["missing Thomas", "empty hand", "declined"])("draws nothing when the cost is %s", async (reason) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gaomon" },
            { card: reason === "missing Thomas" ? "BT1-085" : "BT27-089", as: "tamer" },
          ],
          hand: reason === "empty hand" ? [] : ["BT1-009"],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoDeclineOptional: reason === "declined", autoAcceptOptional: reason !== "declined" },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gaomon"));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("gives its host a both-players draw on attack once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-037", as: "attacker", under: [cardId] }], deck: ["BT1-013", "BT1-013"] },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: ["BT1-013", "BT1-013"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    for (let i = 0; i < 2; i++) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 2 - i && !s.state.pendingDecision);
      await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    }
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });
});

describe("official rulings", () => {
  function setupThomasWithFaceDownCard() {
    return setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gaomon" },
            { card: "BT27-089", as: "thomas", under: [{ card: "BT1-013", as: "existing", faceUp: false }] },
          ],
          hand: [{ card: "BT1-009", as: "payment" }],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
  }

  it("places the hand card at the bottom of the cards already under Thomas", async () => {
    const s = setupThomasWithFaceDownCard();
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gaomon"));
    expect(s.perm("thomas").stack.map((c) => [c.instanceId, c.faceUp])).toEqual([
      [s.inst("payment").instanceId, false],
      [s.inst("existing").instanceId, false],
    ]);
  });

  it("lets only the owner see the identity of the face-down card placed under Thomas", async () => {
    const s = setupThomasWithFaceDownCard();
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gaomon"));
    expect(new Encoder(s.state)).toBeDefined();
    const placed = s.perm("thomas").stack.find((c) => c.instanceId === s.inst("payment").instanceId)!;
    expect(buildStateView(s.state, 0).hasTag(placed, CARD_ID_VIEW_TAG)).toBe(true);
    expect(buildStateView(s.state, 1).hasTag(placed, CARD_ID_VIEW_TAG)).toBe(false);
  });

  it("puts the face-down cards under Thomas face up in the trash when Thomas is deleted", async () => {
    const s = setupThomasWithFaceDownCard();
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gaomon"));
    expect(await advance(s.engine).verb.deletePermanent([s.perm("thomas").permanentId], "byEffect")).toBe(1);
    await settle(() => !s.state.pendingDecision);
    const trashed = s.state.players[0]!.trash.filter((c) =>
      [s.inst("payment").instanceId, s.inst("existing").instanceId].includes(c.instanceId),
    );
    expect(trashed.map((c) => c.faceUp)).toEqual([true, true]);
  });
});
