// Removes a node (and its descendants) from a tree array by _id
export function removeFromTree(tree: any[], targetId: string): any[] {
  return tree
    .filter((node) => node._id !== targetId)
    .map((node) => ({
      ...node,
      children: Array.isArray(node.children) ? removeFromTree(node.children, targetId) : [],
    }));
}

// Splits a tree into two: one with the target node (and its descendants) removed, and one with just the removed subtree
export function splitTree(tree: any[], targetId: string): { remainingTree: any[]; removedSubtree: any | null } {
  let removed: any = null;
  function helper(nodes: any[]): any[] {
    return nodes
      .filter((node) => {
        if (node._id === targetId) {
          removed = node;
          return false;
        }
        return true;
      })
      .map((node) => ({
        ...node,
        children: Array.isArray(node.children) ? helper(node.children) : [],
      }));
  }
  const remainingTree = helper(tree);
  return { remainingTree, removedSubtree: removed };
}
