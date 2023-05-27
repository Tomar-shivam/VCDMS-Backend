import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"


export interface IAlarmList extends Document {
    _id:Types.ObjectId;
    AlarmID: String;
    StreamName: string;
    EllvisType: string;
    LostPacket: string;
}

export class AlarmList extends BaseModel {
    _id?:Types.ObjectId;
    AlarmID?: String;
    StreamName?: string;
    EllvisType?: string;
    LostPacket?: string;
}

const AlarmListSchema: Schema = new Schema({

    AlarmID :{
        type: String
    },

    StreamName :{
        type: String
    },

    EllvisType: {
        type: String
    },

    LostPacket: {
        type: String
    }

}, { timestamps: true });

export const AlarmListModel = model<AlarmList>('alarms', AlarmListSchema);