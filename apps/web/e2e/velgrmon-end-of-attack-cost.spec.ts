import { test, expect } from "./scenario-page";

const hostId = "dev-perm-0-velgrmon";
const ownCostId = "dev-perm-0-velgrmon-own-cost";
const opponentCostId = "dev-perm-1-velgrmon-opponent-cost";
const opponentField = [
  opponentCostId,
  "dev-perm-1-velgrmon-lowest-one",
  "dev-perm-1-velgrmon-lowest-two",
  "dev-perm-1-velgrmon-higher",
];

// The printed cost is "1 level 4 or lower purple Digimon" without "your", so either field may pay it.
for (const accept of [true, false]) {
  test(`Discord 1557564616920408185: Velgrmon's end-of-attack cost ${accept ? "deletes the opponent's level 4 purple Digimon, then the new lowest level" : "declined deletes nothing"}`, async ({
    scenario,
  }) => {
    test.setTimeout(120_000);
    await scenario.open("arena-bt18-velgrmon-opponent-cost");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const initial = await scenario.snapshot();
    expect(initial.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([hostId, ownCostId]);
    expect(initial.players[1]!.battleArea.map((p) => p.permanentId)).toEqual(opponentField);

    await scenario.attack(hostId);
    let prompted = false;
    let costCandidates: string[] = [];
    await scenario.resolveUntil(
      (s) => prompted && s.players[1]!.securityCount === 4 && !s.pendingDecision && !s.combatWindow,
      (d) => {
        if (d.kind === "optional") {
          prompted = true;
          return { accept };
        }
        if (d.kind === "chooseTargets" && d.options.candidateInstanceIds?.includes(opponentCostId)) {
          costCandidates = [...d.options.candidateInstanceIds];
          return { instanceId: opponentCostId };
        }
        return {};
      },
    );

    const final = await scenario.snapshot();
    expect([...costCandidates].sort()).toEqual(accept ? [hostId, ownCostId, opponentCostId].sort() : []);
    expect(final.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([hostId, ownCostId]);
    expect(final.players[0]!.battleArea[0]!.stack.map((c) => c.cardId)).toEqual(["BT2-067"]);
    expect(final.players[0]!.trash).toEqual([]);
    expect(final.players[1]!.battleArea.map((p) => p.permanentId)).toEqual(
      accept ? ["dev-perm-1-velgrmon-higher"] : opponentField,
    );
    expect(final.players[1]!.trash.map((c) => c.cardId).sort()).toEqual(
      (accept ? ["BT1-010", "BT18-077", "BT1-038", "BT1-039"] : ["BT1-010"]).sort(),
    );
    const deleted = (await scenario.presentation()).events.flatMap((e) =>
      e.kind === "cardsMoved" ? (e.deletedPermanents ?? []).map((p) => p.permanentId) : [],
    );
    expect([...deleted].sort()).toEqual(accept ? opponentField.slice(0, 3).sort() : []);
    await scenario.healthy();
  });
}
