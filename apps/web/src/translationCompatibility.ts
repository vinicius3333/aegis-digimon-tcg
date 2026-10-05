/** Keep React's text-node references valid when the browser replaces them with translated <font> nodes. */
export function installTranslationCompatibility(root: HTMLElement): () => void {
  const removeChild = Node.prototype.removeChild;
  const insertBefore = Node.prototype.insertBefore;
  const nodeValue = Object.getOwnPropertyDescriptor(Node.prototype, "nodeValue")!;
  const translatedNodes = new WeakMap<Node, Node>();

  function translatedText(node: Node | null): node is HTMLElement {
    return node instanceof HTMLElement && node.tagName === "FONT" && node.style.verticalAlign === "inherit";
  }

  function remember(records: MutationRecord[]) {
    for (const record of records) {
      if (!root.contains(record.target)) continue;
      for (const removed of record.removedNodes) {
        if (removed.nodeType === Node.TEXT_NODE || translatedText(removed)) {
          const insertion = records.find(
            (candidate) =>
              candidate.target === record.target &&
              (candidate === record || candidate.nextSibling === removed || candidate.previousSibling === removed) &&
              [...candidate.addedNodes].some(translatedText),
          );
          const replacement = insertion && [...insertion.addedNodes].find(translatedText);
          if (replacement) translatedNodes.set(removed, replacement);
        }
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

  // Browser translation can replace React's Text nodes with FONT elements. Keep
  // React's subsequent mutations aimed at that replacement, within this root only.
  function compatibleRemoveChild<T extends Node>(this: Node, child: T): T {
    const replacement = child.parentNode !== this ? replacementIn(this, child) : undefined;
    if (replacement) {
      removeChild.call(this, replacement);
      return child;
    }
    return removeChild.call(this, child) as T;
  }
  function compatibleInsertBefore<T extends Node>(this: Node, child: T, reference: Node | null): T {
    const replacement = reference && reference.parentNode !== this ? replacementIn(this, reference) : undefined;
    return insertBefore.call(this, child, replacement ?? reference) as T;
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
