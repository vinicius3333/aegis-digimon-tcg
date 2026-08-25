import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-071.js";
import "../index.js";

const CARD_ID = "EX10-071";

describe("EX10-071 Paradise Lost", () => {
  it("records the exact catalog and complete trash/Main contracts", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Paradise Lost",
      colors: ["Purple", "Yellow"],
      kinds: ["Option"],
      playCost: 2,
      types: ["Seven Great Demon Lords"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "EndOfYourTurn")).toMatchObject({
      isFromTrash: true,
      actions: [
        {
          kind: "trashSecurityTop",
          controller: "mine",
          count: 1,
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] } },
          cost: {
            kind: "return",
            target: { filter: { isSelfRef: true, zone: "trash" }, from: ["trash"] },
            to: "deckBottom",
          },
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          withoutSuspending: true,
        },
      ],
    });
    const main = compiled.effects.find(({ trigger }) => trigger === "Main")!;
    expect(main.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { bindAs: "lucemonBuffTarget" },
      keyword: { keyword: "Raid" },
    });
    for (const action of main.actions.slice(1)) {
      expect(action).toMatchObject({ target: { fromSelectionRef: "lucemonBuffTarget" } });
    }
  });

  it("Q5185/Q5186 returns itself from trash and still makes a suspended Digimon attack with 0 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-060", as: "lucemon", suspended: true }],
          trash: [{ card: CARD_ID, as: "paradise" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    await settle(() => s.events.some(({ kind }) => kind === "attackDeclared"));
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe(CARD_ID);
    expect(s.perm("lucemon").isSuspended).toBe(true);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(true);
  });

  it("trashes top security before the forced attack when security exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-060", as: "lucemon" }],
          trash: [{ card: CARD_ID, as: "paradise" }],
          security: [{ card: "BT1-001", as: "security" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("does not return itself or attack without a Lucemon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009" }], trash: [{ card: CARD_ID, as: "paradise" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("Main grants Raid, Piercing, Blocker, and +3000 DP to the same Lucemon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "paradise" }], battleArea: [{ card: "EX10-060", as: "lucemon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    const before = s.perm("lucemon").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paradise").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lucemon").currentDP === before + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("lucemon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(true);
    expect(s.perm("lucemon").currentDP).toBe(before + 3000);
  });

  it("Security optionally plays a Lucemon from trash without paying", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "paradise" }], trash: [{ card: "EX10-060", as: "lucemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("paradise"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-060")).toBe(true);
  });
});
