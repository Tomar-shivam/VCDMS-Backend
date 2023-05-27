import { BaseModel } from "../basemodel";
import { Document, Schema, Model, model, Types } from "mongoose";
export interface IAutoUploadJSONrules extends Document {
    _id: Types.ObjectId;
    IP: string;
    DeviceName: string;
    Range: string;
    // RangeTo: string;
    DeviceType: string;
    FileName: string;
    // CIDR: number;
}
export class AutoUploadJSONrules extends BaseModel {
    _id?: Types.ObjectId;
    IP?: string;
    DeviceName?: string;
    Range?: string;
    // RangeTo?: string;
    DeviceType?: string;
    FileName?: string;
    // CIDR?: number;

}

const AutoUploadJSONrulesSchema: Schema = new Schema(
    {
        IP: { type: String },
        DeviceName: { type: String },
        Range: { type: String },
        // RangeTo: { type: String },
        DeviceType: { type: String },
        FileName: { type: String },
        // CIDR: { type: Number }

    },
    { timestamps: true }
);

export const AutoUploadJSONrulesModel = model<AutoUploadJSONrules>("autouploadjsonrules", AutoUploadJSONrulesSchema);
