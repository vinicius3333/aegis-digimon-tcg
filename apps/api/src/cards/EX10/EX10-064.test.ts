import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-064.js";
import "../index.js";

const CARD_ID = "EX10-064";

describe("EX10-064 Yuu Amano & Nene Amano", () => {
  it("records the exact catalog and executable contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["General", "Bagra Army", "Twilight"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find(({ trigger }) => trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place", target: { count: 1, from: ["hand", "trash"] }, position: "bottom" },
        },
      ],
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "instead",
          sourceFilter: { controller: "mine", kind: ["Digimon"], hasDigiXrosRequirement: true },
          actions: [
            { kind: "DigiXrosMaterialZoneExpansion", zones: ["tamerCards", "trash"], cost: { kind: "suspend" } },
          ],
        },
      ],
    });
  });

  it("Q5174 places the payment at the Tamer's true bottom and draws exactly 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer", under: [{ card: "BT1-009", as: "existing" }] }],
          hand: [{ card: "EX10-026", as: "material" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
      s.inst("existing").instanceId,
    ]);
  });

  it("Q5175/Q5176 DigiXroses with one card under another Tamer and one from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-055", as: "tactimon" }],
          trash: [{ card: "EX10-027", as: "trashMaterial" }],
          battleArea: [
            { card: CARD_ID, as: "expander" },
            { card: "EX10-063", as: "otherTamer", under: [{ card: "EX10-026", as: "underMaterial" }] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-055"));
    expect(s.perm("expander").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("Q5178 adds the quotas from 2 separately suspended copies", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-034", as: "blastmon" }],
          trash: [
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
          ],
          battleArea: [
            { card: CARD_ID, as: "firstExpander" },
            { card: CARD_ID, as: "secondExpander" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blastmon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId],
          expanderPermanentIds: [s.perm("firstExpander").permanentId, s.perm("secondExpander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-034"));
    expect(s.perm("firstExpander").isSuspended).toBe(true);
    expect(s.perm("secondExpander").isSuspended).toBe(true);
  });

  it("rejects the expander for a DigiXros card outside Bagra Army/Twilight", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT10-009", as: "shoutmon" }],
        trash: [{ card: "BT10-008", as: "material" }],
        battleArea: [{ card: CARD_ID, as: "expander" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shoutmon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("material").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
  });

  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "tamer" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tamer"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
