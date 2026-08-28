import { describe, it, expect } from "vitest";
import { Phase } from "@aegis/shared";
import { cite } from "./_kb.js";
import "./not-testable.js";
import {
  setupEngine as setup,
  makeInstance as instance,
  makeDigimon as digimon,
  findPermanent,
  settle,
} from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 7 "Playing a Card" (comprehensive-0111..0122).
 *
 * comprehensive-0111 (bare chapter heading) is already seeded in `not-testable.ts` by an
 * earlier lane; not repeated here. See README.md for the citation contract and
 * `ch03-game-areas.test.ts` for the idiom this file follows.
 */

// Real fixtures from the generated card table (cards.json), reused throughout this file:
//   BT1-009  Monodramon      — Digimon, Red Lv.3, playCost 2, DP 3000
//   AD1-001  Greymon         — Digimon, Red Lv.4, playCost 5, DP 5000
//   BT10-061 SkullKnightmon: — Digimon, Black Lv.4, playCost 4;
//            Mighty Axe Mode   digiXrosRequirement: 1x [SkullKnightmon] + 1x [DeadlyAxemon],
//                               reduction 1/material; [On Play] Delete 1 opp Digimon (playCost<=4)
//                               ONLY "if DigiXrosing with 2 [or more] cards" (digiXrosCount>=2).
//   BT7-058  SkullKnightmon  — Digimon, Black Lv.4, playCost 4 (a DigiXros material)
//   BT7-059  DeadlyAxemon    — Digimon, Black Lv.4, playCost 4 (a DigiXros material)

describe("§7-1 Playing a Card (comprehensive-0112)", () => {
  it("7-1-1: a card is played from hand into the battle area as a Main-phase action; illegal off-phase", async () => {
    cite("comprehensive-0112", "7-1-1 playing a card places 1 hand card onto the field, as a Main phase action");

    const s = setup();
    const p0 = s.state.players[0]!;
    const card = instance("BT1-009", 0, false);
    p0.hand.push(card);
    s.state.memory = 10;

    // Off-phase: the same play is illegal outside the Main phase.
    s.state.phase = Phase.Draw;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({
      ok: false,
      reason: "wrong-phase",
    });
    expect(p0.hand.some((c) => c.instanceId === card.instanceId)).toBe(true);

    // Main phase: the play succeeds and the card leaves hand for the battle area.
    s.state.phase = Phase.Main;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT1-009"));
    expect(p0.hand.some((c) => c.instanceId === card.instanceId)).toBe(false);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(true);
  });
});

describe("§7-1-2 Card Playing Rules (comprehensive-0113)", () => {
  it("7-1-2-1: a Digimon can't attack the same turn it was played", async () => {
    cite("comprehensive-0113", "7-1-2-1 a card can't attack the same turn it was played");

    const s = setup();
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    s.state.turnCount = 1; // summoning sickness only gates when turnCount > 0
    const card = instance("BT1-009", 0, false);
    p0.hand.push(card);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT1-009"));
    const attacker = findPermanent(s, 0, "BT1-009");

    const defender = digimon(1, 3000);
    defender.isSuspended = true; // a legal direct target with no block window
    p1.battleArea.push(defender);

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: defender.permanentId },
    });
    expect(result).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("7-1-2-4: an unaffordable play returns the card unchanged and doesn't move memory", async () => {
    cite(
      "comprehensive-0113",
      "7-1-2-4 if a card can no longer be played after reveal, it's returned unchanged; " +
        "memory doesn't move when the play fails on cost",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const card = instance("AD1-001", 0, false); // playCost 5
    p0.hand.push(card);
    s.state.memory = -10; // maxAffordable(0) = -10 - (-10) = 0 < 5
    const memoryBefore = s.state.memory;
    const handLengthBefore = p0.hand.length;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(result).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.state.memory).toBe(memoryBefore);
    expect(p0.hand.length).toBe(handLengthBefore);
    expect(p0.hand.some((c) => c.instanceId === card.instanceId)).toBe(true);
  });
});

describe("§7-2 DigiXros (comprehensive-0114)", () => {
  it("7-2-1: the play cost is reduced by the requirement's value for each material placed", async () => {
    cite(
      "comprehensive-0114",
      "7-2-1 a DigiXros places named material cards under the played Digimon and " +
        "reduces its play cost by the requirement's value per card placed",
    );

    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const skullXros = instance("BT10-061", 0, false); // playCost 4
    const material1 = instance("BT7-058", 0, false); // [SkullKnightmon]
    const material2 = instance("BT7-059", 0, false); // [DeadlyAxemon]
    p0.hand.push(skullXros, material1, material2);
    p1.battleArea.push(digimon(1, 3000, "BT1-009")); // a legal Delete target (playCost 2 <= 4)
    s.state.memory = 0;
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: skullXros.instanceId,
      digiXros: { materialInstanceIds: [material1.instanceId, material2.instanceId] },
    } as never);
    expect(result).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT10-061"));
    await settle(() => false, 40); // flush the [On Play] Delete resolution
    // Printed cost 4, reduction 1 per material, 2 materials placed => cost 2.
    expect(memoryBefore - s.state.memory).toBe(2);
  });
});

describe("§7-2-2 DigiXros Rules (comprehensive-0115)", () => {
  it("7-2-2-1/6: chosen hand materials are revealed and consumed atomically by the declaration", async () => {
    cite(
      "comprehensive-0115",
      "7-2-2-1/7-2-2-6 hand materials chosen for a DigiXros are revealed at declaration time " +
        "and placed under the played card in the same procedure",
    );

    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const skullXros = instance("BT10-061", 0, false);
    const material1 = instance("BT7-058", 0, false);
    p0.hand.push(skullXros, material1);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: skullXros.instanceId,
      digiXros: { materialInstanceIds: [material1.instanceId] },
    } as never);
    expect(result).toEqual({ ok: true });

    await settle(() => p0.battleArea.find((p) => p.topCard?.cardId === "BT10-061")?.stack.length === 1, 200);
    // The material is no longer a loose hand card — it left with the play, not on a later step.
    expect(p0.hand.some((c) => c.instanceId === material1.instanceId)).toBe(false);
    const played = findPermanent(s, 0, "BT10-061");
    expect(played.stack.some((c) => c.instanceId === material1.instanceId)).toBe(true);
  });
});

describe("§7-2-2-4 DigiXros Rules (comprehensive-0116)", () => {
  it("7-2-2-4: a declared DigiXros can't place 0 materials", () => {
    cite("comprehensive-0116", "7-2-2-4 a declared DigiXros can't choose to place 0 cards");

    const s = setup();
    const p0 = s.state.players[0]!;
    const skullXros = instance("BT10-061", 0, false);
    p0.hand.push(skullXros);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: skullXros.instanceId,
      digiXros: { materialInstanceIds: [] },
    } as never);
    expect(result).toEqual({ ok: false, reason: "no-materials" });
  });

  it(
    "7-2-2-7: a battle-area material's OWN digivolution cards are trashed, not carried under the " +
      "DigiXros'd permanent",
    async () => {
      const s = setup({ autoSelectCards: true });
      const p0 = s.state.players[0]!;
      const skullXros = instance("BT10-061", 0, false);
      p0.hand.push(skullXros);

      // A field material (SkullKnightmon, BT7-058) that already has its own digivolution stack —
      // a prior digivolution card that should be shed (trashed) the instant this permanent leaves
      // the battle area to become DigiXros material, per 7-2-2-7.
      const fieldMaterial = digimon(0, 4000, "BT7-058");
      const priorDigivolutionCard = instance("BT1-009", 0, true);
      fieldMaterial.stack.push(priorDigivolutionCard);
      p0.battleArea.push(fieldMaterial);
      s.state.memory = 10;

      const result = s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: skullXros.instanceId,
        digiXros: { materialInstanceIds: [fieldMaterial.topCard!.instanceId] },
      } as never);
      expect(result).toEqual({ ok: true });
      await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT10-061"), 5000);
      await settle(() => false, 5000); // let the [On Play] resolution fully settle either way

      // `relocatePermanent`'s `shedOwnCards` (set only by the DigiXros action) attaches the
      // source's TOP card alone; its own digivolution stack and link card go to the trash.
      expect(p0.trash.some((c) => c.instanceId === priorDigivolutionCard.instanceId)).toBe(true);
      const xrosPermanent = p0.battleArea.find((p) => p.topCard?.cardId === "BT10-061");
      expect(xrosPermanent?.stack.some((c) => c.instanceId === priorDigivolutionCard.instanceId)).toBe(false);
      // The material's top card itself DID become a digivolution card of the new permanent.
      expect(xrosPermanent?.stack.some((c) => c.cardId === "BT7-058")).toBe(true);
    },
  );
});

describe("§7-2-2-10 DigiXros Rules (comprehensive-0117)", () => {
  // BT10-061 (SkullKnightmon: Mighty Axe Mode): [On Play] reveal 3 / add 1 / trash rest, THEN
  // "if DigiXrosing with 2 cards" delete 1 opponent Digimon (playCost <= 4) — the 2-slot
  // [SkullKnightmon]x[DeadlyAxemon] recipe used throughout this describe block.
  it("7-2-2-10: an 'if DigiXrosing with 2 cards' clause fires only when 2+ materials were actually placed", async () => {
    cite(
      "comprehensive-0117",
      "7-2-2-10 an X-card DigiXros is considered performed only when X cards were placed; " +
        "a 'DigiXrosing with N cards' clause gates on the ACTUAL material count",
    );

    // 1 material: digiXrosCount(1) < minimum(2) — the gated [On Play] Delete does NOT resolve.
    {
      const s = setup({ autoSelectCards: true });
      const p0 = s.state.players[0]!;
      const p1 = s.state.players[1]!;
      const skullXros = instance("BT10-061", 0, false);
      const material1 = instance("BT7-058", 0, false);
      p0.hand.push(skullXros, material1);
      const target = digimon(1, 3000, "BT1-009"); // opponent Digimon, playCost 2 <= 4
      p1.battleArea.push(target);
      s.state.memory = 10;

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: skullXros.instanceId,
          digiXros: { materialInstanceIds: [material1.instanceId] },
        } as never),
      ).toEqual({ ok: true });
      await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT10-061"));
      // Give the [On Play] resolution (reveal/add/trash, then the conditioned Delete) room to
      // fully settle before asserting the negative — a fixed short tick count is unreliable here.
      await settle(() => false, 5000);
      expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(true);
    }

    // 2 materials: digiXrosCount(2) >= minimum(2) — the gated [On Play] Delete DOES resolve.
    {
      const s = setup({ autoSelectCards: true });
      const p0 = s.state.players[0]!;
      const p1 = s.state.players[1]!;
      const skullXros = instance("BT10-061", 0, false);
      const material1 = instance("BT7-058", 0, false);
      const material2 = instance("BT7-059", 0, false);
      p0.hand.push(skullXros, material1, material2);
      const target = digimon(1, 3000, "BT1-009");
      p1.battleArea.push(target);
      s.state.memory = 10;

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: skullXros.instanceId,
          digiXros: { materialInstanceIds: [material1.instanceId, material2.instanceId] },
        } as never),
      ).toEqual({ ok: true });
      await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId), 5000);
      expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    }
  });
});

describe("§7-2-3-3 DigiXros Rules (comprehensive-0118)", () => {
  it("7-2-3-3/7-2-3-4: the reduced cost is paid, materials are placed under it, and the card resolves on the field", async () => {
    cite(
      "comprehensive-0118",
      "7-2-3-3 the play cost is reduced by the DigiXros amount, paid after any other " +
        "increases/reductions; 7-2-3-4 the card is placed and the play procedure resolves",
    );

    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const skullXros = instance("BT10-061", 0, false);
    const material1 = instance("BT7-058", 0, false);
    const material2 = instance("BT7-059", 0, false);
    p0.hand.push(skullXros, material1, material2);
    s.state.memory = 0; // printed cost 4; only affordable at all if the reduction actually applies
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: skullXros.instanceId,
      digiXros: { materialInstanceIds: [material1.instanceId, material2.instanceId] },
    } as never);
    expect(result).toEqual({ ok: true });

    await settle(() => p0.battleArea.find((p) => p.topCard?.cardId === "BT10-061")?.stack.length === 2, 200);
    expect(memoryBefore - s.state.memory).toBe(2); // 4 - 2*1
    const played = findPermanent(s, 0, "BT10-061");
    const stackIds = played.stack.map((c) => c.instanceId);
    expect(stackIds).toContain(material1.instanceId);
    expect(stackIds).toContain(material2.instanceId);
  });
});

// §7-3 Assembly (comprehensive-0119..0122): `apps/api/src/engine/actions/assembly.ts` is the
// dedicated Assembly play subsystem (modeled on `actions/digiXros.ts`), routed through
// GameEngine.handlePlayCard's `intent.assembly` branch. Real fixtures used below, all already
// implemented (their compiled IR carries a real `assemblyRequirement`, read verbatim from
// packages/shared/src/effects/effects.json via `assemblyRequirementFor`):
//   EX12-046 Shishimamon    — Digimon, Yellow/Red Lv.5, playCost 7; [Assembly -2] 1 [TB] trait card
//   EX12-076 Susanoomon     — Digimon, Yellow/White/Red Lv.7, playCost 16;
//                             [Assembly -9] 8 [Hybrid]/[Shambala] trait cards
//   EX12-009 Wankomon       — Digimon, Lv.3, [Shambala]/[TB] trait (an EX12-046 material)
//   EX12-006/009/011/012/015/019/020/022 — 8 distinct [Shambala]-trait Digimon (EX12-076 materials)
describe("§7-3 Assembly (comprehensive-0119)", () => {
  it("7-3-1: playing a Digimon by Assembly places the exact trash materials under it and reduces the play cost", async () => {
    cite(
      "comprehensive-0119",
      "7-3-1 Assembly plays a Digimon card by placing the specified trash cards under it, " +
        "reducing the play cost by the requirement's fixed amount",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const shishimamon = instance("EX12-046", 0, false);
    const material = instance("EX12-009", 0, false);
    p0.hand.push(shishimamon);
    p0.trash.push(material);
    s.state.memory = 5; // printed cost 7; only affordable if the Assembly -2 reduction applies

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: shishimamon.instanceId,
      assembly: { materialInstanceIds: [material.instanceId] },
    } as never);
    expect(result).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "EX12-046"));
    expect(s.state.memory).toBe(0); // 5 - (7 - 2)
    expect(p0.trash.some((c) => c.instanceId === material.instanceId)).toBe(false);
    const played = p0.battleArea.find((p) => p.topCard?.cardId === "EX12-046")!;
    expect(played.stack.some((c) => c.instanceId === material.instanceId)).toBe(true);
  });

  it("7-3-2-7/7-3-2-9: Assembly isn't mandatory — the same card plays normally at full cost with no declaration", async () => {
    cite(
      "comprehensive-0119",
      "7-3-2-9 Assembly isn't mandatory: an Assembly-eligible card can still be played the " +
        "ordinary way, paying the full printed cost and placing no materials",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const shishimamon = instance("EX12-046", 0, false);
    p0.hand.push(shishimamon);
    s.state.memory = 7; // full printed cost, no reduction

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: shishimamon.instanceId });
    expect(result).toEqual({ ok: true });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "EX12-046"));
    expect(s.state.memory).toBe(0);
    const played = p0.battleArea.find((p) => p.topCard?.cardId === "EX12-046")!;
    expect(played.stack.length).toBe(0);
  });

  it("a card with no Assembly requirement can't be played by Assembly", () => {
    cite("comprehensive-0119", "7-3-1 only a card printing Assembly requirements can be played by Assembly");

    const s = setup();
    const p0 = s.state.players[0]!;
    const card = instance("BT1-009", 0, false); // no assemblyRequirement
    p0.hand.push(card);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: card.instanceId,
      assembly: { materialInstanceIds: [] },
    } as never);
    expect(result).toEqual({ ok: false, reason: "not-assembly" });
  });
});

describe("§7-3-2 Assembly Rules (comprehensive-0120)", () => {
  it("7-3-2-4: the exact material count must be placed — fewer or more is rejected", () => {
    cite(
      "comprehensive-0120",
      "7-3-2-4 the exact number of cards specified in the Assembly requirements must be placed; " +
        "a player can't place just some (or extra) of them",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const shishimamon = instance("EX12-046", 0, false); // [Assembly -2] 1 [TB] trait card
    const material1 = instance("EX12-009", 0, false);
    const material2 = instance("EX12-011", 0, false); // also [TB]-trait
    p0.hand.push(shishimamon);
    p0.trash.push(material1, material2);
    s.state.memory = 10;

    // Zero materials: no Assembly is considered performed even if declared (§7-3-2-7) — modeled
    // here as "no-materials" for an explicit-but-empty declaration.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: shishimamon.instanceId,
        assembly: { materialInstanceIds: [] },
      } as never),
    ).toEqual({ ok: false, reason: "no-materials" });

    // Too many: the recipe calls for exactly 1, not 2.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: shishimamon.instanceId,
        assembly: { materialInstanceIds: [material1.instanceId, material2.instanceId] },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(p0.hand.some((c) => c.instanceId === shishimamon.instanceId)).toBe(true);
    expect(p0.trash.length).toBe(2);
  });

  it("7-3-1: materials come from the TRASH only — a hand/battle-area card is not a legal Assembly material", () => {
    cite(
      "comprehensive-0120",
      "7-3-1/7-3-3-2 Assembly materials are chosen from the cards in the trash, not hand or " +
        "battle area (contrast DigiXros, whose default sources are hand + battle area)",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const shishimamon = instance("EX12-046", 0, false);
    const materialInHand = instance("EX12-009", 0, false); // right trait, wrong zone
    p0.hand.push(shishimamon, materialInHand);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: shishimamon.instanceId,
      assembly: { materialInstanceIds: [materialInHand.instanceId] },
    } as never);
    expect(result).toEqual({ ok: false, reason: "invalid-material" });
    expect(p0.hand.some((c) => c.instanceId === shishimamon.instanceId)).toBe(true);
  });

  it("7-3-1: a trash card that doesn't match the recipe's name/trait slot is rejected", () => {
    cite("comprehensive-0120", "7-3-2-5 only cards matching the Assembly requirements qualify as materials");

    const s = setup();
    const p0 = s.state.players[0]!;
    const shishimamon = instance("EX12-046", 0, false); // requires a [TB] trait card
    const wrongTraitMaterial = instance("BT1-009", 0, false); // Monodramon: no [TB] trait
    p0.hand.push(shishimamon);
    p0.trash.push(wrongTraitMaterial);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: shishimamon.instanceId,
      assembly: { materialInstanceIds: [wrongTraitMaterial.instanceId] },
    } as never);
    expect(result).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("7-3-1: a trash card matching the trait but failing the printed level bound is rejected", () => {
    cite(
      "comprehensive-0120",
      "7-3-1 an Assembly material must satisfy EVERY printed qualifier, including the level " +
        "bound (EX12-046: 'Lv.4 or lower [TB] trait card' — a Lv.5+ [TB] card doesn't qualify)",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const shishimamon = instance("EX12-046", 0, false); // [Assembly -2] Lv.4 or lower [TB] trait card
    const tooHighLevel = instance("EX12-046", 0, false); // Shishimamon itself is [TB]-trait but Lv.5
    p0.hand.push(shishimamon);
    p0.trash.push(tooHighLevel);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: shishimamon.instanceId,
      assembly: { materialInstanceIds: [tooHighLevel.instanceId] },
    } as never);
    expect(result).toEqual({ ok: false, reason: "invalid-material" });
  });
});

describe("§7-3-2-6 Assembly Rules (comprehensive-0121)", () => {
  it("7-3-2-6: the player's declared order becomes the physical stacking order for a same-slot recipe", async () => {
    cite(
      "comprehensive-0121",
      "7-3-2-6 when the Assembly requirements specify the same cards (or numbers of each), the " +
        "player performing the Assembly chooses the stacking order",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const susanoomon = instance("EX12-076", 0, false); // [Assembly -9] 8 [Hybrid]/[Shambala] cards
    const materialIds = [
      "EX12-006",
      "EX12-009",
      "EX12-011",
      "EX12-012",
      "EX12-015",
      "EX12-019",
      "EX12-020",
      "EX12-022",
    ];
    const materials = materialIds.map((id) => instance(id, 0, false));
    p0.hand.push(susanoomon);
    p0.trash.push(...materials);
    s.state.memory = 20; // printed cost 16; reduction makes it affordable regardless

    const declared = materials.map((m) => m.instanceId);
    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: susanoomon.instanceId,
      assembly: { materialInstanceIds: declared },
    } as never);
    expect(result).toEqual({ ok: true });

    await settle(() => p0.battleArea.find((p) => p.topCard?.cardId === "EX12-076")?.stack.length === 8, 2000);
    const played = p0.battleArea.find((p) => p.topCard?.cardId === "EX12-076")!;
    // The FIRST-declared material ("shown on the left") ends up ON TOP — i.e. at the END of the
    // stack array, directly beneath the played card's top card (mirrors `swapTop`'s convention:
    // the highest-index stack slot is the one closest to becoming the top card).
    expect(played.stack[played.stack.length - 1]!.cardId).toBe("EX12-006");
    expect(played.stack[0]!.cardId).toBe("EX12-022");
    expect(played.stack.map((c) => c.cardId)).toEqual([...materialIds].reverse());
  });

  it("7-3-2-6/differentNames: a repeated-name Assembly recipe rejects duplicate materials", () => {
    cite(
      "comprehensive-0121",
      "7-3-2-6/§16 'w/different names' — EX12-076's recipe requires 8 DISTINCT-named " +
        "[Hybrid]/[Shambala] cards; repeating the same card doesn't satisfy it",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const susanoomon = instance("EX12-076", 0, false);
    // 7 distinct names + 1 duplicate of the first, instead of 8 distinct names.
    const materialIds = [
      "EX12-006",
      "EX12-006",
      "EX12-011",
      "EX12-012",
      "EX12-015",
      "EX12-019",
      "EX12-020",
      "EX12-022",
    ];
    const materials = materialIds.map((id) => instance(id, 0, false));
    p0.hand.push(susanoomon);
    p0.trash.push(...materials);
    s.state.memory = 20;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: susanoomon.instanceId,
      assembly: { materialInstanceIds: materials.map((m) => m.instanceId) },
    } as never);
    expect(result).toEqual({ ok: false, reason: "invalid-material" });
  });
});

describe("§7-3-3 Assembly Rules (comprehensive-0122)", () => {
  it("7-3-3-2/7-3-3-3: the reduced cost is paid after other modifiers, and materials are placed before the play resolves", async () => {
    cite(
      "comprehensive-0122",
      "7-3-3-2 materials are chosen and declared immediately before paying the play cost; " +
        "7-3-3-3 the reduced cost is paid, then 7-3-3-4 the card resolves on the field",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const shishimamon = instance("EX12-046", 0, false);
    const material = instance("EX12-011", 0, false); // [TB] trait
    p0.hand.push(shishimamon);
    p0.trash.push(material);
    s.state.memory = 5; // printed 7; unaffordable without the Assembly -2 reduction
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: shishimamon.instanceId,
      assembly: { materialInstanceIds: [material.instanceId] },
    } as never);
    expect(result).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "EX12-046"));
    expect(memoryBefore - s.state.memory).toBe(5); // paid (7 - 2) = 5
    const played = p0.battleArea.find((p) => p.topCard?.cardId === "EX12-046")!;
    expect(played.stack.some((c) => c.instanceId === material.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === shishimamon.instanceId)).toBe(false);
  });

  it("7-3-3-3: an unaffordable Assembly play (even reduced) is rejected before any state changes", () => {
    cite(
      "comprehensive-0122",
      "7-3-3-3 the reduced cost still must be payable — an unaffordable Assembly declaration is " +
        "rejected and leaves the hand/trash untouched",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const shishimamon = instance("EX12-046", 0, false); // printed 7, reduced by 2 -> 5
    const material = instance("EX12-009", 0, false);
    p0.hand.push(shishimamon);
    p0.trash.push(material);
    s.state.memory = -10; // maxAffordable(0) = 0 < 5

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: shishimamon.instanceId,
      assembly: { materialInstanceIds: [material.instanceId] },
    } as never);
    expect(result).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(p0.hand.some((c) => c.instanceId === shishimamon.instanceId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === material.instanceId)).toBe(true);
  });
});
