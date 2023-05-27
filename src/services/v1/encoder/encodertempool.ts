import { encoderModel } from '../../../models/global/encodermodel';
import { customerDeviceModel, CustomerDevice } from '../../../models/ellvis/customerdevice.model';
import { encoderControllerV1 } from '../../../controllers/v1/encoder/encodercontrollerv1';
import { regionModel } from '../../../models/region/region.model';
import { systemModel } from '../../../models/region/system.model';
import { licenseCheckModel } from '../../../models/licensemodel';
import { deviceReportingModel } from '../../../models/reporting/devicereportmodel';

class EncoderTemPool {
    // getting json and store it as a encoder in temp
    public StoreEncoder = async (headerIP: any, jsonData: any) => {
        try {
            // create a temp reasion
            let tempRegion: any = await regionModel.findOne({ Region: "OnBoardingRegion" });
            if (!tempRegion) {
                let model = new regionModel();
                model.Email = "sp@gmail.com";
                model.Region = "OnBoardingRegion";
                model.Contact = "6578943021";
                tempRegion = await model.save();
            }

            let tempSys: any = await systemModel.findOne({ System: "OnBoardingSystem" });
            if (!tempSys) {
                let sysmodel = new systemModel();
                sysmodel.Email = "sp@gmail.com";
                sysmodel.Contact = "sps@gmail.com";
                sysmodel.System = 'OnBoardingSystem';
                sysmodel.Location = tempRegion?.Region;
                sysmodel.RegionID = tempRegion?._id;
                tempSys = await sysmodel.save();
            }
            //Create device
            const checkDeviceType = (model) => {
                try {
                    if (model.includes("RM1121CXF")) {
                        return "RM1121HD/CXF"
                    } else if (model.includes("RM1121-HD") || model.includes("RM1121XD")) {
                        return "RM1121XD";
                    } else if (model == "VL4510") {
                        return "VL4510";
                    } else if (model.includes("VL4510C")) {
                        return "VL4510C";
                    } else if (model.includes("VL4510H")) {
                        return "VL4510H";
                    } else if (model.includes("VL4522")) {
                        return "VL4522";
                    } else if (model.includes("VL4522Q")) {
                        return "VL4522Q";
                    }
                } catch (error) {
                    return;
                }
            }
            let deviceIP = (headerIP !== jsonData?.device.ts_ip) && headerIP ? headerIP : jsonData?.device.ts_ip;
            let deviceType = await checkDeviceType(jsonData?.device.model)
            let req: any = {
                body: {
                    ip: deviceIP,
                    data: { "push_enabled": "N" }
                }
            }
            let res, next;
            // find device form encoderDevice model

            let findDevice: any = await customerDeviceModel.findOne({ IP: deviceIP });
            if (!findDevice && jsonData.device.ts_ip) {
                let status = {
                    encoder1_status: jsonData?.device.encoder1_status,
                    encoder_count: jsonData?.device.encoder_count,
                    input_framerate: jsonData?.device.input_framerate,
                    input_resolution: jsonData?.device.input_resolution,
                    opstate: jsonData?.device.opstate,
                    rtsp_state: jsonData?.device.rtsp_state,
                    status: jsonData?.device.status,
                    ts_dhcp_gateway: jsonData?.device.ts_dhcp_gateway,
                    ts_dhcp_ip: jsonData?.device.ts_dhcp_ip,
                    ts_dhcp_netmask: jsonData?.device.ts_dhcp_netmask,
                    ts_dhcp_state: jsonData?.device.ts_dhcp_state,
                    ts_mac: jsonData?.device.ts_mac
                }
                let OnBoardDevice = new customerDeviceModel();
                OnBoardDevice.IP = deviceIP;
                OnBoardDevice.status = status;
                OnBoardDevice.DeviceName = jsonData?.device?.model;
                OnBoardDevice.DeviceType = deviceType ? deviceType : jsonData.device.model;
                OnBoardDevice.RegionID = tempRegion._id;
                OnBoardDevice.SystemID = tempSys?._id;
                OnBoardDevice.Region = tempRegion?.Region;
                OnBoardDevice.IsPasswordNeeded = false;
                await OnBoardDevice.save();
                // find device form encoderModel
                let findEncoder = await encoderModel.findOne({ peerIP: deviceIP })
                if (!findEncoder) {
                    let OnBoardEncoder = new encoderModel();
                    OnBoardEncoder.peerIP = deviceIP;
                    OnBoardEncoder.properties = jsonData?.device ? jsonData?.device : {};
                    OnBoardEncoder.status = status;
                    OnBoardEncoder.IsPasswordNeeded = false;
                    OnBoardEncoder.IsCorrect = true;
                    OnBoardEncoder.Modified = false;
                    await OnBoardEncoder.save();
                    // after saving device  disabe push_enabled parameter
                    let model = new deviceReportingModel();
                    model.DeviceName = jsonData?.device?.model;
                    model.DeviceType = deviceType ? deviceType : jsonData.device.model;
                    model.DeviceIP = deviceIP;
                    model.Region = tempRegion?.Region;
                    model.ActionType = 'Added';
                    model.TimeCreated = new Date();
                    model.Username = "PUSH API";
                    await model.save();
                }
                const requestResult: any = encoderControllerV1.SaveSession(req, res, next);
                return { ack: "1", msg: "save device as OnBoard System" };
            }
            else {
                //if device already exist just save the getting property from json
                let allEncoder: any = await encoderModel.find({})
                if (allEncoder.length > 0 && findDevice.Region == "OnBoardingRegion") {
                    let encoderProperties = allEncoder.filter((first) => {
                        if (first.properties && first.properties.ts_mac == jsonData.device.ts_mac) {
                            return first;
                        }
                    })
                    if (jsonData.current_enc_preset && jsonData.current_enc_preset != "encoder factory default") {
                        // after saving device  disabe push_enabled parameter
                        const requestResult: any = await encoderControllerV1.SaveSession(req, res, next);
                        return { ack: "1", msg: "device not in a encoder factory default" };

                    }
                    else if (jsonData.device.ts_mac == encoderProperties[0]?.properties.ts_mac) {

                        let tempProperties = encoderProperties[0]?.properties;
                        let updateStatus = {
                            encoder1_status: tempProperties.encoder1_status,
                            encoder_count: tempProperties.encoder_count,
                            input_framerate: tempProperties.input_framerate,
                            input_resolution: tempProperties.input_resolution,
                            opstate: tempProperties.opstate,
                            rtsp_state: tempProperties.rtsp_state,
                            status: tempProperties.status,
                            ts_dhcp_gateway: tempProperties.ts_dhcp_gateway,
                            ts_dhcp_ip: tempProperties.ts_dhcp_ip,
                            ts_dhcp_netmask: tempProperties.ts_dhcp_netmask,
                            ts_dhcp_state: tempProperties.ts_dhcp_state,
                            ts_mac: tempProperties.ts_mac
                        }
                        let updatedProperties = Object.assign(tempProperties, jsonData.device)
                        await encoderModel.updateOne({ peerIP: encoderProperties[0].peerIP }, { $set: { properties: updatedProperties, status: updateStatus } })
                        // after saving device  disabe push_enabled parameter

                        const requestResult: any = await encoderControllerV1.SaveSession(req, res, next);
                        return { ack: "1", msg: "Device Properties updated" };

                    }

                } else {
                    const requestResult: any = await encoderControllerV1.SaveSession(req, res, next);
                    return { ack: "1", msg: "Device assigne to another region" };

                }

            }

        } catch (error) {
            return { ack: "0", msg: error };
        }
    }
}

export const encoderTemPool = new EncoderTemPool();