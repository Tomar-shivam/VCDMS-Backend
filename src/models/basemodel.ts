import { Document, model, Schema } from "mongoose"

export interface IBaseSession extends Document {
    createdDate: Date;
    updatedDate: Date;
}

export class BaseSession {
    createdDate?: Date;
    updatedDate?: Date;
}

const BaseSchema: Schema = new Schema({
    createdDate: {
        type: Date
    },
    updatedDate: {
        type: Date
    },  
}, { timestamps: true });

export const BaseModel = model<IBaseSession>('BaseSession', BaseSchema);