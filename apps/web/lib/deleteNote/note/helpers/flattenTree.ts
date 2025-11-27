// Flattens a tree array into an array of all note _id strings (including the root of the subtree)
export function flattenTree(tree: any[]): string[] {
  let ids: string[] = [];
  for (const node of tree) {
    if (node._id) ids.push(node._id.toString());
    if (Array.isArray(node.children) && node.children.length > 0) {
      ids = ids.concat(flattenTree(node.children));
    }
  }
  return ids;
}
