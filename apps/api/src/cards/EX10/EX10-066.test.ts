import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-066.js";
import "../index.js";

const CARD_ID = "EX10-066";

describe("EX10-066 Akihiro Kurata", () => {
  it("records the exact catalog and same-host evolution contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Akihiro Kurata",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["-"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "belphemonHost" },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 6 },
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: { filter: { isSelfRef: true }, isSelf: true },
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Belphemon"], match: "name" }],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            bindHostAs: "belphemonHost",
          },
          into: { nameOrTrait: [{ tokens: ["Belphemon"], match: "name" }] },
        },
      ],
    });
  });

  it("sets memory to 3 only from 2 or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "kurata" }] } });
    low.state.memory = 2;
    await low.ready();
    await advance(low.engine).fireForPermanent(EffectTiming.OnStartTurn, low.perm("kurata"));
    expect(low.state.memory).toBe(3);

    const high = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "kurata" }] } });
    high.state.memory = 4;
    await high.ready();
    await advance(high.engine).fireForPermanent(EffectTiming.OnStartTurn, high.perm("kurata"));
    expect(high.state.memory).toBe(4);
  });

  it("places itself at the chosen Belphemon's bottom and evolves that same host from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kurata" },
            { card: "EX10-022", as: "rage" },
          ],
          trash: [{ card: "EX10-021", as: "sleep" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("kurata"));

    const evolved = s.perm("rage");
    expect(evolved.stack[0]?.cardId).toBe(CARD_ID);
    expect(evolved.topCard.cardId).toBe("EX10-021");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does nothing with 7 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kurata" },
            { card: "EX10-022", as: "rage" },
          ],
          hand: Array.from({ length: 7 }, () => "BT1-001"),
          trash: [{ card: "EX10-021", as: "sleep" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("kurata"));

    expect(s.perm("rage").topCard.cardId).toBe("EX10-022");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX10-021");
  });

  it("does not pay the Tamer cost without a Belphemon host or trash evolution", async () => {
    const noHost = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "kurata" }], trash: [{ card: "EX10-021", as: "sleep" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await noHost.ready();
    await advance(noHost.engine).fireForPermanent(EffectTiming.OnEndTurn, noHost.perm("kurata"));
    expect(noHost.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);

    const noEvolution = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kurata" },
            { card: "EX10-022", as: "rage" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await noEvolution.ready();
    await advance(noEvolution.engine).fireForPermanent(EffectTiming.OnEndTurn, noEvolution.perm("kurata"));
    expect(noEvolution.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(noEvolution.perm("rage").stack).toHaveLength(0);
  });

  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "kurata" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("kurata"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
