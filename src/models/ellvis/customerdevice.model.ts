import { BaseModel } from '../basemodel'
import { ConnectedDevice } from '../ellvis/connecteddevices.model'
import { Document, Schema, Model, model, Types } from "mongoose"
import { ObjectID, ObjectId } from 'mongodb';

export interface ICustomerDevice extends Document {
    _id: Types.ObjectId;
    DeviceName: string;
    DeviceType: string;
    IP: string;
    ManagementIP:string;
    Region:string;
    RegionID: string;
    SystemID: string;
    status: object;
    Password: string;
    IsCorrect: boolean;
    IsPasswordNeeded: boolean
    AuthToken: string;
    Username: string;
    ActionTime: Date;
    ActionType: string;
    Module: string;
    Target: string;
    DeviceFrom: string;
    Modified: boolean;
    LegacyIP?: string;
    warningMessagesArray?:any[];
    srtOptimization?:boolean;
    presetOptimization?:boolean;
    hotBackup?:boolean;
    spareIp?:string;
    spareIpUsername?:string;
    spareIpPassword?:string;
}

export class CustomerDevice extends BaseModel {
    _id?: Types.ObjectId;
    DeviceName?: string;
    DeviceType?: string;
    IP?: string;
    ManagementIP?:string;
    Region?:string;
    RegionID?: string;
    SystemID?: string;
    status?: object;
    Password?: string;
    IsCorrect?: boolean;
    IsPasswordNeeded?: boolean;
    AuthToken?: string;
    DeviceFrom?:string;
    Modified?:boolean;
    LegacyIP?: string;
    warningMessagesArray?:any[];
    srtOptimization?:boolean;
    presetOptimization?:boolean;
    hotBackup?:boolean;
    spareIp?:string;
    spareIpUsername?:string;
    spareIpPassword?:string;
}

const CustomerDeviceSchema: Schema = new Schema({

    DeviceName: {
        type: String
    },

    DeviceType: {
        type: String
    },

    IP: {
        type: String
    },

    ManagementIP: {
        type: String
    },

    Region: {
        type: String
    },

    RegionID: {
        type: String
    },

    SystemID: {
        type: String
    },
    status: {
        type: Object
    },
    Password: {
        type: String
    },
    IsCorrect: {
        type: Boolean
    },
    IsPasswordNeeded: {
        type: Boolean
    },
    AuthToken: {
        type: String
    },
    DeviceFrom: {   
        type: String
    },
    Modified: {
        type: Boolean
    },
    LegacyIP:{
        type: String
    },
    warningMessagesArray:{
        type: Array,
    },srtOptimization:{
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
    spareIp:{
        type: String,
        default:''
    },
    spareIpUsername:{
        type: String,
        default:''
    },
    spareIpPassword:{
        type: String,
        default:''
    }
}, { timestamps: true });

export const customerDeviceModel = model<CustomerDevice>('devices', CustomerDeviceSchema);