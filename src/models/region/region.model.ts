import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface IRegion extends Document {
    _id: Types.ObjectId;
    Email: string;
    Region: string;
    Contact: string;
    Username: string;
    ActionTime: Date;
    ActionType: string;
    Module: string;
    Target: string;
}

export class Region extends BaseModel {
    _id?: Types.ObjectId;
    Email?: string;
    Region?: string;
    Contact?: string
}

const RegionSchema: Schema = new Schema({

    Email: {
        type: String
    },

    Region: {
        type: String
    },

    Contact: {
        type: String
    }

}, { timestamps: true });

export const regionModel = model<Region>('regions', RegionSchema);