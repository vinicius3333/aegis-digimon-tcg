import type { PackCard } from "@aegis/shared/packOpening/PackCard";
import type { BoosterProgress } from "@/packOpening/BoosterProgress";
import type { BoosterSet } from "@/packOpening/listBoosterSets";
import type { PackOpeningPhase } from "@/packOpening/PackOpeningPhase";

export type PackOpeningPresentation = {
  phase: PackOpeningPhase;
  selectedPack?: number;
  cards: PackCard[];
  revealedCount: number;
  bulkOpenedCount: number;
  batch: PackCard[][];
  batchIndex: number;
  summaryPage: number;
};

export type PackOpeningSource = {
  sets: BoosterSet[];
  initialSetId: string;
  progress: BoosterProgress;
  saveFailed: boolean;
  totalPacks: number;
  allocation?: readonly (readonly PackCard[])[];
  completedAllocation?: readonly (readonly PackCard[])[];
  remainingPacks?: number;
  completeOpening?: (remainingPacks?: number) => void;
  presentation?: PackOpeningPresentation;
  savePresentation?: (presentation: PackOpeningPresentation) => void;
  drawPacks: (params: { setId: string; count: number }) => PackCard[][];
  startBox: (setId: string) => void;
  startNextBox: (setId: string) => void;
};
