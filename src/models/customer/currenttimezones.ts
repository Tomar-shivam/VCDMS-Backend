import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface ITimezone     extends Document {
    _id: Types.ObjectId
    Timezone: any;
    
}

export class timeZone extends BaseModel {
    _id?: Types.ObjectId
    Timezone?: any;
    
}

const timezoneSchema: Schema = new Schema({
    Timezone: {
        type: Object,
    }

}, { timestamps: true });

export const CurrentTimeZones = model<timeZone>('Currenttimezones', timezoneSchema)