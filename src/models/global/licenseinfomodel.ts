import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface ILicenseInfo extends Document {
    licenses: object;
    deviceip: string;
    demoMode: string;
    demoModeTimeout: string;
    enableDASH: string;
    enableTSStats: string;
    enableVideoPreview: string;
    enableQam: string;
    enablePackager: string;
    enableRTMP: string;
    enableEllvis9000HP: string;
    enableSSLCertUpdate: string;
    appVersion: string;
}

export class LicenseInfo extends BaseModel {
    licenses?: object;
    deviceip?: string;
    demoMode?: string;
    demoModeTimeout?: string;
    enableDASH?: string;
    enableTSStats?: string;
    enableVideoPreview?: string;
    enableQam?: string;
    enablePackager?: string;
    enableRTMP?: string;
    enableEllvis9000HP?: string;
    enableSSLCertUpdate?: string;
    appVersion?: string;
}

const LicenseInfoSchema: Schema = new Schema({
    licenses: {
        type: Object
    },
    deviceip: {
        type: String
    },
    demoMode: {
        type: String
    },
    demoModeTimeout: {
        type: String
    },
    enableDASH: {
        type: String
    },
    enableTSStats: {
        type: String
    },
    enableVideoPreview: {
        type: String
    },
    enableQam: {
        type: String
    },
    enablePackager: {
        type: String
    },
    enableRTMP: {
        type: String
    },
    enableEllvis9000HP: {
        type: String
    },
    enableSSLCertUpdate: {
        type: String
    },
    appVersion: {
        type: String
    },
}, { timestamps: true });

export const liceseInfoModel = model<LicenseInfo>('licenseinfo', LicenseInfoSchema);