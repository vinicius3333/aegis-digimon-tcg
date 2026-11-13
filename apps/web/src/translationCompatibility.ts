/** Keep React's text-node references valid when the browser replaces them with translated <font> nodes. */
export function installTranslationCompatibility(
  container: HTMLElement,
  reportToleratedMutation?: (error: Error) => void,
): () => void {
  const root = container.ownerDocument.body;
  const removeChild = Node.prototype.removeChild;
  const insertBefore = Node.prototype.insertBefore;
  const nodeValue = Object.getOwnPropertyDescriptor(Node.prototype, "nodeValue")!;
  const translatedNodes = new WeakMap<Node, Node>();
  const vacatedPositions = new WeakMap<Node, { parent: Node; nextSibling: Node | null }>();
  const ownDetachments = new WeakSet<Node>();
  const displacedNodes = new WeakSet<Node>();

  function translatedText(node: Node | null): node is HTMLElement {
    return node instanceof HTMLElement && node.tagName === "FONT" && node.style.verticalAlign === "inherit";
  }

  function replaceableText(node: Node): boolean {
    return node.nodeType === Node.TEXT_NODE || translatedText(node);
  }

  function remember(records: MutationRecord[]) {
    for (const record of records) {
      if (!root.contains(record.target)) continue;
      for (const removed of record.removedNodes) {
        if (ownDetachments.delete(removed)) continue;
        displacedNodes.add(removed);
        vacatedPositions.set(removed, { parent: record.target, nextSibling: record.nextSibling });
        if (!replaceableText(removed)) continue;
        const insertion = records.find(
          (candidate) =>
            candidate.target === record.target &&
            (candidate === record ||
              candidate.nextSibling === removed ||
              candidate.previousSibling === removed ||
              (candidate.previousSibling === record.previousSibling && candidate.nextSibling === record.nextSibling)) &&
            [...candidate.addedNodes].some(replaceableText),
        );
        const replacement = insertion && [...insertion.addedNodes].find(replaceableText);
        if (replacement && replacement !== removed) translatedNodes.set(removed, replacement);
      }
    }
  }
  const observer = new MutationObserver(remember);
  observer.observe(root, { childList: true, subtree: true });

  function replacementIn(parent: Node, child: Node): Node | undefined {
    if (!root.contains(parent)) return undefined;
    remember(observer.takeRecords());
    let replacement = translatedNodes.get(child);
    const visited = new Set<Node>();
    while (replacement && !visited.has(replacement)) {
      if (replacement.parentNode === parent) return replacement;
      visited.add(replacement);
      replacement = translatedNodes.get(replacement);
    }
    return undefined;
  }

  function vacatedFrom(parent: Node, child: Node): boolean {
    return root.contains(parent) && vacatedPositions.get(child)?.parent === parent;
  }

  function holderIn(parent: Node, node: Node): Node | undefined {
    if (!root.contains(parent)) return undefined;
    let holder = node.parentNode;
    while (holder && holder.parentNode !== parent) holder = holder.parentNode;
    return holder ?? undefined;
  }

  function displacedFrom(parent: Node, child: Node): boolean {
    if (!root.contains(parent)) return false;
    return vacatedFrom(parent, child) || displacedNodes.has(child) || holderIn(parent, child) !== undefined;
  }

  function referenceIn(parent: Node, reference: Node): Node | null | undefined {
    const visited = new Set<Node>();
    let candidate: Node | null = reference;
    while (candidate && !visited.has(candidate)) {
      if (candidate.parentNode === parent) return candidate;
      visited.add(candidate);
      const replacement = replacementIn(parent, candidate);
      if (replacement) return replacement;
      const holder = holderIn(parent, candidate);
      if (holder) return holder;
      if (!vacatedFrom(parent, candidate)) return displacedFrom(parent, candidate) ? null : undefined;
      candidate = vacatedPositions.get(candidate)!.nextSibling;
    }
    return candidate === null ? null : undefined;
  }

  // Browser translation can replace React's Text nodes with FONT elements or new
  // Text nodes. Keep React's subsequent mutations aimed at that replacement, or at
  // the vacated position, within this root only.
  function compatibleRemoveChild<T extends Node>(this: Node, child: T): T {
    if (child.parentNode === this) {
      ownDetachments.add(child);
      return removeChild.call(this, child) as T;
    }
    const replacement = replacementIn(this, child);
    if (replacement) {
      ownDetachments.add(replacement);
      removeChild.call(this, replacement);
      return child;
    }
    if (displacedFrom(this, child)) {
      const tracked = vacatedFrom(this, child) && replaceableText(child);
      const holder = child.parentNode;
      if (holder && root.contains(holder)) {
        ownDetachments.add(child);
        removeChild.call(holder, child);
      }
      if (!tracked) reportToleratedMutation?.(new Error("Tolerated removeChild of a node moved by foreign code"));
      return child;
    }
    return removeChild.call(this, child) as T;
  }
  function compatibleInsertBefore<T extends Node>(this: Node, child: T, reference: Node | null): T {
    if (child.parentNode) ownDetachments.add(child);
    const resolved = reference && reference.parentNode !== this ? referenceIn(this, reference) : reference;
    if (reference && resolved !== undefined && resolved !== reference && !replaceableText(reference)) {
      reportToleratedMutation?.(new Error("Tolerated insertBefore a node moved by foreign code"));
    }
    return insertBefore.call(this, child, resolved === undefined ? reference : resolved) as T;
  }
  Node.prototype.removeChild = compatibleRemoveChild;
  Node.prototype.insertBefore = compatibleInsertBefore;
  function compatibleNodeValue(this: Node, value: string | null) {
    nodeValue.set!.call(this, value);
    remember(observer.takeRecords());
    let replacement = translatedNodes.get(this);
    const visited = new Set<Node>();
    while (replacement && !visited.has(replacement)) {
      if (root.contains(replacement)) {
        replacement.textContent = value;
        return;
      }
      visited.add(replacement);
      replacement = translatedNodes.get(replacement);
    }
  }
  Object.defineProperty(Node.prototype, "nodeValue", { ...nodeValue, set: compatibleNodeValue });
  return () => {
    observer.disconnect();
    if (Node.prototype.removeChild === compatibleRemoveChild) Node.prototype.removeChild = removeChild;
    if (Node.prototype.insertBefore === compatibleInsertBefore) Node.prototype.insertBefore = insertBefore;
    if (Object.getOwnPropertyDescriptor(Node.prototype, "nodeValue")?.set === compatibleNodeValue) {
      Object.defineProperty(Node.prototype, "nodeValue", nodeValue);
    }
  };
}
