// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-069 — Gaia Reactor.
const deleteExceptHighest = (controller: "mine" | "opponent") => ({
  kind: "Delete",
  target: {
    filter: { controller, kind: ["Digimon"] },
    count: "all",
    except: {
      filter: { controller, kind: ["Digimon"] },
      count: 1,
      selector: "highestPlayCost",
    },
  },
});

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [deleteExceptHighest("mine"), deleteExceptHighest("opponent")],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-069", compiled);
