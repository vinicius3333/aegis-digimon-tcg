import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-078.js";

describe("BT23-078 Gorou Matayoshi", () => {
  it("matches every catalog field, erratum spelling, and complete compiled clause", () => {
    expect(getCardDefinition("BT23-078")).toMatchObject({
      cardId: "BT23-078",
      nameEn: "Gorou Matayoshi",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gains start-main memory only during Gorou's controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-078" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    const fire = () =>
      (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
        EffectTiming.OnStartMainPhase,
      );

    const beforeOwn = s.state.memory;
    await fire();
    expect(s.state.memory).toBe(beforeOwn + 1);

    s.state.turnSeat = 1;
    const beforeOpponent = s.state.memory;
    await fire();
    expect(s.state.memory).toBe(beforeOpponent);
  });

  it("returns this Tamer and buffs one of your Digimon after a qualifying play trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-078", as: "gorou" },
            { card: "BT23-017", as: "ally" },
            { card: "BT23-006", as: "subject" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-078")).toBe(true);
    expect(s.perm("ally").currentDP).toBe(4000);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended)).toBe(true);
  });

  it("declining the return cost also aborts the DP boost and attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-078", as: "gorou" },
            { card: "BT23-017", as: "ally" },
            { card: "BT23-006", as: "subject" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-078")).toBe(true);
    expect(s.perm("ally").currentDP).toBe(1000);
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.isSuspended === false)).toBe(true);
  });

  it("excludes Sea Animal-only Digimon from the trait gate", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-078", as: "gorou" },
          { card: "BT1-033", as: "subject" },
        ],
      },
    });
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-078")).toBe(false);
  });

  it("reacts to a CS Digimon even when it also has the Sea Animal trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-078", as: "gorou" }],
          hand: [{ card: "BT23-023", as: "whamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT23-078"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-078")).toBe(true);
    expect(s.perm("whamon").currentDP).toBe(12000);
  });
});
