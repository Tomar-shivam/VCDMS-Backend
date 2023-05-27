import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface IDeviceReporting extends Document {
    _id: Types.ObjectId;
    RegionID: string;
    Region: string;
    DeviceName: string;
    DeviceIP: string;
    DeviceType:string;
    TimeCreated: Date;
    ActionType:string;
    Username:string;
}

export class DeviceReporting extends BaseModel {
    _id?: Types.ObjectId;
    RegionID?: string;
    Region?: string;
    DeviceName?: string;
    DeviceIP?: string;
    DeviceType?:string;
    TimeCreated?: Date;
    ActionType?:string;
    Username?:string;
}

const DeviceReportingSchema: Schema = new Schema({
    RegionID: { type: String },
    Region: { type: String },
    DeviceName: { type: String },
    DeviceIP: { type: String },
    DeviceType: { type: String },
    TimeCreated: { type: Date },
    ActionType:{type:String},
    Username:{type:String},
}, { timestamps: true });

export const deviceReportingModel = model<DeviceReporting>('devicereportings', DeviceReportingSchema);