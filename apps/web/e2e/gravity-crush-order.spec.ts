import { test, expect, type DecisionPolicy } from "./scenario-page";

for (const memoryFirst of [true, false]) {
  test(`Gravity Crush end-turn ordering uses current memory (memory first: ${memoryFirst})`, async ({ scenario }) => {
    await scenario.open("arena-github-5305-gravity-order");
    await scenario.resolveUntil((s) => !s.pendingDecision && s.memory === 4);
    await scenario.play("Gravity Crush", "Option");
    await scenario.resolveUntil((s) => !s.pendingDecision && s.memory === 6);
    await scenario.play("Vulcanusmon", "Digimon");
    let sawOrdering = false;
    let usedFactorial = false;
    const policy: DecisionPolicy = (decision) => {
      if (decision.kind === "orderTriggers" && decision.options.triggerCardIds?.includes("BT1-090")) {
        sawOrdering = true;
        expect(decision.options.triggerCardIds).toContain("BT24-085");
        return { triggerCardId: memoryFirst ? "BT1-090" : "BT24-085" };
      }
      if (/link|attack|battle/i.test(decision.promptText)) return { accept: false };
      if (decision.kind === "selectCards" && decision.options.candidateInstanceIds?.includes("dev-eot-factorial")) {
        usedFactorial = true;
        expect(memoryFirst).toBe(true);
        return { cardId: "BT25-102" };
      }
      if (decision.kind === "selectCards" && decision.options.candidateInstanceIds?.includes("dev-eot-mars"))
        return { cardId: "BT25-020" };
      return {};
    };
    await scenario.resolveUntil((s) => s.turnSeat === 1 && !s.pendingDecision, policy);
    expect(sawOrdering).toBe(true);
    expect(usedFactorial).toBe(memoryFirst);
    const final = await scenario.snapshot();
    expect(final.memory).toBe(memoryFirst ? 7 : 3);
    expect(final.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT25-020")).toBe(memoryFirst);
    expect(final.players[0]!.securityView.some((c) => c.cardId === "BT25-102" && c.faceUp)).toBe(memoryFirst);
    expect(final.players[0]!.hand.some((c) => c.cardId === "BT25-102")).toBe(!memoryFirst);
    const probe = await scenario.presentation();
    expect(
      probe.events.filter((e) => e.kind === "memoryChanged" && e.to - e.from === -2 && e.reason === "gainMemory"),
    ).toHaveLength(1);
    expect(probe.visible?.memory.value).toBe(final.memory);
    await scenario.healthy();
  });
}
