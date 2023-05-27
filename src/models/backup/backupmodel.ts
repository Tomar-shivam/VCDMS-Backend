import { BaseModel } from "../basemodel";
import { Document, Schema, model, Types } from "mongoose";

export interface IBackup extends Document {
  _id: Types.ObjectId;
  user: string;
  host: string;
  location: string;
  username: string;
  password: string;
  port:number;
}

export class Backup extends BaseModel {
  _id?: Types.ObjectId;
  user?: string;
  host?: string;
  location?: string;
  username?: string;
  password?: string;
  port?:number;
}

const BackupSchema: Schema = new Schema(
  {
    user: {
      type: String,
    },
    host: {
      type: String,
    },
    location: {
      type: String,
    },
    username: {
      type: String,
    },
    password: {
      type: String,
    },
    port: {
      type:Number,
    }
  },
  { timestamps: true }
);

export const backupmodel = model<Backup>("backuphost", BackupSchema);
