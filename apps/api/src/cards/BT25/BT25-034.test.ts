import { describe, expect, it } from "vitest";
import { compiled as BT25_034 } from "./BT25-034.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-034 Angemon", () => {
  it("only plays an eligible Angel or Iliad Digimon from hand when trashed from security by an effect", () => {
    const effect = BT25_034.effects?.find((entry) => entry.trigger === "OnDiscardSecurity");
    expect(effect).toBeDefined();
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      payCost: false,
      target: {
        filter: {
          controller: "mine",
          zone: "hand",
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Angel", "Iliad"], match: "trait" }],
        },
        count: 1,
      },
    });
  });

  it("keeps Ascension and inherited Barrier as keyword-only entries", () => {
    expect(BT25_034.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Ascension", raw: "＜Ascension＞" }] }),
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
      ]),
    );
  });

  it("plays an eligible hand card after direct effect trash from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-034", as: "securityAngemon" }],
          hand: [{ card: "BT25-031", as: "iliadHand" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-031"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("BT25-031");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityAngemon").instanceId);
  });

  it("naturally responds when a public attack effect trashes the top security card", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-034", as: "securityAngemon" }],
          hand: [{ card: "BT25-031", as: "iliadHand" }],
          battleArea: [{ card: "BT13-037", as: "securityTrasher" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("securityTrasher").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-031"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityAngemon").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("BT25-031");
  });
});
