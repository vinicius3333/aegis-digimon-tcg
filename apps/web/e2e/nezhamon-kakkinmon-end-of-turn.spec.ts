import { test, expect, type DecisionPolicy, type ScenarioPage } from "./scenario-page";

// CR 16-44-2: <Engage> triggers with other End of Your Turn effects, and the turn player
// chooses the order (15-4-3-5-1). CR 11-1-4 and Q3869: after the attack declaration, an
// effect still pending from that end-of-turn timing activates before counter timing, so
// a payable Kakkinmon resolves before the security check.
type Snapshot = Awaited<ReturnType<ScenarioPage["snapshot"]>>;
type Trigger = "EX12-019" | "P-245";

const permanentOf = (state: Snapshot, cardId: string) =>
  state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === cardId)!;

async function endTurn(scenario: ScenarioPage, first: Trigger, policy: DecisionPolicy = () => ({})) {
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  const before = await scenario.snapshot();
  const eventsBefore = (await scenario.presentation()).events.length;
  await scenario.page.getByRole("button", { name: /^end turn$/i }).click();
  let passed: Snapshot | undefined;
  await scenario.resolveUntil(
    (s) => {
      if (s.turnSeat !== 1 || s.pendingDecision) return false;
      passed ??= s;
      return true;
    },
    (decision) => (decision.kind === "orderTriggers" ? { triggerCardId: first } : policy(decision)),
  );
  const all = (await scenario.presentation()).events.slice(eventsBefore);
  const events = all.slice(0, all.findIndex((event) => event.kind === "turnEnded") + 1);
  expect(events.at(-1)?.kind, "the human turn ended").toBe("turnEnded");
  const kinds = events.map((event) => event.kind);
  const kakkinmon = events.flatMap((event, index) =>
    event.kind === "effectResolved" && event.sourceCardId === "P-245" ? [index] : [],
  );
  return { before, passed: passed!, events, kinds, kakkinmon };
}

test.describe("Discord 1557557257129037844: Nezhamon Engage and Kakkinmon at end of turn", () => {
  test("Discord 1557557257129037844: Engage first with a spare Blocker resolves Kakkinmon before counter timing and the check", async ({
    scenario,
  }) => {
    test.setTimeout(120_000);
    await scenario.open("arena-ex12-nezhamon-kakkinmon-engage-spare-blocker");
    let offeredBeforeReveal = false;
    const result = await endTurn(scenario, "EX12-019", async (decision) => {
      if (decision.sourceCardId !== "P-245") return {};
      const state = await scenario.snapshot();
      const kinds = (await scenario.presentation()).events.map((event) => event.kind);
      if (decision.kind === "optional") {
        offeredBeforeReveal =
          kinds.lastIndexOf("attackDeclared") > kinds.lastIndexOf("turnEnded") &&
          kinds.lastIndexOf("securityRevealed") < kinds.lastIndexOf("attackDeclared") &&
          state.players[1]!.securityCount === 5;
        return { accept: true };
      }
      // Nezhamon is suspended by its attack, so ST5-08 is the only payable Blocker.
      const spare = permanentOf(state, "ST5-08");
      return { instanceId: decision.options.candidateInstanceIds!.find((id) => id === spare.permanentId) };
    });
    expect(permanentOf(result.before, "ST5-08").isSuspended).toBe(false);
    expect(result.before.players[1]!.securityCount).toBe(5);
    expect(offeredBeforeReveal).toBe(true);
    const attack = result.kinds.indexOf("attackDeclared");
    const counter = result.kinds.indexOf("counterWindowOpened");
    const check = result.kinds.indexOf("securityChecked");
    expect(result.kakkinmon).toHaveLength(1);
    expect(attack).toBeGreaterThanOrEqual(0);
    expect(result.kakkinmon[0]).toBeGreaterThan(attack);
    expect(check).toBeGreaterThan(result.kakkinmon[0]!);
    if (counter >= 0) expect(counter).toBeGreaterThan(result.kakkinmon[0]!);
    expect(result.kinds.filter((kind) => kind === "securityChecked")).toHaveLength(1);
    expect(result.passed.players[0]!.handCount).toBe(result.before.players[0]!.handCount + 1);
    expect(result.passed.players[1]!.securityCount).toBe(4);
    expect(permanentOf(result.passed, "ST5-08").isSuspended).toBe(true);
    // Nezhamon may unsuspend when security is removed; Kakkinmon must not draw again.
    expect(permanentOf(result.passed, "EX12-019").isSuspended).toBe(false);
    await scenario.healthy({ timedCatchUp: true });
  });

  test("Discord 1557557257129037844: Engage first suspends the only Blocker, so Kakkinmon cannot pay and does not draw", async ({
    scenario,
  }) => {
    test.setTimeout(120_000);
    await scenario.open("arena-ex12-nezhamon-kakkinmon-engage");
    const kakkinmonPrompts: string[] = [];
    const result = await endTurn(scenario, "EX12-019", (decision) => {
      if (decision.sourceCardId === "P-245") kakkinmonPrompts.push(decision.kind);
      return {};
    });
    expect(kakkinmonPrompts).toEqual([]);
    expect(result.kinds.filter((kind) => kind === "attackDeclared")).toHaveLength(1);
    expect(result.kinds.filter((kind) => kind === "securityChecked")).toHaveLength(1);
    expect(result.kakkinmon).toEqual([]);
    expect(result.passed.players[0]!.handCount).toBe(result.before.players[0]!.handCount);
    expect(result.passed.players[1]!.securityCount).toBe(4);
    expect(permanentOf(result.passed, "EX12-019").isSuspended).toBe(false);
    await scenario.healthy({ timedCatchUp: true });
  });

  test("Discord 1557557257129037844: Kakkinmon first suspends Nezhamon and draws, so Engage cannot attack", async ({
    scenario,
  }) => {
    test.setTimeout(120_000);
    await scenario.open("arena-ex12-nezhamon-kakkinmon-engage");
    const result = await endTurn(scenario, "P-245");
    expect(result.kakkinmon).toHaveLength(1);
    expect(result.kinds).not.toContain("attackDeclared");
    expect(result.kinds).not.toContain("securityChecked");
    expect(result.passed.players[0]!.handCount).toBe(result.before.players[0]!.handCount + 1);
    expect(result.passed.players[1]!.securityCount).toBe(5);
    expect(permanentOf(result.passed, "EX12-019").isSuspended).toBe(true);
    await scenario.healthy({ timedCatchUp: true });
  });
});
