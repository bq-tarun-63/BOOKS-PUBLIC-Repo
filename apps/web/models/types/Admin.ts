// models/Admin.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
  email: string;
}

const AdminSchema = new Schema<IAdmin>({
  email: { type: String, required: true, unique: true },
});

export default mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);
