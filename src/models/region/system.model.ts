import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface ISystem extends Document {
    _id: Types.ObjectId;
    Email: string;
    Contact: string;
    RegionID: string;
    Location: string;
    System: string;
    Username: string;
    ActionType: string;
    ActionTime: Date;
    Module: string;
    Target: string;
}

export class System extends BaseModel {
    _id?: Types.ObjectId;
    Email?: string;
    Contact?: string;
    RegionID?: string;
    Location?: string;
    System?: string;
}

const SystemSchema: Schema = new Schema({

    Email: {
        type: String
    },

    System: {
        type: String
    },

    Contact: {
        type: String
    },

    RegionID: {
        type: String
    },

    Location: {
        type: String
    }
}, { timestamps: true });

export const systemModel = model<System>('systems', SystemSchema);