import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-007.js";

describe("BT23-007 Musclemon", () => {
  it("matches every catalog field and carries the complete executable IR", () => {
    expect(getCardDefinition("BT23-007")).toMatchObject({
      cardId: "BT23-007",
      nameEn: "Musclemon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["Life"],
      types: ["Muscle Training"],
      effectText:
        "[Digivolve] Lv.2 w/[Appmon]\u00a0trait: Cost 0 \n\n[Security] At the end of the battle, play this card without paying the cost.",
      linkDp: 2000,
      linkEffect: "＜Piercing＞",
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 1",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "Security",
          timing: "endOfBattle",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenSecurityBattleEnded",
              once: true,
              actions: [
                {
                  kind: "PlayWithoutCost",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                  from: ["trash"],
                  payCost: false,
                },
              ],
            },
          ],
        },
        {
          trigger: "Static",
          isLinked: true,
          actions: [],
          keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }],
      linkRequirement: [{ traits: ["Appmon"], cost: 1 }],
    });
  });

  it("plays itself from security only after its battle ends and pays no memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-057", as: "attacker" }] },
      1: { security: [{ card: "BT23-007", as: "securityMuscle" }] },
    });
    const muscleId = s.inst("securityMuscle").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === muscleId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === muscleId)).toBe(false);
  });

  it("digivolves for 0 from an off-color Appmon level 2 and rejects an off-color non-Appmon", async () => {
    const eligible = setupEngine({
      0: { breeding: { card: "BT23-001", as: "appmonEgg" }, hand: [{ card: "BT23-007", as: "muscle" }] },
    });
    eligible.state.memory = 0;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("appmonEgg").permanentId,
        instanceId: eligible.inst("muscle").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("appmonEgg").topCard.instanceId === eligible.inst("muscle").instanceId);
    expect(eligible.state.memory).toBe(0);
    expect(eligible.perm("appmonEgg").stack[0]!.instanceId).toBe(eligible.inst("appmonEgg").instanceId);

    const ineligible = setupEngine({
      0: { breeding: { card: "BT2-005", as: "nonAppmonEgg" }, hand: [{ card: "BT23-007", as: "muscle" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("nonAppmonEgg").permanentId,
        instanceId: ineligible.inst("muscle").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("links to an Appmon for 1, adds exactly 2000 DP, and grants Piercing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT23-007", as: "muscle" }],
      },
    });
    s.state.memory = 5;
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("muscle").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Piercing"));

    expect(s.state.memory).toBe(4);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("muscle").instanceId);
  });

  it("uses linked Piercing to check security after deleting a suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host", linked: ["BT23-007"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 1000, suspended: true }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(false);
  });

  it("cannot link to a non-Appmon and leaves both memory and zones unchanged", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "nonAppmon" }],
        hand: [{ card: "BT23-007", as: "muscle" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("muscle").instanceId,
        targetPermanentId: s.perm("nonAppmon").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("muscle").instanceId);
    expect(s.perm("nonAppmon").linked).toHaveLength(0);
  });
});
