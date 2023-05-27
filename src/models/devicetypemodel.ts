import { BaseModel } from './basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface IDeviceType extends Document {
    _id: Types.ObjectId;
    DeviceType: string;
   
}

export class DeviceType extends BaseModel {
    _id?: Types.ObjectId;
    DeviceType?: string;
   
}

const deviceType: Schema = new Schema({

    DeviceType: {
        type: String
    }

}, { timestamps: true });

export const deviceTypeModel = model<DeviceType>('devicetype', deviceType);