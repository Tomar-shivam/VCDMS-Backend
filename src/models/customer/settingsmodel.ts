import { BaseModel } from "../basemodel";
import { Document, Schema, Model, model, Types } from "mongoose";

export interface ISETTINGS extends Document {
  _id: Types.ObjectId;
  HttpHttps: string;
  ActionTime: Date;
  ActionType: string;
  Module: string;
  Username: string;
  Target: string;
}

export class SETTINGS extends BaseModel {
  _id?: Types.ObjectId;
  HttpHttps?: string;
}

const SETTINGSSchema: Schema = new Schema(
  {
    HttpHttps: {
      type: String,
    },
  },
  { timestamps: true }
);

export const SETTINGSModel = model<SETTINGS>("settings", SETTINGSSchema);
