import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-084.js";

describe("BT11-084 BlueMeramon", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-084")).toMatchObject({ cardId: "BT11-084", colors: ["Purple"], level: 5, playCost: 8, dp: 6000, types: ["Flame"] });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Retaliation" }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Draw", amount: 2 }, { kind: "Trash" }] },
      { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("draws 2 then trashes 2 when digivolving and has Retaliation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base" }],
          hand: [{ card: "BT11-084", as: "blue-meramon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blue-meramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
  });

  it("inherits memory gain only for an effect-played Digimon and only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-083", as: "host", under: ["BT11-084"] },
          { card: "BT11-079", as: "played" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const payload = { subjectPermanentId: s.perm("played").permanentId };

    await advance(s.engine).fireSubTrigger("whenPlayed", payload);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).fireSubTrigger("whenPlayed", { ...payload, playedByEffect: true });
    await advance(s.engine).fireSubTrigger("whenPlayed", { ...payload, playedByEffect: true });

    expect(s.state.memory).toBe(1);
  });
});
