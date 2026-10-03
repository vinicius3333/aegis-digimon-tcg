import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-13.js";

describe("ST19-13 ShinMonzaemon", () => {
  it("matches Armor Purge and recovery-from-trash wording", () => {
    const card = getCardDefinition("ST19-13")!;
    expect(card.effectText).toContain("＜Armor Purge＞");
    expect(card.effectText).toContain("＜Recovery +1 (Deck)＞");
  });

  it("plays a level 5-or-lower Puppet from trash under itself when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-13", as: "shin" }],
          trash: [
            { card: "ST19-02", as: "eligible" },
            { card: "BT1-010", as: "ineligible" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard.cardId === "ST19-13" &&
          permanent.stack.some((card) => card.instanceId === s.inst("eligible").instanceId),
      ),
    );
    await s.ready();

    const shin = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST19-13");
    expect(shin?.stack.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(shin?.stack[0]?.instanceId).toBe(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ineligible").instanceId);
    expect(s.state.players[0]!.security[0]?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.security[0]?.faceUp).toBe(false);
  });

  it.each(["play", "digivolve"] as const)(
    "declines the optional 'by' cost on %s and keeps the trash card without recovering",
    async (entry) => {
      const s = setupEngine({
        0: {
          ...(entry === "digivolve" ? { battleArea: [{ card: "ST19-09", as: "base" }] } : {}),
          hand: [{ card: "ST19-13", as: "shin" }],
          trash: [{ card: "ST19-02", as: "eligible" }],
          deck: ["BT1-009", "BT1-009"],
        },
      });
      s.state.memory = 20;
      await s.ready();
      expect(
        s.engine.applyIntent(
          0,
          entry === "play"
            ? { type: "playCard", instanceId: s.inst("shin").instanceId }
            : { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("shin").instanceId },
        ),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision !== undefined || s.state.players[0]!.security.length > 0);
      expect(s.state.pendingDecision?.kind).toBe("optional");

      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("eligible").instanceId]);
      expect(s.state.players[0]!.security).toHaveLength(0);
      expect(s.state.players[0]!.deck).toHaveLength(entry === "play" ? 2 : 1);
    },
  );

  it("does not recover when no trash card can be placed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-13", as: "shin" }],
          trash: [{ card: "BT1-010", as: "ineligible" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shin").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });
});

async function playShinMonzaemonWithTrash(trashCardId: string) {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "ST19-13", as: "shin" }],
        trash: [
          { card: trashCardId, as: "geremon" },
          { card: "BT1-010", as: "ineligible" },
        ],
        deck: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 20;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shin").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.security.length === 1);
  await s.ready();
  return s;
}

describe("ST19-13 ShinMonzaemon — KB Q&A rulings", () => {
  it.each(["BT11-063", "BT15-035"])(
    "places %s [Geremon], which is also named [Numemon], under itself from the trash (Q861)",
    async (geremonCardId) => {
      const s = await playShinMonzaemonWithTrash(geremonCardId);

      const shin = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST19-13");
      expect(shin?.stack[0]?.instanceId).toBe(s.inst("geremon").instanceId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("ineligible").instanceId]);
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    },
  );
});
