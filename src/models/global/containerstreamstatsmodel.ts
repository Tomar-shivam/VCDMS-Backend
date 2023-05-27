import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface IContainersStreamStats extends Document {
    _id: string;
    DeviceName: string;
    RegionID: string;
    SystemID: string;
    CustomerID: string;
    deviceip: string;
    Id: string;
    state: string;
    comment: string;
    qamConfig: object;
    interval: string;
    ps: string;
    contimeo: string;
    tlpktdrop: string;
    pbkeylen: string;
    passphrase: string;
    sourceLatency: string;
    sourceProtocol: string;
    sourceEncryption: string;
    sourceEncryptionKey: string;
    sourceTimeout: string;
    sourceIP: string;
    sourcePort: string;
    sourceSSMIP: string;
    sourceOutgoingPort: string;
    sourceAdapter: string;
    sourceTtl: string;
    sourceSrtMode: string;
    sourceDropPackets: string;
    destProtocol: string;
    destIP: string;
    destTtl: string;
    destPort: string;
    destOutgoingPort: string;
    destSrtMode: string;
    destAdapter: string;
    destLatency: string;
    destTimeout: string;
    destEncryption: string;
    destEncryptionKey: string;
    destDropPackets: string;
    destDashSegmentDuration: string;
    destDashMinUpdatePeriod: string;
    destDashMinBufferTime: string;
    destDashSuggestedPresentationDelay: string;
    destDashTimeShiftBufferDepth: string;
    destDashPreservedSegmentsOutsideOfLiveWindow: string;
    destDashSegmentTemplateConstantDuration: string;
    destDashDir: string;
    destHlsSegmentDuration: string;
    destHlsFragmentDuration: string;
    destHlsTimeShiftBufferDepth: string;
    destHlsPreservedSegmentsOutsideOfLiveWindow: string;
    destHlsEnableIframe: string;
    destRtmpLocation: string;
    inputStream: string;
    outputStream: string;
    streamId: string;
    dir: string;
    input: string;
    output: string;
    streamcomment: string;
    peerIP: string;
    status: string;
    inputStats: object;
    outputStats: object;
    properties: object;
    sourceAdapterName: string;
    destAdapterName: string;
    isSavedHistory: boolean;
    DeviceID: string;
    sentMailStatus: string;
    Password: string;
    IsCorrect: boolean;
    IsPasswordNeeded: boolean;
    AuthToken: string;
    IsEncoderNeeded: boolean;
    MailStatus: string;
}

export class ContainersStreamStats extends BaseModel {
    _id?: string;
    DeviceName?: string;
    RegionID?: string;
    SystemID?: string;
    CustomerID?: string;
    deviceip?: string;
    Id?: string;
    state?: string;
    comment?: string;
    qamConfig?: object;
    interval?: string;
    ps?: string;
    contimeo?: string;
    tlpktdrop?: string;
    pbkeylen?: string;
    passphrase?: string;
    sourceLatency?: string;
    sourceProtocol?: string;
    sourceEncryption?: string;
    sourceEncryptionKey?: string;
    sourceTimeout?: string;
    sourceIP?: string;
    sourcePort?: string;
    sourceSSMIP?: string;
    sourceOutgoingPort?: string;
    sourceAdapter?: string;
    sourceTtl?: string;
    sourceSrtMode?: string;
    sourceDropPackets?: string;
    destProtocol?: string;
    destIP?: string;
    destTtl?: string;
    destPort?: string;
    destOutgoingPort?: string;
    destSrtMode?: string;
    destAdapter?: string;
    destAdapterName?: string;
    destLatency?: string;
    destTimeout?: string;
    destEncryption?: string;
    destEncryptionKey?: string;
    destDropPackets?: string;
    destDashSegmentDuration?: string;
    destDashMinUpdatePeriod?: string;
    destDashMinBufferTime?: string;
    destDashSuggestedPresentationDelay?: string;
    destDashTimeShiftBufferDepth?: string;
    destDashPreservedSegmentsOutsideOfLiveWindow?: string;
    destDashSegmentTemplateConstantDuration?: string;
    destDashDir?: string;
    destHlsSegmentDuration?: string;
    destHlsFragmentDuration?: string;
    destHlsTimeShiftBufferDepth?: string;
    destHlsPreservedSegmentsOutsideOfLiveWindow?: string;
    destHlsEnableIframe?: string;
    destRtmpLocation?: string;
    inputStream?: string;
    outputStream?: string;
    streamId?: string;
    dir?: string;
    input?: string;
    output?: string;
    streamcomment?: string;
    peerIP?: string;
    status?: string;
    inputStats?: object;
    outputStats?: object;
    properties?: object;
    sourceAdapterName?: string;
    isSavedHistory?: boolean;
    DeviceID?: string;
    sentMailStatus?: string;
    Password?: string;
    IsCorrect?: boolean;
    IsPasswordNeeded?: boolean;
    AuthToken?: string;
    IsEncoderNeeded?: boolean;
    MailStatus?: string;
}

const ContainersStreamStatsSchema: Schema = new Schema({
    _id: {
        type: String
    },
    DeviceID: {
        type: String
    },
    DeviceName: {
        type: String
    },
    RegionID: {
        type: String
    },
    SystemID: {
        type: String
    },
    CustomerID: {
        type: String
    },
    deviceip: {
        type: String
    },
    Id: {
        type: String
    },
    state: {
        type: String
    },
    comment: {
        type: String
    },
    qamConfig: {
        type: Object
    },
    interval: {
        type: String
    },
    ps: {
        type: String
    },
    contimeo: {
        type: String
    },
    tlpktdrop: {
        type: String
    },
    pbkeylen: {
        type: String
    },
    passphrase: {
        type: String
    },
    sourceLatency: {
        type: String
    },
    sourceProtocol: {
        type: String
    },
    sourceEncryption: {
        type: String
    },
    sourceEncryptionKey: {
        type: String
    },
    sourceTimeout: {
        type: String
    },
    sourceIP: {
        type: String
    },
    sourcePort: {
        type: String
    },
    sourceSSMIP: {
        type: String
    },
    sourceOutgoingPort: {
        type: String
    },
    sourceAdapter: {
        type: String
    },
    sourceTtl: {
        type: String
    },
    sourceSrtMode: {
        type: String
    },
    sourceDropPackets: {
        type: String
    },
    destProtocol: {
        type: String
    },
    destIP: {
        type: String
    },
    destTtl: {
        type: String
    },
    destPort: {
        type: String
    },
    destOutgoingPort: {
        type: String
    },
    destSrtMode: {
        type: String
    },
    destAdapter: {
        type: String
    },
    destLatency: {
        type: String
    },
    destTimeout: {
        type: String
    },
    destEncryption: {
        type: String
    },
    destEncryptionKey: {
        type: String
    },
    destDropPackets: {
        type: String
    },
    destDashSegmentDuration: {
        type: String
    },
    destDashMinUpdatePeriod: {
        type: String
    },
    destDashMinBufferTime: {
        type: String
    },
    destDashSuggestedPresentationDelay: {
        type: String
    },
    destDashTimeShiftBufferDepth: {
        type: String
    },
    destDashPreservedSegmentsOutsideOfLiveWindow: {
        type: String
    },
    destDashSegmentTemplateConstantDuration: {
        type: String
    },
    destDashDir: {
        type: String
    },
    destHlsSegmentDuration: {
        type: String
    },
    destHlsFragmentDuration: {
        type: String
    },
    destHlsTimeShiftBufferDepth: {
        type: String
    },
    destHlsPreservedSegmentsOutsideOfLiveWindow: {
        type: String
    },
    destHlsEnableIframe: {
        type: String
    },
    destRtmpLocation: {
        type: String
    },
    inputStream: {
        type: String
    },
    outputStream: {
        type: String
    },
    streamId: {
        type: String
    },
    dir: {
        type: String
    },
    input: {
        type: String
    },
    output: {
        type: String
    },
    streamcomment: {
        type: String
    },
    peerIP: {
        type: String
    },
    status: {
        type: String
    },
    inputStats: {
        type: Object
    },
    outputStats: {
        type: Object
    },
    properties: {
        type: Object
    },
    sourceAdapterName: {
        type: String
    },
    destAdapterName: {
        type: String
    },

    isSavedHistory: {
        type: Boolean
    },

    sentMailStatus: {
        type: String
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
    IsEncoderNeeded: {
        type: Boolean
    },
    MailStatus: {
        type: String
    }

}, { timestamps: true });

export const containerStreamStatsModel = model<ContainersStreamStats>('containerstreamstats', ContainersStreamStatsSchema);