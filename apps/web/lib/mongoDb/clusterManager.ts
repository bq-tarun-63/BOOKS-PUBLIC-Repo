import { MongoClient } from "mongodb";
/**
 * ` process.env.CONTENT_CLUSTERSprocess.env.CONTENT_CLUSTERS                         111
 */
// Your clusters from environment
const CONTENT_CLUSTERS = [
  {
    name: "c0",
    uri: process.env.C0_MONGODB_URI ||"mongodb+srv://praveensharma:tPYBtzijGxwxOKCr@cluster0.s075vto.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  },
  {
    name: "c1", 
    uri: process.env.C1_MONGODB_URI || "mongodb+srv://tarundubey:nCEyyprEXbz5wVqL@c1.0f7vmp8.mongodb.net/?retryWrites=true&w=majority&appName=C1"
  },


];

class ClusterManager {
  private clients: Map<string, MongoClient> = new Map();

  async getClient(clusterName: string): Promise<MongoClient> {
    // If we already have this client, return it

    if (this.clients.has(clusterName)) {
      return this.clients.get(clusterName)!;
    }
    let cluster;
   if(clusterName=="META_MONGO_URI"){
    cluster = {name: "META_MONGO_URI", uri: process.env.META_MONGO_URI || "mongodb+srv://praveensharma:tPYBtzijGxwxOKCr@cluster0.s075vto.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"};
   }
   else{
    cluster = CONTENT_CLUSTERS.find(c => c.name === clusterName);
   }
    if (!cluster) {
      throw new Error(`Cluster ${clusterName} not found`);
    }
    console.log("cluster", cluster);
    // Check if URI is valid
    if (cluster.uri === "none" || !cluster.uri?.includes("mongodb")) {
      throw new Error(`Cluster ${clusterName} has invalid URI`);
    }

    try {
      // Create new client
      const client = new MongoClient(cluster.uri);
      await client.connect();
      
      // Store it for reuse
      this.clients.set(clusterName, client);
      
      console.log(`✅ Connected to cluster: ${clusterName}`);
      return client;
    } catch (error) {
      console.error(`❌ Failed to connect to cluster ${clusterName}:`, error);
      
      // If this is a content cluster (not cluster0) and it fails, fall back to cluster0
      if (clusterName !== "cluster0") {
        console.warn(`Falling back to cluster0 for content storage`);
        return this.getMetadataClient();
      }
      
      throw error;
    }
  }

  // Always get cluster0 for metadata
  async getMetadataClient(): Promise<MongoClient> {
    return this.getClient("META_MONGO_URI");
  }

  // Get any content cluster
  async getContentClient(clusterName: string): Promise<MongoClient> {
    if (clusterName === "cluster0") {
      // Allow cluster0 to be used for content as fallback
      return this.getMetadataClient();
    }
    return this.getClient(clusterName);
  }

  // Select a content cluster for new notes (round-robin or hash-based)
  selectContentCluster(noteId: string): string {
    const contentClusters = CONTENT_CLUSTERS.filter(c => c.name !== "cluster0");
    
    // If no content clusters available, fall back to cluster0
    if (contentClusters.length === 0) {
      console.warn("No content clusters available, falling back to cluster0");
      return "cluster0";
    }
    
    // Simple hash-based selection for consistent distribution
    let hash = 0;
    for (let i = 0; i < noteId.length; i++) {
      const char = noteId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const clusterIndex = Math.abs(hash) % contentClusters.length;
    const selectedCluster = contentClusters[clusterIndex];
    if (!selectedCluster) {
      console.warn("No content clusters available, falling back to cluster0");
      return "cluster0";
    }
    
    console.log(`Selected cluster ${selectedCluster.name} for note ${noteId}`);
    if (!selectedCluster.name) {
      console.warn("No cluster is available, falling back to cluster0");
      return "cluster0";
    }
    return selectedCluster.name;
  }

  // Generate a unique content ID
  generateContentId(): string {
    return new Date().getTime().toString() + Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
export const clusterManager = new ClusterManager();
export default clusterManager;
