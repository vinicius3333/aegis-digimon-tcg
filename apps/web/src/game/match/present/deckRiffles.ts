import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import { deckRiffleFromEvent } from "../../deckChrome";
import { deckRiffleStep } from "../steps/deckRiffleStep";

/**
 * The server names each deck it randomizes, which is the moment the reference client riffles
 * that pile.
 */
export function enqueueDeckRiffles({
  fresh,
  deckRiffleKeyRef,
  setDeckRiffles,
  enqueue,
}: {
  fresh: readonly ServerEvent[];
  /** Mutated: incremented per event so each riffle gets its own key. */
  deckRiffleKeyRef: MutableRefObject<number>;
  setDeckRiffles: Dispatch<SetStateAction<ReadonlySet<string>>>;
  enqueue: (step: AnimationStep) => void;
}) {
  for (const event of fresh) {
    deckRiffleKeyRef.current += 1;
    const riffle = deckRiffleFromEvent(event, deckRiffleKeyRef.current);
    if (!riffle) continue;
    enqueue(deckRiffleStep({ setDeckRiffles, riffle }));
  }
}
