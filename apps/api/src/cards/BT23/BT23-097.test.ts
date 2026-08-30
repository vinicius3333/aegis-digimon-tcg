import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-097.js";

describe("BT23-097 Seventh Penetration", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-097")).toMatchObject({
      cardId: "BT23-097",
      nameEn: "Seventh Penetration",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 7,
      types: ["Seven Great Demon Lords"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("returns itself from trash to deck bottom before activating the hand-size Main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-070", as: "belphemon" }],
          trash: [{ card: "BT23-097", as: "option" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT23-010", as: "level4" },
            { card: "BT1-009", as: "level3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const deletedId = s.perm("level4").topCard!.instanceId;
    const survivorId = s.perm("level3").topCard!.instanceId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("belphemon").permanentId,
    });
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(optionId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === deletedId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === survivorId)).toBe(true);
  });

  it("treats the printed By return as optional and aborts the Main tail when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-070", as: "belphemon" }],
          trash: [{ card: "BT23-097", as: "option" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT23-010", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const targetId = s.perm("target").permanentId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("belphemon").permanentId,
    });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("returns itself to the bottom of the deck before activating Main", () => {
    const trigger = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    const action = trigger.actions[0].actions[0];
    expect(action).toMatchObject({ kind: "ActivateMain", optional: true, cost: { kind: "return", to: "deckBottom" } });
    expect(trigger.isFromTrash).toBe(true);
    expect(trigger.actions[0].sourceFilter.nameOrTrait).toEqual([
      { tokens: ["Belphemon (X Antibody)"], match: "name" },
    ]);
  });

  it("routes Security through Main without changing its dynamic hand-size boundary", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions).toEqual([{ kind: "ActivateMain" }]);
  });

  it("scales the opponent level floor from the number of cards in hand", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main") as any;
    expect(main.actions[0].target.filter.levelComparison).toMatchObject({ op: "gte", value: 0 });
    expect(main.actions[0].target.filter.levelComparison.scaling.filter).toMatchObject({
      controllerDefault: "mine",
      zone: "hand",
    });
  });
});
