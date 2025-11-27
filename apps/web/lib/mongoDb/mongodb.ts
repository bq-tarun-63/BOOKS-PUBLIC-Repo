import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import type { MongoClientOptions } from "mongodb";

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb+srv://praveensharma:tPYBtzijGxwxOKCr@cluster0.s075vto.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const options: MongoClientOptions = {
  maxPoolSize: 10, // ✅ Prevent pool exhaustion
  minPoolSize: 2,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

async function connectToDatabase(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;

  client = new MongoClient(uri, options);
  clientPromise = client
    .connect()
    .then((c) => {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ MongoDB connected");
      }
      return c;
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err);
      clientPromise = null;
      throw err;
    });

  return clientPromise;
}


export default connectToDatabase;
