import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-063.js";
import "../index.js";

const CARD_ID = "EX10-063";

describe("EX10-063 Close", () => {
  it("records the exact catalog and compiled IR contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["LIBERATOR"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find(({ trigger }) => trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "return", target: { filter: { isSelfRef: true } }, to: "deckBottom" },
        },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed" }, { kind: "youHaveNone" }] },
        },
      ],
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "Security")).toMatchObject({ isSecurity: true });
  });

  it("Q5173 returns itself, plays Close from hand, then plays Sunarizamon only with no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: CARD_ID, as: "replacement" }],
          trash: [{ card: "EX10-025", as: "sunarizamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("replacement").instanceId, s.inst("sunarizamon").instanceId]),
    );
  });

  it("Q5173 cannot process the Sunarizamon tail without a Close in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          trash: [{ card: "EX10-025", as: "sunarizamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("source"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("sunarizamon").instanceId);
  });

  it("suspends to gain 1 when an own Mineral or Rock Digimon loses a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "close" },
            { card: "BT13-061", as: "gotsumon" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
      subjectPermanentId: s.perm("gotsumon").permanentId,
    });
    await settle(() => s.perm("close").isSuspended);
    expect(s.state.memory).toBe(1);
  });

  it("does not pay the suspend cost or gain memory when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "close" },
            { card: "BT13-061", as: "gotsumon" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
      subjectPermanentId: s.perm("gotsumon").permanentId,
    });
    await settle(() => false, 30);
    expect(s.perm("close").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "close" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("close"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
