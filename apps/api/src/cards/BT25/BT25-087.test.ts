import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT25-087.js";
import "../BT15/BT15-090.js";
import "../index.js";

const CARD_ID = "BT25-087";

describe("BT25-087 Thomas H. Norstein", () => {
  it("keeps the DATA SQUAD cost replacement in the printed Your Turn window", () => {
    const replacement = compiled.effects.find((effect) =>
      effect.actions?.some((action) => action.kind === "Replacement" && action.event === "wouldDigivolve"),
    );
    expect(replacement?.trigger).toBe("YourTurn");
    expect(replacement?.frequency).toBe("OncePerTurn");
  });

  it("sets low memory to 3 at Start Turn but never lowers higher memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "thomas" }] } });
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartTurn, s.perm("thomas"));
    expect(s.state.memory).toBe(3);
    s.state.memory = 5;
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartTurn, s.perm("thomas"));
    expect(s.state.memory).toBe(5);
  });

  it("publicly sets memory to 3 at the real start of its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "thomas" }] } });
    s.state.turnSeat = 0;
    s.state.memory = 2;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("on an effect add to the opponent's hand, suspends and may place top 2 face-down at true bottom top-first (Q6409-Q6413)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "thomas", under: [{ card: "AD1-001", faceUp: false, as: "oldBottom" }] }],
          deck: [
            { card: "AD1-002", as: "top" },
            { card: "AD1-003", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    expect(s.perm("thomas").isSuspended).toBe(true);
    expect(s.perm("thomas").stack.map((c) => c.instanceId)).toEqual([
      s.inst("second").instanceId,
      s.inst("top").instanceId,
      s.inst("oldBottom").instanceId,
    ]);
    expect(s.perm("thomas").stack.every((c) => c.faceUp !== true)).toBe(true);
  });

  it("publicly using Fox Fire returns an opponent Digimon and triggers Thomas", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "thomas" }],
          hand: [{ card: "BT15-090", as: "foxFire" }],
          deck: ["AD1-001", "AD1-002"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "returned" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("foxFire").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("thomas").stack.length === 2);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-013")).toBe(false);
    expect(s.perm("thomas").isSuspended).toBe(true);
    expect(s.perm("thomas").stack.map((card) => card.cardId)).toEqual(["AD1-002", "AD1-001"]);
  });

  it("can decline the optional top-two placement after a public hand-add effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "thomas" }],
          hand: [{ card: "BT15-090", as: "foxFire" }],
          deck: ["AD1-001", "AD1-002"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "returned" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("foxFire").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("thomas").isSuspended).toBe(false);
    expect(s.perm("thomas").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["AD1-001", "AD1-002"]);
  });

  it("does not react when the effect adds to its controller's hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "thomas" }], deck: ["AD1-001", "AD1-002"] } },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 0 });
    expect(s.perm("thomas").isSuspended).toBe(false);
    expect(s.perm("thomas").stack).toHaveLength(0);
  });

  it("two physical copies each pay a bottom face-down card and stack -2 for one DATA SQUAD evolution (Q6414)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "thomasA", under: [{ card: "AD1-001", faceUp: false, as: "costA" }] },
            { card: CARD_ID, as: "thomasB", under: [{ card: "AD1-002", faceUp: false, as: "costB" }] },
            { card: "BT25-021", as: "gaomon" },
          ],
          hand: [{ card: "BT25-023", as: "gaogamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gaomon").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaomon").topCard.instanceId === s.inst("gaogamon").instanceId);
    expect(s.state.memory).toBe(1); // printed cost 2, reduced by both physical copies to 0.
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([s.inst("costA").instanceId, s.inst("costB").instanceId]),
    );
  });

  it("Security plays Thomas free", async () => {
    const s = setupEngine({
      0: { security: [{ card: CARD_ID, as: "securityThomas" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 20000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === CARD_ID));
    expect(s.state.memory).toBe(0);
  });
});
