import type { ReactNode } from "react";
import type { SealedPull } from "@aegis/shared/sealed/SealedContracts";

export type BoundedDeckPool = {
  pulls: readonly SealedPull[];
  disabled: boolean;
  footer: ReactNode;
  primaryAction?: ReactNode;
};
