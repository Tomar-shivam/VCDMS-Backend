import { BaseModel } from "../basemodel";
import { Document, Schema, Model, model, Types } from "mongoose";

export interface IMAJORALARMS extends Document {
  _id: Types.ObjectId;
  Type: string;
  Value: number;
  ActionTime: Date;
  ActionType: string;
  Module: string;
  Username: string;
  Target: string;
}

export class MAJORALARMS extends BaseModel {
  _id?: Types.ObjectId;
  Type?: string;
  Value?: number;
}

const MAJORALARMSSchema: Schema = new Schema(
  {
    Type: { type: String },
    Value: { type: Number },
  },
  { timestamps: true }
);

export const MAJORALARMSModel = model<MAJORALARMS>(
  "majoralarms",
  MAJORALARMSSchema
);
