import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-104.js";
import "../index.js";

describe("BT26-104 compiled fidelity", () => {
  it("registers memory, Shambala trash-to-draw, conditional Option use, and Security play", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-104")).toMatchObject({
      nameEn: "Kunlun",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["Shambala", "SW", "TB", "TS"],
    });
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
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

  it("gains one memory at the start of its controller's main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-104", as: "kunlun" }] } });
    s.state.memory = 0;

    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("kunlun"));

    expect(s.state.memory).toBe(1);
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

  it("does not draw when no Shambala card can pay the on-play cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-104", as: "kunlun" }],
          hand: [{ card: "BT1-009", as: "unrelated" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("kunlun"));

    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("suspends itself to freely use a Shambala Option with Tentei Hachibushu present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-104", as: "kunlun" },
            { card: "EX12-036", as: "tentei" },
          ],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "BT26-100", as: "nonShambalaOption" },
          ],
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
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT26-100")).toBe(true);
  });

  it("does not use a Shambala Option when no Tentei Hachibushu Digimon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-104", as: "kunlun" }],
          hand: [{ card: "EX12-070", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kunlun"));

    expect(s.perm("kunlun").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX12-070")).toBe(true);
  });

  it("may decline the End of Your Turn Option use", async () => {
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
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kunlun"));

    expect(s.perm("kunlun").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX12-070")).toBe(true);
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

  it("does not offer the free Option use without a Tentei Hachibushu Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-104", as: "kunlun" },
            { card: "BT1-009", as: "plainDigimon" },
          ],
          hand: [{ card: "EX12-070", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kunlun"));

    expect(s.perm("kunlun").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("option").instanceId);
  });

  it("plays itself without cost from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-104", as: "security", faceUp: true }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-104"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
