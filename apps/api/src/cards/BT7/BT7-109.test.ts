import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-109.js";

const trashWithBothChoices = [
  { card: "BT7-074", as: "purpleLevel5" },
  { card: "BT4-115", as: "lucemon" },
  "BT1-001",
  "BT1-001",
  "BT1-001",
  "BT1-001",
  "BT1-001",
  "BT1-001",
  "BT1-001",
  "BT1-001",
];

describe("BT7-109 Dead or Alive", () => {
  it("plays a purple level 5 from trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT7-067"], hand: [{ card: "BT7-109", as: "option" }], trash: ["BT7-074"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("can still choose the ordinary purple level 5 with 10 cards in trash (Q1676)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-067", as: "purpleSource" }],
          hand: [{ card: "BT7-109", as: "option" }],
          trash: trashWithBothChoices,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT7-074"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT7-074");
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("lucemon").instanceId)).toBe(true);
  });

  it("can choose a Lucemon instead without also playing the ordinary target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-067", as: "purpleSource" }],
          hand: [{ card: "BT7-109", as: "option" }],
          trash: trashWithBothChoices,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT4-115"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT4-115");
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("purpleLevel5").instanceId)).toBe(
      true,
    );
  });

  it("activates the same ordinary play from Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT7-109", as: "securityOption" }],
          trash: [{ card: "BT7-074", as: "purpleLevel5" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT7-074");
  });
});
