import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import "../BT9/BT9-111.js";
import "../BT14/BT14-087.js";
import { compiled } from "./BT20-003.js";

describe("BT20-003 Bibimon", () => {
  it("proves the inherited end-of-turn placement is optional and once per turn", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      optional: true,
      target: { count: 1 },
      targetIsPermanent: true,
      position: "bottom",
      underFilter: { kind: ["Digimon"], isSelfRef: true, digivolutionStackKindExclude: ["Tamer"] },
    });
  });

  it("places a qualifying field Tamer at this Digimon's bottom only when its stack has no Tamer", async () => {
    const eligible = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-089", as: "socTamer" },
            { card: "BT20-085", as: "nonMatching" },
          ],
          breeding: { card: "BT20-003", as: "evolvingHost" },
          hand: [{ card: "BT10-031", as: "yellowRookie" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    // Evolve Bibimon into a legal yellow Rookie in the initial Main fixture, then move it
    // publicly during the next real Breeding phase before reaching End of Your Turn.
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("evolvingHost").permanentId,
        instanceId: eligible.inst("yellowRookie").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("evolvingHost").topCard.cardId === "BT10-031");
    expect(eligible.perm("evolvingHost").topCard.cardId).toBe("BT10-031");
    const eligibleTurn = eligible.engine.runOneTurn();
    await settle(() => eligible.state.phase === Phase.Breeding);
    expect(eligible.state.phase).toBe(Phase.Breeding);
    expect(
      eligible.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: eligible.perm("evolvingHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await advance(eligible.engine).waitForMainPhase(0);
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;
    expect(eligible.perm("evolvingHost").stack.map((card) => card.cardId)).toEqual(["BT20-089", "BT20-003"]);
    expect(eligible.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-089")).toBe(
      false,
    );

    const blocked = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-031", as: "blockedHost", under: ["BT20-003", "BT1-085"] },
            { card: "BT17-086", as: "eligibleTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(blocked.engine).runTurn(0);
    expect(blocked.perm("blockedHost").stack.map((card) => card.cardId)).toEqual(["BT20-003", "BT1-085"]);
    expect(blocked.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-086")).toBe(
      true,
    );

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-031", as: "declinedHost", under: ["BT20-003"] },
            { card: "BT20-089", as: "declinedTamer" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).runTurn(0);
    expect(declined.perm("declinedHost").stack.map((card) => card.cardId)).toEqual(["BT20-003"]);
    expect(declined.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-089")).toBe(
      true,
    );
  });

  it.each([
    ["BT14-087", "Eiji Nagasumi (SoC-only)"],
    ["BT17-086", "Leon Alexander (Pulsemon text)"],
    ["BT24-086", "The Crossroad Witch (SEEKERS-only)"],
  ] as const)("selects the %s text route from a mixed field (%s)", async (matchingCard, _label) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-031", as: "host", under: ["BT20-003"] },
            { card: matchingCard, as: "matching" },
            { card: "BT20-085", as: "nonMatching" },
          ],
        },
        1: { battleArea: [{ card: matchingCard, as: "opponentMatching" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).runTurn(0);
    await settle(() => s.perm("host").stack.some((card) => card.cardId === matchingCard));
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([matchingCard, "BT20-003"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-085")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === matchingCard)).toBe(true);
  });

  it("proves same-turn OPT after a public memory-gain reopening of Main and End of Your Turn", async () => {
    const preferred: string[] = [];
    const options = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: false,
      preferInstanceIds: preferred,
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-031", as: "host", under: ["BT14-087", "BT20-003"] },
            { card: "BT9-111", as: "ouryuken", under: ["BT20-005", "BT20-010", "BT20-012", "BT20-053", "BT20-056"] },
            { card: "BT17-086", as: "qualifyingTamer" },
          ],
          deck: ["BT20-010", "BT20-011", "BT20-012", "BT20-013", "BT20-014", "BT20-015"],
        },
        1: { battleArea: [{ card: "BT20-010", as: "opponent" }], deck: ["BT20-010", "BT20-011", "BT20-012"] },
      },
      options,
    );
    preferred.push(s.perm("host").stack[0]!.instanceId); // Reuse Eiji so its inherited effect can detach it on the next window.
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    async function chooseTrigger(cardId: string): Promise<void> {
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const decision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId);
      if (decision?.req.kind !== "orderTriggers") throw new Error(`missing order prompt for ${cardId}`);
      const index = decision.req.options?.triggerCardIds?.findIndex((id) => id === cardId) ?? -1;
      if (index < 0) throw new Error(`missing ${cardId} in order prompt`);
      const key = decision.req.options?.triggerKeys?.[index];
      expect(key).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.req.decisionId,
          response: { kind: "orderTriggers", order: [key!] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== decision.req.decisionId);
    }

    // The first End of Your Turn window must detach the existing Eiji, then place the
    // eligible field Tamer, and finally let Ouryuken return four X sources for +4 memory.
    await chooseTrigger("BT14-087");
    await chooseTrigger("BT20-003");
    // The final remaining Ouryuken effect resolves automatically.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("ouryuken").stack).toHaveLength(1);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT14-087")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-086")).toBe(true);

    // Main reopened in the same turn. Eiji detaches again during the second EOT,
    // restoring the no-Tamer condition while Bibimon's Once Per Turn identity stays used.
    expect(s.events.filter((event) => event.kind === "phaseChanged" && event.phase === Phase.Main)).toHaveLength(2);
    options.autoOrderTriggers = true;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision === undefined);
    await turn;
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT20-003"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-086")).toBe(true);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "BT20-003"),
    ).toHaveLength(1);
    options.autoOrderTriggers = true;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT14-087", "BT20-003"]);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "BT20-003"),
    ).toHaveLength(2);
  });
});
