import { BaseModel } from "../basemodel";
import { Document, Schema, Model, model, Types } from "mongoose";

export interface ICron extends Document {
  _id: Types.ObjectId;
  CronTime: string;
  SaveHistory: string;
}

export class Cron extends BaseModel {
  _id?: Types.ObjectId;
  CronTime?: string;
  SaveHistory?: string;
}

const CronSchema: Schema = new Schema(
  {
    CronTime: {
      type: String,
    },
    SaveHistory: {
      type: String
    }
  },
  { timestamps: true }
);

export const cronModel = model<Cron>("crontimes", CronSchema);
