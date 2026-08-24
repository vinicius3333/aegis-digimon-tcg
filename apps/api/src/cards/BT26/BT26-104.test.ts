import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-104.js";
import "../index.js";

describe("BT26-104 compiled fidelity", () => {
  it("registers memory, Shambala trash-to-draw, conditional Option use, and Security play", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "GainMemory", amount: 1 },
    ]);
    expect(card?.effects?.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "Draw",
        amount: 2,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trash", target: { filter: { zone: "hand" }, count: 1 } },
      },
    ]);
    const end = card?.effects?.find((effect) => effect.trigger === "EndOfYourTurn");
    expect(end?.condition).toMatchObject({ kind: "youHave", filter: { kind: ["Digimon"] } });
    expect(end?.actions).toMatchObject([
      {
        kind: "UseOptionWithoutCost",
        payCost: false,
        from: ["hand"],
        allowMultiColor: true,
        cost: { kind: "suspend" },
      },
    ]);
  });

  it("trashes a Shambala card to draw two on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-104", as: "kunlun" }],
          hand: [{ card: "BT26-013", as: "shambalaCost" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("kunlun"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT26-013")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("suspends itself to freely use a Shambala Option with Tentei Hachibushu present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-104", as: "kunlun" },
            { card: "EX12-036", as: "tentei" },
          ],
          hand: [{ card: "EX12-070", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kunlun"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.perm("kunlun").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not suspend when no eligible Shambala Option can be used", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-104", as: "kunlun" },
            { card: "EX12-019", as: "tentei" },
          ],
          hand: [{ card: "BT1-009", as: "unrelated" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kunlun"));

    expect(s.perm("kunlun").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });
});
