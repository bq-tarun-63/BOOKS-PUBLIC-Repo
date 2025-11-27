import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongoDb/mongodb";
import { canGetApprovedNotes } from "@/utils/CheckNoteAccess/getApprovedNotes/checkAccess";
export async function GET() {
  try {    if (!canGetApprovedNotes({ user })) {
      return NextResponse.json({ success: false, error: "Forbidden: Only admin can access approved notes." }, { status: 403 });
    }
    const client = await clientPromise();
    const db = client.db();
    const approvedNotes = await db.collection("approved").find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, notes: approvedNotes });
  } catch (error) {
    console.error("Error fetching approved notes:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch approved notes" }, { status: 500 });
  }
}
