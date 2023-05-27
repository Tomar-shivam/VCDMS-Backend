export class ReqEncoderschemas {
    ip: string = "";
    port: string = "";
    devicename: string = "";
    current_enc_preset: string = "";
    presets: Array<string> = [""];
    username: string = "";
    password: string = "";
    session: string = "";
    lcdpassword: string = "";
    ipArray: string[] = [];
    IsPasswordNeeded: boolean = true
    DeviceType: string = "";
    startType: string = "";
}

export class ReqEncoderStartStop {
    ip: string = "";
    port: string = "";
    devicename: string = "";
    current_enc_preset: string = "";
    presets: Array<string> = [""];
    username: string = "";
    password: string = "";
    session: string = "";
    lcdpassword: string = "";
    ipArray: string[] = [];
    RegionID: string = "";
    SystemID: string = "";
    deviceip: string = "";
    DeviceType: string = "";
    startType: string = "";
}
