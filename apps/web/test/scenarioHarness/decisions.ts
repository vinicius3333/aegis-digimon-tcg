import { fireEvent, screen, waitFor, within } from "./testingLibrary";
import type { HeadlessOpponent } from "./headlessOpponent";
import { expect } from "vitest";
import type { DecisionRequest } from "@aegis/shared";

/**
 * Resolve one genuine simultaneous-effect ordering Decision through the rendered UI.
 *
 * Lone mandatory triggers resolve automatically, so callers use this helper only
 * after observing an `orderTriggers` Decision with multiple competing effects.
 * Reading the synchronized kind keeps it from mistaking an effect-body Decision
 * for the visually similar ordering overlay.
 */
export async function resolveNextTriggerThroughUi(opponent: HeadlessOpponent): Promise<boolean> {
  await waitFor(
    () => expect(opponent.room.state.pendingDecision?.kind).toBe("orderTriggers"),
    { timeout: 10_000 },
  );

  const pending = opponent.room.state.pendingDecision;
  if (pending?.kind !== "orderTriggers") return false;

  const decisionId = pending.decisionId;
  const dialog = await screen.findByRole("dialog", {}, { timeout: 10_000 });
  const resolveButton = within(dialog).getByRole("button", {
    name: /resolve (?:next )?effect/i,
  });
  const [triggerButton] = within(dialog).getAllByRole("button", { pressed: false });

  if (triggerButton === undefined) {
    throw new Error("orderTriggers overlay did not render a selectable trigger");
  }

  fireEvent.click(triggerButton);
  fireEvent.click(resolveButton);
  await waitFor(
    () => expect(opponent.room.state.pendingDecision?.decisionId).not.toBe(decisionId),
    { timeout: 10_000 },
  );
  return true;
}

/** Finish incidental effect-body prompts through the public desktop overlay. */
export async function resolveIncidentalDecisionsThroughUi(opponent: HeadlessOpponent): Promise<void> {
  for (let round = 0; round < 10; round += 1) {
    const request = opponent.room.state.pendingDecision;
    if (request === undefined) return;
    if (request.kind === "orderTriggers") {
      await resolveNextTriggerThroughUi(opponent);
      continue;
    }

    const decisionId = request.decisionId;
    const dialog = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    if (request.kind === "optional") {
      fireEvent.click(within(dialog).getByRole("button", { name: /no, decline/i }));
    } else if (request.kind === "selectCards" || request.kind === "chooseTargets") {
      const min = request.options?.min ?? 1;
      if (min === 0) {
        fireEvent.click(within(dialog).getByRole("button", { name: /^none$/i }));
      } else {
        const candidates = within(dialog)
          .getAllByRole("button", { pressed: false })
          .filter((candidate) => !candidate.hasAttribute("disabled"));
        for (const candidate of candidates.slice(0, min)) fireEvent.click(candidate);
        const confirm = within(dialog).getByRole("button", { name: /confirm target/i });
        await waitFor(() => expect(confirm.hasAttribute("disabled")).toBe(false));
        fireEvent.click(confirm);
      }
    } else if (request.kind === "orderCards") {
      fireEvent.click(within(dialog).getByRole("button", { name: /confirm order/i }));
    } else if (request.kind === "chooseOption") {
      fireEvent.click(within(dialog).getAllByRole("button")[0]!);
    } else {
      throw new Error(`unsupported incidental UI decision: ${request.kind}`);
    }

    await waitFor(
      () => expect(opponent.room.state.pendingDecision?.decisionId).not.toBe(decisionId),
      { timeout: 10_000 },
    );
  }
  throw new Error("incidental UI decisions did not settle within 10 rounds");
}

/** Keep the non-rendered seat moving while a scenario exercises the protagonist UI. */
export function respondToHeadlessDecision(opponent: HeadlessOpponent, request: DecisionRequest): boolean {
  const candidates = request.kind === "orderCards"
    ? request.options?.visibleInstanceIds ?? request.options?.candidateInstanceIds ?? []
    : request.options?.candidateInstanceIds ?? request.options?.visibleInstanceIds ?? [];
  const min = request.options?.min ?? 1;
  if (request.kind === "orderTriggers") {
    opponent.respondDecision(request.decisionId, {
      kind: "orderTriggers",
      order: (request.options?.triggerKeys ?? []).slice(0, 1),
    });
  } else if (request.kind === "selectCards") {
    opponent.respondDecision(request.decisionId, { kind: "selectCards", instanceIds: candidates.slice(0, min) });
  } else if (request.kind === "chooseTargets") {
    opponent.respondDecision(request.decisionId, { kind: "chooseTargets", instanceIds: candidates.slice(0, min) });
  } else if (request.kind === "orderCards") {
    opponent.respondDecision(request.decisionId, { kind: "orderCards", order: candidates });
  } else if (request.kind === "optional") {
    opponent.respondDecision(request.decisionId, { kind: "optional", accept: false });
  } else if (request.kind === "chooseOption") {
    opponent.respondDecision(request.decisionId, { kind: "chooseOption", optionIndex: 0 });
  } else {
    return false;
  }
  return true;
}
