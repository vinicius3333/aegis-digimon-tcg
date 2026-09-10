import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-092.js";
import "./index.js";

async function driveTurn(s: ReturnType<typeof setupEngine>, seat: 0 | 1): Promise<void> {
  await advance(s.engine).runTurn(seat);
}

describe("BT20-092 Battle NPC", () => {
  it("places a level 3 Digimon under itself before drawing", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            underFilter: { isSelfRef: true },
            target: { from: ["hand"], filter: { zone: "hand", kind: ["Digimon"], levels: [3] } },
          },
          abortOnDecline: true,
        },
      ],
    });
  });

  it("requires having no Digimon before offering the under-Tamer play", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
      actions: [
        { kind: "PlayWithoutCost", from: ["underThisTamer"], payCost: false, abortOnDecline: true },
        { kind: "Delete", target: { isSelf: true } },
      ],
    });
  });

  it("publishes the catalog identity and complete compiled coverage", () => {
    expect(getCardDefinition("BT20-092")).toMatchObject({
      cardId: "BT20-092",
      nameEn: "Battle NPC",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      forms: ["-"],
      attributes: ["-"],
      types: ["LIBERATOR"],
      effectText: expect.stringContaining("By placing 1 level 3 Digimon card from your hand under this Tamer"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("naturally places a level 3 Digimon under itself and draws one card on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-092", as: "npc" },
            { card: "BT20-046", as: "under" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("npc").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("npc").stack.some((card) => card.cardId === "BT20-046"));

    expect(s.perm("npc").stack.map((card) => card.cardId)).toContain("BT20-046");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-010");
  });

  it("at the next main phase plays its under-Tamer Digimon and then deletes itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-092", as: "npc", under: ["BT20-046"] }],
          deck: ["BT1-010"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await driveTurn(s, 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-092")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-046")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-092")).toBe(true);
  });

  it("does not play from under itself or delete itself while an own Digimon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-092", as: "npc", under: ["BT20-046"] },
            { card: "BT1-010", as: "existing" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await driveTurn(s, 0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-092")).toBe(true);
    expect(s.perm("npc").stack.map((card) => card.cardId)).toEqual(["BT20-046"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-092")).toBe(false);
  });

  it("sets memory to exactly 3 at start of turn when the gauge is at 2", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT20-092", as: "npc" }], deck: ["BT1-010"] }, 1: { deck: ["BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays the exact BT20-092 security instance for free after a public check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }], deck: ["BT1-010"] },
      1: { security: [{ card: "BT20-092", as: "securityNpc" }], deck: ["BT1-010"] },
    });
    const npcId = s.inst("securityNpc").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === npcId)).toBe(true);
  });
});
