import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { assertNoLoudGap, settle, setupEngine } from "./testkit/harness.js";

// CR 7-3-2-10 permits Assembly on effect plays, including the free play in CR 16-29-4.
describe("GitHub #5294: EX13-020 Magnamon Assembly during Partition", () => {
  it.each(["assemble", "no-material", "no-partition"] as const)(
    "%s: resolves an opponent's Gaia Force through public intents",
    async (path) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-009", as: "red", dp: 20_000 }],
            hand: [{ card: "ST1-16", as: "gaia" }],
            trash: [{ card: "BT2-021", as: "opponentMaterial" }],
          },
          1: {
            battleArea: [
              {
                card: path === "no-partition" ? "BT1-080" : "BT16-025",
                as: "holder",
                under: [
                  { card: "EX13-020", as: "magnamon" },
                  { card: "BT1-071", as: "green" },
                ],
              },
            ],
            trash: [{ card: path === "no-material" ? "BT1-009" : "BT2-021", as: "material" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const holderId = s.perm("holder").permanentId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          !s.state.players[1]!.battleArea.some((p) => p.permanentId === holderId) &&
          s.state.pendingDecision === undefined,
      );
      const played = s.state.players[1]!.battleArea.find((p) => p.topCard.instanceId === s.inst("magnamon").instanceId);
      const assemblyChoices = s.decisions.filter(({ req }) => req.options?.assemblyCardId === "EX13-020");
      expect(s.state.memory).toBe(2); // Only Gaia Force costs memory; Partition and Assembly remain free.
      expect(played?.topCard.cardId).toBe(path === "no-partition" ? undefined : "EX13-020");
      expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId).sort()).toEqual(
        path === "no-partition" ? [] : ["BT1-071", "EX13-020"],
      );
      expect(played?.stack.map((c) => c.instanceId) ?? []).toEqual(
        path === "assemble" ? [s.inst("material").instanceId] : [],
      );
      expect(assemblyChoices.map(({ seat, req }) => ({ seat, options: req.options }))).toMatchObject(
        path === "assemble"
          ? [{ seat: 1, options: { min: 0, max: 1, candidateInstanceIds: [s.inst("material").instanceId] } }]
          : [],
      );
      expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("material").instanceId)).toBe(
        path !== "assemble",
      );
      expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("opponentMaterial").instanceId)).toBe(true);
      assertNoLoudGap(s);
    },
  );

  it.each([true, false])("production-shaped AD1-011 return: Veemon already in trash=%s", async (alreadyInTrash) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX13-023", as: "ulforce" }] },
        1: {
          battleArea: [
            {
              card: "AD1-011",
              as: "paildramon",
              under: [
                { card: "BT12-021", as: "veemonUnderHolder" },
                { card: "BT12-002", as: "eggUnderHolder" },
                { card: "BT12-021", as: "otherVeemonUnderHolder" },
                { card: "EX13-020", as: "magnamon" },
                { card: "ST9-09", as: "stingmon" },
              ],
            },
          ],
          trash: [
            { card: "LM-058", as: "usedScramble" },
            ...(alreadyInTrash ? [{ card: "BT12-021", as: "availableVeemon" }] : []),
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const holderInstanceId = s.perm("paildramon").topCard.instanceId;
    const unavailableMaterialId = s.inst("veemonUnderHolder").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ulforce").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.deck.some((c) => c.instanceId === holderInstanceId) &&
        s.state.pendingDecision === undefined,
    );
    const magnamon = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "EX13-020")!;
    expect(magnamon.stack.map((c) => c.instanceId)).toEqual(
      alreadyInTrash ? [s.inst("availableVeemon").instanceId] : [],
    );
    expect(s.decisions.filter(({ req }) => req.options?.assemblyCardId === "EX13-020")).toHaveLength(
      alreadyInTrash ? 1 : 0,
    );
    // Partition plays before the holder returns, so this Veemon becomes trash too late for Assembly.
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === unavailableMaterialId)).toBe(true);
    expect(magnamon.stack.some((c) => c.instanceId === unavailableMaterialId)).toBe(false);
    assertNoLoudGap(s);
  });
});
