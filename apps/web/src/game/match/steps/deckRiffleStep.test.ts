// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import type { AnimationStepContext } from "../../animationQueue";
import { deckRiffleStep } from "./deckRiffleStep";

it("an older shuffle's late cleanup cannot clear its replacement occurrence", async () => {
  let state: ReadonlyMap<string, number> = new Map();
  const setDeckRiffles: Dispatch<SetStateAction<ReadonlyMap<string, number>>> = (update) => {
    state = typeof update === "function" ? update(state) : update;
  };
  const releases: (() => void)[] = [];
  const context: AnimationStepContext = {
    mode: "live",
    cancelled: false,
    skipping: false,
    wait: vi.fn<AnimationStepContext["wait"]>(() => new Promise((resolve) => releases.push(resolve))),
  };
  const first = deckRiffleStep({ setDeckRiffles, riffle: { key: 1, seat: 0, pile: "deck" } }).run(context);
  const second = deckRiffleStep({ setDeckRiffles, riffle: { key: 2, seat: 0, pile: "deck" } }).run(context);
  expect(state.get("0:deck")).toBe(2);
  releases[0]!();
  await first;
  expect(state.get("0:deck")).toBe(2);
  releases[1]!();
  await second;
  expect(state.size).toBe(0);
});
