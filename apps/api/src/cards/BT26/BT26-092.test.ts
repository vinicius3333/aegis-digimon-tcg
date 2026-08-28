import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-092.js";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("BT26-092 Shota Kuroi", () => {
  it("compiles the start-main TS cost and draw/memory benefit", () => {
    expect(getCardDefinition("BT26-092")).toMatchObject({
      nameEn: "Shota Kuroi",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
            },
          },
          optional: true,
          actions: [
            { kind: "Draw", amount: 1 },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    });
  });
  it("compiles the opponent-attack TS Tamer cost and TS Digimon redirect", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              optional: true,
              abortOnDecline: true,
              allowCostWithoutTarget: true,
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                },
              },
              cost: {
                kind: "return",
                to: "deckBottom",
                target: {
                  filter: {
                    zone: "battleArea",
                    controller: "mine",
                    kind: ["Tamer"],
                    nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                  },
                },
              },
            },
          ],
        },
      ],
    });
  });
  it("trashes a TS card to draw and then gains memory at main-phase start", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-092", as: "shota" }],
          hand: [{ card: "BT26-008", as: "tsCost" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("shota"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT26-008")).toBe(true);
  });

  it("may decline the start-main cost without trashing, drawing, or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-092", as: "shota" }],
          hand: [{ card: "BT26-088", as: "tsCost" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("shota"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
  it("returns a TS Tamer to redirect an opponent attack into a TS Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-092", as: "shota" },
            { card: "BT26-080", as: "defender" },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT26-092");
  });

  it("may return a TS Tamer even when no TS Digimon can receive the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-092", as: "shota" },
            { card: "BT1-009", as: "nonTs" },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-092")).toBe(false);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT26-092")).toBe(true);
  });

  it("may decline the redirect without paying the Tamer return cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-092", as: "shota" },
            { card: "BT26-080", as: "defender" },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-092")).toBe(true);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT26-092")).toBe(false);
  });

  it("does not install the attack redirect during its controller's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-092", as: "shota" },
            { card: "BT26-080", as: "defender" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-092")).toBe(true);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT26-092")).toBe(false);
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-092", as: "shota" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const shotaId = s.inst("shota").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === shotaId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === shotaId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
