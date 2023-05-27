import { BaseModel } from "../basemodel";
import { Document, Schema, Model, model, Types } from "mongoose";

export interface ISnmp extends Document {
  _id: Types.ObjectId;
  SnmpManager: string;
  CommunityName: string;
  SnmpVersion: string;
  SnmpV3User: string;
  SnmpV3UserPassword: string;
  SnmpPort: string;
}

export class Snmp extends BaseModel {
  _id?: Types.ObjectId;
  SnmpManager?: string;
  CommunityName?: string;
  SnmpVersion?: string;
  SnmpV3User?: string;
  SnmpV3UserPassword?: string;
  SnmpPort?: string;
}

const SnmpSchema: Schema = new Schema(
  {
    SnmpManager: {
      type: String,
    },
    CommunityName: {
      type: String
    },
    SnmpVersion: {
      type: String
    },
    SnmpV3User: {
      type: String
    },
    SnmpV3UserPassword: {
      type: String
    },
    SnmpPort: {
      type: String
    },
  },
  { timestamps: true }
);
export const snmpModel = model<Snmp>("snmp", SnmpSchema);