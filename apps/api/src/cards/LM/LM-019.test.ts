import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-019.js";

describe("LM-019 Bokomon", () => {
  it("reveals four cards and adds a Digimon with Gammamon in its text", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-019", as: "bokomon" }], deck: ["AD1-007", "BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bokomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-007"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-007")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("adds nothing when none of the four has Gammamon in its text", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-019", as: "bokomon" }], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bokomon").instanceId });
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("deletes itself to prevent another Gammamon-text Digimon from leaving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-019", as: "bokomon" },
            { card: "AD1-007", as: "gammamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const protectedId = s.perm("gammamon").permanentId;
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([protectedId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "LM-019"), 2000);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-019")).toBe(true);
  });

  it("does not protect Bokomon itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-019", as: "bokomon" },
            { card: "LM-019", as: "otherBokomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const otherId = s.perm("otherBokomon").permanentId;
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([otherId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === otherId)).toBe(false);
  });

  it("declining the cost lets the Digimon leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-019", as: "bokomon" },
            { card: "AD1-007", as: "gammamon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const protectedId = s.perm("gammamon").permanentId;
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([protectedId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-019")).toBe(false);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-019");
    const compiled = runtimeCompiledCard("LM-019");
    expect(definition?.nameEn).toBe("Bokomon");
    expect(definition?.colors).toEqual(["White"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      leaveCause: "otherThanYourEffect",
    });
  });
});
