/* The breeding step has no dialog: hatching, moving out and ending the step are
   answered on the board itself. These helpers drive the same three pieces a
   player does — the egg deck, the raising slot and the turn control. */

import { fireEvent, screen } from "./testingLibrary";
import { expect, vi } from "vitest";

const TIMEOUT = 20_000;

/**
 * The turn control only reads "End breeding" inside the viewer's own breeding
 * step, so finding it is also how a scenario waits for that step to open.
 */
export async function findEndBreedingControl(timeout = TIMEOUT): Promise<HTMLElement> {
  const control = await screen.findByRole("button", { name: /^end breeding$/i }, { timeout });
  await waitForBoardActions(timeout);
  return control;
}

/** Phase state can arrive before its announcement finishes; wait for the visible lock. */
export async function waitForBoardActions(timeout = TIMEOUT): Promise<void> {
  await vi.waitFor(
    () => {
      const control = screen.queryByRole("button", { name: /^end (?:phase|breeding)$/i }) as HTMLButtonElement | null;
      expect(control).not.toBeNull();
      expect(control?.disabled).toBe(false);
    },
    { timeout },
  );
}

/** Ends the breeding step from the board's turn control. */
export async function endBreedingStep(timeout = TIMEOUT): Promise<void> {
  fireEvent.click(await findEndBreedingControl(timeout));
  await vi.waitFor(() => expect(screen.queryByRole("button", { name: /^end breeding$/i })).toBeNull(), { timeout });
  await waitForBoardActions(timeout);
}

/**
 * Hatches a Digi-Egg by clicking the egg deck. The deck only takes a click while
 * hatching is legal, and its accessible name is "eggs · <count>".
 */
export async function hatchDigiEgg(timeout = TIMEOUT): Promise<void> {
  await findEndBreedingControl(timeout);
  fireEvent.click(screen.getByRole("button", { name: /^(?:eggs · \d+|hatch a digi-egg)$/i }));
  await vi.waitFor(() => expect(screen.queryByRole("button", { name: /^end breeding$/i })).toBeNull(), { timeout });
  await waitForBoardActions(timeout);
}

/**
 * Moves the raised Digimon into the battle area by clicking the viewer's own
 * raising slot — the only one carrying `data-drop="breeding-you"`.
 */
export async function moveFromBreedingArea(timeout = TIMEOUT): Promise<void> {
  await findEndBreedingControl(timeout);
  fireEvent.click(document.querySelector('[data-drop="breeding-you"]') as HTMLElement);
  await vi.waitFor(() => expect(screen.queryByRole("button", { name: /^end breeding$/i })).toBeNull(), { timeout });
  await waitForBoardActions(timeout);
}
