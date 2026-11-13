import { useContext } from "react";
import { FieldReferenceForcedContext } from "@/design/fieldReference/FieldReferenceForcedContext";
import { useFieldReferenceVisible } from "@/design/fieldReference/useFieldReferenceVisible";

export function useBoardFieldReferenceVisible(): boolean {
  const forced = useContext(FieldReferenceForcedContext);
  return useFieldReferenceVisible() || forced;
}
