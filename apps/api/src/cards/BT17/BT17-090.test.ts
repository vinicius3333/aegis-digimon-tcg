import { describe, it, expect } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-090.js";
import "./BT17-065.js";
import "./BT17-086.js";
import "./index.js";

const TOMONORI = "BT17-090";
const SECURITY_DIGIMON = "AD1-001"; // attacker with enough DP to force a security check

describe("BT17-090 Tomonori Ryusenji — [Security] play self", () => {
  it("matches the immutable catalog identity and preserves full IR coverage", () => {
    const definition = getCardDefinition(TOMONORI);
    expect(definition).toMatchObject({
      nameEn: "Tomonori Ryusenji",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      effectText: expect.stringContaining("Dex"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(definition?.effectText).toContain("DeathX");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("keeps both timing and provenance gates in executable IR", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [
            { kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      condition: { kind: "selfIsSuspended" },
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Digimon"], digivolutionStackKind: ["Tamer"] }, count: 1 },
          into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Dex", "DeathX"], match: "name" }] },
        },
      ],
    });
  });

  it("naturally suspends to gain memory when Leon effect-places a Tamer under an own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TOMONORI, as: "tomonori" },
            { card: "BT17-086", as: "leon" },
            { card: "BT17-030", as: "pulsemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const leonId = s.inst("leon").instanceId;
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    const [effect] = observe(s.engine).activatableEffects(s.perm("leon")) as { effectKey: string }[];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("leon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("tomonori").isSuspended && s.perm("pulsemon").stack.some((card) => card.instanceId === leonId),
    );

    expect(s.perm("tomonori").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.perm("pulsemon").stack.some((card) => card.instanceId === leonId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally digivolves a legal own stack target from trash at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TOMONORI, as: "tomonori", suspended: true },
            { card: "BT17-062", as: "dorumon", under: ["BT17-088"] },
          ],
          trash: [{ card: "BT17-065", as: "dexDorugamon" }],
          hand: [{ card: "BT1-001", as: "discardForDex" }],
          deck: [{ card: "BT1-002", as: "drawForDex" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).runTurn(1);
    await settle(() => s.perm("dorumon").topCard?.cardId === "BT17-065");

    expect(s.perm("tomonori").isSuspended).toBe(true);
    expect(s.perm("dorumon").topCard?.cardId).toBe("BT17-065");
    expect(s.perm("dorumon").stack.some((card) => card.cardId === "BT17-062")).toBe(true);
    expect(s.perm("dorumon").stack.some((card) => card.cardId === "BT17-088")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("dexDorugamon").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not digivolve at the opponent's turn end while Tomonori is unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TOMONORI, as: "tomonori" },
            { card: "BT17-062", as: "dorumon", under: ["BT17-088"] },
          ],
          trash: [{ card: "BT17-065", as: "dexDorugamon" }],
          hand: [{ card: "BT1-001", as: "discardForDex" }],
          deck: [{ card: "BT1-002", as: "drawForDex" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).runTurn(1);

    expect(s.perm("tomonori").isSuspended).toBe(false);
    expect(s.perm("dorumon").topCard?.cardId).toBe("BT17-062");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("dexDorugamon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("[Security] plays this Tamer to the battle area when hit as a security card", async () => {
    // Seat 1 is the turn player attacking into seat 0's security.
    const s = setupEngine({
      0: { security: [{ card: TOMONORI, as: "tamerCard" }] },
      1: { battleArea: [{ card: SECURITY_DIGIMON, dp: 12000, as: "attacker" }] },
    });
    const p0 = s.state.players[0];
    s.state.turnSeat = 1;
    const tamerId = s.inst("tamerCard").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" },
    });
    expect(res.ok).toBe(true);

    // Wait until Tomonori leaves the security stack (checked/played).
    await settle(() => !p0?.security.some((c) => c.instanceId === tamerId), 800);

    // Tomonori should now be in seat 0's battle area (played without cost by [Security]).
    const inBattleArea = p0?.battleArea.some((p) => p.topCard?.instanceId === tamerId);
    expect(inBattleArea).toBe(true);
    // And not in trash (was not trashed — it was played).
    expect(p0?.trash.some((c) => c.instanceId === tamerId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("records complete compiled coverage for the Tamer-stack watcher", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter.js");
    const compiled = runtimeCompiledCard(TOMONORI)!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
