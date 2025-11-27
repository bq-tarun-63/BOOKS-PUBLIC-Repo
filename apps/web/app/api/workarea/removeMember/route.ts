import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const body = await req.json();
    const { workAreaId, memberId } = body;

    // Validate required fields
    if (!workAreaId || !memberId) {
      return NextResponse.json(
        {
          error: "workAreaId and memberId are required",
        },
        { status: 400 }
      );
    }

    // Get the work area to verify permissions
    const client = await clientPromise();
    const db = client.db();
    const workAreasCollection = db.collection("workAreas");

    const workArea = await workAreasCollection.findOne({
      _id: new ObjectId(workAreaId),
    });

    if (!workArea) {
      return NextResponse.json(
        { error: "Work area not found" },
        { status: 404 }
      );
    }

    // Check if current user is the owner
    const isOwner = String(workArea.ownerId) === String(user._id);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Only the work area owner can remove members" },
        { status: 403 }
      );
    }

    // Check if trying to remove the owner
    const memberToRemove = workArea.members?.find(
      (m: any) =>
        String(m.userId) === String(memberId) ||
        m.userEmail === memberId
    );

    if (memberToRemove?.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the work area owner" },
        { status: 400 }
      );
    }

    // Remove the member - MongoDB $pull doesn't support $or directly
    // Filter the members array manually
    const filteredMembers = (workArea.members || []).filter((m: any) => {
      const matchesUserId = String(m.userId) === String(memberId) || 
                           String(m.userId) === String(new ObjectId(memberId));
      const matchesUserEmail = m.userEmail === memberId;
      return !(matchesUserId || matchesUserEmail);
    });

    // Update with filtered members
    const updatedWorkArea = await workAreasCollection.findOneAndUpdate(
      { _id: new ObjectId(workAreaId) },
      {
        $set: {
          members: filteredMembers,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedWorkArea) {
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Member removed successfully",
        workArea: updatedWorkArea,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error removing member from work area:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

