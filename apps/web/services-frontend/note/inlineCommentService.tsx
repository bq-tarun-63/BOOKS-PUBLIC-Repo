export function extractCommentIds(content: any): string[] {
    const ids = new Set<string>();
  
    function traverse(node: any) {
      if (!node) return;
  
      // check node-level commentId
      if (node.attrs?.commentId) {
        ids.add(node.attrs.commentId);
      }
  
      // check marks (for inline comments)
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.attrs?.commentId) {
            ids.add(mark.attrs.commentId);
          }
        }
      }
  
      // recurse into children
      if (node.content) {
        for (const child of node.content) {
          traverse(child);
        }
      }
    }
  
    traverse(content);
    return Array.from(ids);
  }
  