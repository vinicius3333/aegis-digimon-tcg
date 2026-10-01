import "../ST1/ST1-10.js";
import "./BT13-014.js";
import "../BT16/BT16-011.js";
import "../BT16/BT16-015.js";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-065.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("BT13-065 PlatinumSukamon", () => {
  it("uses De-Digivolve 1 stopping at level 3 and the inherited deletion replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          stopAtLevel: 3,
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "any",
                    excludeSelf: true,
                    kind: ["Digimon"],
                    nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }],
                  },
                  count: 1,
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("loads the compiled PlatinumSukamon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-065", as: "platinum" }] } });
    await s.ready();
    expect(s.perm("platinum").topCard?.cardId).toBe("BT13-065");
  });

  it("may delete an opponent's other Sukamon to prevent its host's deletion (Q2307)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-069", as: "host", under: ["BT13-065"] }] },
        1: {
          battleArea: [
            { card: "BT11-040", as: "opponent-sukamon" },
            { card: "ST1-10", as: "phoenix", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const opponentSukamonId = s.perm("opponent-sukamon").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("phoenix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === opponentSukamonId));
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentSukamonId)).toBe(false);
  });

  it("de-digivolves one opposing stack on deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-065", as: "platinum" }] },
      1: { battleArea: [{ card: "BT13-072", as: "target", under: ["BT13-066"], suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("platinum").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT13-066");

    expect(s.perm("target").topCard?.cardId).toBe("BT13-066");
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT13-072")).toBe(true);
  });
});

describe("BT13-065 PlatinumSukamon — KB Q&A rulings", () => {
  it("does not let Sukamon A's inherited effect activate again when Sukamon B's effect deletes A in answer (Q2308)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-040", as: "sukamonA", under: ["BT13-065"] },
            { card: "BT11-040", as: "sukamonB", under: ["BT13-065"] },
          ],
        },
        1: { battleArea: [{ card: "ST1-10", as: "phoenix", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sukamonAId = s.perm("sukamonA").permanentId;
    const sukamonBId = s.perm("sukamonB").permanentId;
    const onBoard = (permanentId: string) =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sukamonAId,
        target: { kind: "permanent", permanentId: s.perm("phoenix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 3000);

    const activationOffers = s.decisions.filter(({ seat, req }) => seat === 0 && req.kind === "optional");
    expect(activationOffers).toHaveLength(2);
    expect(onBoard(sukamonAId)).toBe(false);
    expect(onBoard(sukamonBId)).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT13-065")).toHaveLength(1);
  });

  it("removes Phoenixmon (X Antibody)'s [End of Attack] grant with its De-Digivolve, so a pending Garudamon (X Antibody) inherited effect can't activate (Q2615)", async () => {
    async function attackAndDeleteWithGarudamon(opponentDigimon: string) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT16-015", as: "phoenixmonX", under: ["BT13-014", "BT16-011", "BT2-019"] }] },
          1: {
            battleArea: [{ card: opponentDigimon, as: "prey" }],
            security: ["BT1-010", "BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT13-014"] },
      );
      await s.ready();
      const preyId = s.perm("prey").permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("phoenixmonX").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking(), 3000);
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === preyId)).toBe(false);
      return {
        attackerTopCardId: s.perm("phoenixmonX").topCard.cardId,
        opponentSecurity: s.state.players[1]!.security.length,
      };
    }

    expect(await attackAndDeleteWithGarudamon("BT13-065")).toEqual({
      attackerTopCardId: "BT2-019",
      opponentSecurity: 1,
    });
    expect(await attackAndDeleteWithGarudamon("BT1-010")).toEqual({
      attackerTopCardId: "BT16-015",
      opponentSecurity: 0,
    });
  });
});
