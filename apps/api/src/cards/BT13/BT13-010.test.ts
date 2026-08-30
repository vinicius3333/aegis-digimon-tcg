import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT15/BT15-088.js";
import { compiled } from "./BT13-010.js";
import "./BT13-014.js";

describe("BT13-010 Biyomon", () => {
  it("keeps Garudamon and Kristy Damon bracket references exact", () => {
    const action = compiled.effects[0]!.actions[0] as unknown as {
      into: { nameOrTrait: [{ tokens: string[]; match: string }] };
      cost: { target: { filter: { nameOrTrait: [{ tokens: string[]; match: string }] } } };
    };
    const garudamonReference = action.into.nameOrTrait[0]!;
    const kristyReference = action.cost.target.filter.nameOrTrait[0]!;

    expect(garudamonReference).toEqual({ tokens: ["Garudamon"], match: "nameExact" });
    expect(kristyReference).toEqual({ tokens: ["Kristy Damon"], match: "nameExact" });
    expect(matchNameOrTrait(definitionOf("BT13-014"), garudamonReference as never)).toBe(true);
    expect(matchNameOrTrait(definitionOf("BT16-011"), garudamonReference as never)).toBe(false);
    expect(matchNameOrTrait({ nameEn: "Kristy Damon" }, kristyReference as never)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Kristy Damon & Marcus Damon" }, kristyReference as never)).toBe(false);
  });

  it("when played by an effect, may return Kristy Damon and digivolve into Garudamon for free", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT15-088", as: "security", faceUp: true }],
          hand: [
            { card: "BT13-010", as: "biyomon" },
            { card: "BT13-014", as: "garudamon" },
          ],
          battleArea: [{ card: "BT13-094", as: "kristy" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const kristyId = s.perm("kristy").topCard.instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-014"));

    const garudamon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT13-014")!;
    expect(garudamon.stack.some((card) => card.cardId === "BT13-010")).toBe(true);
    // Garudamon's registered When Digivolving effect immediately replays the
    // returned 3-cost red Tamer, proving Kristy first left her original permanent.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === kristyId)).toBe(true);
  });

  it("may return Kristy Damon even without a Garudamon in hand (Q2269)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT15-088", as: "security", faceUp: true }],
          hand: [{ card: "BT13-010", as: "biyomon" }],
          battleArea: [{ card: "BT13-094", as: "kristy" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT13-094"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-010")).toBe(true);
  });

  it("does not offer the Kristy cost when Biyomon is played normally", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-010", as: "biyomon" },
            { card: "BT13-014", as: "garudamon" },
          ],
          battleArea: [{ card: "BT13-094", as: "kristy" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("biyomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-010"));
    await settle();
    expect(s.perm("kristy").topCard.cardId).toBe("BT13-094");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-014")).toBe(true);
  });

  it("draws one when the Digimon carrying its inherited effect is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-010"] }], deck: ["BT1-001"] },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });
});
