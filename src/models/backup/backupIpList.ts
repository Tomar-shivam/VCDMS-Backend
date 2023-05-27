import { BaseModel } from "../basemodel";
import { Document, Schema, model, Types } from "mongoose";
export interface IBackupIp extends Document {
  _id: Types.ObjectId;
  SpareIp: string;
  DeviceType: string;
  Username: string;
  Password: string;
  Session: string;
  inUse?: Boolean;
}
export class BackupIpList extends BaseModel {
  _id?: Types.ObjectId;
  SpareIp?: string;
  DeviceType?: string;
  Username?: string;
  Password?: string;
  Session?: string;
  inUse?: Boolean;
}

const HotBackupIpListSchema: Schema = new Schema(
  {
    SpareIp: {
      type: String,
    },
    DeviceType: {
      type: String,
    },
    Username: {
      type: String,
    },
    Password: {
      type: String
    },
    Session: {
      type: String
    },
    inUse: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

export const HotbackupIpListModel = model<BackupIpList>("BackupIpList", HotBackupIpListSchema);