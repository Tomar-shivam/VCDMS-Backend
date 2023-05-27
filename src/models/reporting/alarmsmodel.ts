import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface IAlarmsReporting extends Document {
    _id: Types.ObjectId;
    Subject:string;
    RegionID: string;
    Region: string;
    SystemID: string;
    System: string;
    Device: string;
    DeviceID: string;
    AlarmType: string;
    TimeCreated: Date;
    TimeCleared: Date;
    TimeInterval: string;
    ContainerID: string;
    StreamID: string;
    MailInformed: string;
}

export class AlarmsReporting extends BaseModel {
    _id?: Types.ObjectId;
    Subject?:string;
    RegionID?: string;
    Region?: string;
    SystemID?: string;
    System?: string;
    Device?: string;
    DeviceID?: string;
    AlarmType?: string;
    TimeCreated?: Date;
    TimeCleared?: Date;
    TimeInterval?: string;
    ContainerID?: string;
    StreamID?: string;
    MailInformed?: string;
}

const AlarmsReportingSchema: Schema = new Schema({
    Subject: { type: String },
    RegionID: { type: String },
    Region: { type: String },
    SystemID: { type: String },
    System: { type: String },
    Device: { type: String },
    DeviceID: { type: String },
    AlarmType: { type: String },
    TimeCreated: { type: Date },
    TimeCleared: { type: Date },
    TimeInterval: { type: String },
    ContainerID: { type: String },
    StreamID: { type: String },
    MailInformed: { type: String }
}, { timestamps: true });

export const alarmsReportingModel = model<AlarmsReporting>('alarmsreportings', AlarmsReportingSchema);