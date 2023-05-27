import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface INetworkSettings extends Document {
    eth: any[];
    deviceip: string;
    managementPort:string;
}

export class NetworkSettings extends BaseModel {
    eth?: any[];
    deviceip?: string;
    managementPort?: string;
}

const NetworkSettingsSchema: Schema = new Schema({
    eth: {
        type: Array
    },
    deviceip: {
        type: String
    },
    managementPort: {
        type: String
    }
}, { timestamps: true });

export const networkSettingsModel = model<NetworkSettings>('networksettings', NetworkSettingsSchema);