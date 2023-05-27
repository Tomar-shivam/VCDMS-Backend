import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface IEncoder extends Document {
    peerIP: string;
    properties: object;
    status: object;
    inputport: String;
    ircode: String;
    remotetype: String;
    Password:string
    AuthToken:string
    IsPasswordNeeded:boolean
    IsCorrect:boolean
    Modified?:boolean;
    LegacyIP?: string;
    srtOptimization?:boolean;
    presetOptimization?:boolean;
    hotBackup?:boolean;
    warningMessagesArray?:any[];
    spareIp?:String;
    spareIpPassword?:String;
    spareIpAuthToken?:String;
}

export class Encoder extends BaseModel {
    peerIP?: string;
    properties?: object;
    status?: object;
    inputport? : String;
    ircode?: String;
    remotetype?: String;
    Password?:string
    AuthToken?:string
    IsPasswordNeeded?:boolean
    IsCorrect?:boolean
    Modified?:boolean;
    LegacyIP?: string;
    srtOptimization?:boolean;
    presetOptimization?:boolean;
    hotBackup?:boolean;
    warningMessagesArray?:any[];
    spareIp?:String;
    spareIpPassword?:String;
    spareIpAuthToken?:String;
}

const EncoderSchema: Schema = new Schema({
    peerIP: {
        type: String
    },
    properties: {
        type: Object
    },
    status: {
        type: Object
    },
    inputport: {
        type: Object
    },
    remotetype: {
        type: Object
    },
    ircode: {
        type: Object
    },
    Password: {
        type: String
    },
    AuthToken: {
        type: String
    },
    IsPasswordNeeded: {
        type: Boolean
    },
    IsCorrect: {
        type: Boolean
    },
    Modified: {
        type: Boolean
    },
    LegacyIP:{
        type: String
    },
    srtOptimization:{
        type: Boolean,
        default:false
    },
    presetOptimization:{
        type: Boolean,
        default:false
    },
    hotBackup:{
        type: Boolean,
        default:false
    },

    warningMessagesArray:{
        type: Array,
    },
    spareIp:{
        type: String,
    },
    spareIpPassword:{
        type: String,
    },
    spareIpAuthToken:{
        type: String,
    }
}, { timestamps: true });

export const encoderModel = model<Encoder>('encoder', EncoderSchema);