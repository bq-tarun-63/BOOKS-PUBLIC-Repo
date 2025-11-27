import clientPromise from "@/lib/mongoDb/mongodb";
import { IOrganization } from "@/models/types/Organization";
import { type IUser, User } from "@/models/types/User";
export const UserService = {

  async findUserByEmail({ email }: { email: string }): Promise<IUser | null> {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<IUser>("users");

    const user = await collection.findOne({ email });

    if (!user) {
      return null;
    }

    return User.formatUser(user);
  },

  async createUser({ userData }: { userData: { email: string; name?: string; image?: string } }): Promise<IUser> {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<IUser>("users");

    // Check if user with this email already exists
    const existingUser = await collection.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create index for email uniqueness if it doesn't exist
    await collection.createIndex({ email: 1 }, { unique: true });

    const newUser: IUser = {
      email: userData.email,
      name: userData.name || "",
      image: userData.image || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      accessibleNotes: [],
    };

    const result = await collection.insertOne(newUser);

    return {
      ...User.formatUser(newUser),
      _id: result.insertedId,
      id: result.insertedId.toString(),
    };
  },
  async findOrCreateUserFromSession({
    session,
  }: {
    session: { email: string; name?: string; image?: string };
  }): Promise<IUser> {
    const client = await clientPromise();
    const db = client.db();
    const usersCol = db.collection<IUser>("users");
    const orgsCol = db.collection<IOrganization>("organizations");
  
    // Try to find existing user
    const user = await usersCol.findOne({ email: session.email });
    if (user) {
      return User.formatUser(user);
    }
  
    // Extract domain from email
    const emailDomain = session.email.split("@")[1]?.toLowerCase();
    // Find matching organization by allowedDomains
    let matchedOrg ;
    if (emailDomain) {
       matchedOrg = await orgsCol.findOne({
        domains: emailDomain
      });
    }
    const now = new Date();
    const newUser: IUser = {
      email: session.email,
      name: session.name || "",
      image: session.image || "",
      createdAt: now,
      updatedAt: now,
      accessibleNotes: [],
      ...(matchedOrg
        ? {
            organizationId: matchedOrg._id,
            organizationName: matchedOrg.name,
            organizationDomain: emailDomain
          }
        : {})
    };
  
    const result = await usersCol.insertOne(newUser);
    newUser._id = result.insertedId;
  
    return User.formatUser(newUser);
  }
};
