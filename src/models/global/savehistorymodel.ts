import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface ISaveHistory extends Document {
    ContainerId: string;
    Bandwidth: object;
    MBitRate: object;
    RTT: object;
    Packets: object;
    PacketsLost:object;
    PacketsDropped:object;
    ReTransmittedPackets: object;
    BelatedPackets: string;
    OurDate: Date;
}

export class SaveHistory extends BaseModel {
    ContainerId?: string;
    Bandwidth?: object;
    MBitRate?: object;
    RTT?: object;
    Packets?: object;
    PacketsLost?:object;
    PacketsDropped?:object;
    ReTransmittedPackets?: object;
    BelatedPackets?: string;
    OurDate?: Date;
}

const SaveHistorySchema: Schema = new Schema({
    ContainerId: {
        type: String
    },
    Bandwidth: {
        type: Object
    },
    MBitRate: {
        type: Object
    },
    RTT: {
        type: Object
    },
    Packets: {
        type: Object
    },
    PacketsLost: {
        type: Object
    },
    PacketsDropped: {
        type: Object
    },
    ReTransmittedPackets: {
        type: Object
    },
    BelatedPackets: {
        type: String
    },
    OurDate: {
        type: Date
    }
}, { timestamps: true });

export const saveHistoryModel = model<SaveHistory>('savehistories', SaveHistorySchema);