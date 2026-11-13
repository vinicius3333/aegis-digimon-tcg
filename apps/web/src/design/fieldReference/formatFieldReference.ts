export function formatFieldReference(permanentId: string): string {
  return `#${permanentId.replace(/^perm-/, "")}`;
}
