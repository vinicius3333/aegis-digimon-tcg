import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

const cardId = "BD04-04";
const vanilla = "BT1-009";
const vanillaChampion = "BT1-014";

async function deleteHostAndChoose(target: "held" | "free") {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: vanillaChampion, as: "host", under: [cardId] }],
        deck: [vanilla, vanilla, vanilla],
      },
      1: {
        battleArea: [
          { card: vanilla, as: "held", suspended: true },
          { card: vanilla, as: "free", suspended: true },
        ],
        deck: [vanilla, vanilla, vanilla],
      },
    },
    { autoSelectCards: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm(target).topCard!.instanceId);
  await s.ready();
  expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
  return s;
}

describe("BD04-04 Leomon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "Leomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      types: ["Beastkin"],
      inheritedEffectText:
        "[On Deletion] 1 of your opponent's Digimon can't unsuspend during their next unsuspend phase.",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("keeps the chosen opposing Digimon suspended through their next unsuspend phase only", async () => {
    const s = await deleteHostAndChoose("held");
    expect(observe(s.engine).isRestricted(s.perm("held"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("held").isSuspended).toBe(true);
    expect(s.perm("free").isSuspended).toBe(false);

    expect(observe(s.engine).isRestricted(s.perm("held"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
  });

  it("affects only the chosen Digimon", async () => {
    const s = await deleteHostAndChoose("free");

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("held").isSuspended).toBe(false);
    expect(s.perm("free").isSuspended).toBe(true);
  });
});
