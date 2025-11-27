import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import {IOrganization, Organization }from "@/models/types/Organization";



export const OrganizationService = {

  
  // async findByAllowedDomain(domain: string) {
  //   return Organization.findOne({ allowedDomains: domain });
  // },


  async createOrganization({
    name,
    allowedDomains,
    ownerId,
  }: {
    name: string;
    allowedDomains: string;
    ownerId: string | undefined;
  }) {
    if (!ownerId) {
      throw new Error("Owner ID is required");
    }
  
    const client = await clientPromise();
    const db = client.db();
    const organizationsCollection = db.collection("organizations");
  
    // ✅ Check if organization name or domain already exists (optimized: single query to find all conflicts)
    const existingOrgs = await organizationsCollection.find({
      $or: [
        { name: name.trim() },
        { allowedDomains: allowedDomains }
      ]
    }).toArray();
    
    if (existingOrgs.length > 0) {
      // Check all matching organizations to determine which conflicts exist
      let nameConflict = false;
      let domainConflict = false;
      
      for (const org of existingOrgs) {
        if (org.name === name.trim()) {
          nameConflict = true;
        }
        if (org.allowedDomains === allowedDomains) {
          domainConflict = true;
        }
      }
      
      // Provide specific error message based on conflicts found
      if (nameConflict && domainConflict) {
        throw new Error("Organization with this name and domain already exists");
      } else if (nameConflict) {
        throw new Error("Organization name already exists");
      } else if (domainConflict) {
        throw new Error("Organization already exists for this allowed domain");
      }
    }
    
    const og_Id = new ObjectId();
    // ✅ Create organization
    const newOrg = {
      _id: og_Id,
      name: name.trim(),
      allowedDomains: allowedDomains,
      ownerId: new ObjectId(ownerId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  
    const result = await organizationsCollection.insertOne(newOrg);
    
    const organizationId = result.insertedId;
    // ✅ Update user to include organization info
    await db.collection("users").updateOne(
      { _id: new ObjectId(ownerId) },
      {
        $set: {
         organizationId:og_Id,
          organizationDomain: newOrg.allowedDomains || null,
          updatedAt: new Date(),
        },
      }
    );
  
    return {
      id: organizationId,
      ...newOrg,
    };
  },
  async findByDomain({ domain }: { domain: string }) {
    const client = await clientPromise();
    const db = client.db();
    return db.collection("organizations").findOne({
     allowedDomains: domain,
    });
  },
  
};
