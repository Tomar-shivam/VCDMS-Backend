import { customerDeviceModel } from "../../../models/ellvis/customerdevice.model";
import { AutoUploadJSONrulesModel } from "../../../models/global/autoUploadJSONmodel";
import { encoderModel } from "../../../models/global/encodermodel";
import { encoderControllerV1 } from "../../../controllers/v1/encoder/encodercontrollerv1";
import { commonUtil } from "../../../utils/commonUtil";
const Netmask = require('netmask').Netmask

class AutoWorkFlowForOnBoardingDevice {

    public checkAutomatedWorkflowForAutoUploadJSON = async () => {
        // onboarding device
        // let onBordingDeviceIpArray: any = [];
        // let getonBoardDeviceIp = await customerDeviceModel.find({ Region: "OnBoardingRegion" })
        // for (let i = 0; i < getonBoardDeviceIp.length; i++) {
        //     onBordingDeviceIpArray.push(getonBoardDeviceIp[i].IP)
        // }
        // let onBoardDeviceIp = await encoderModel.find({ peerIP: { $in: onBordingDeviceIpArray } })
        let onBoardDeviceIp = await encoderModel.find({})
        // running thread
        const promises = onBoardDeviceIp.map(async (encoder: any) => {
            let device = await customerDeviceModel.findOne({ IP: encoder.peerIP });
            if (device?.Region === 'OnBoardingRegion') {
                let rules: any = await AutoUploadJSONrulesModel.find({ DeviceType: device.DeviceType })
                rules.map(async (rule: any) => {
                    
                    if (rule.IP && !rule.DeviceName && !rule.Range) {
                        if (rule.IP === encoder.peerIP) {
                            await this.presetFileUpload(encoder.peerIP, rule.DeviceType, rule.FileName);
                            await AutoUploadJSONrulesModel.deleteOne({ _id: rule._id })
                        }
                    }
                    // !rule.IP && rule.DeviceName && !rule.RangeFrom
                    else if (!rule.IP && rule.DeviceName && !rule.Range) {
                        if (rule.DeviceName === encoder?.properties['devicename']) {
                            await this.presetFileUpload(encoder.peerIP, rule.DeviceType, rule.FileName);
                        }
                    }
                    // !rule.IP && !rule.DeviceName && rule.RangeFrom
                    else if (!rule.IP && !rule.DeviceName && rule.Range) {
                        // if (encoder.peerIP.split('.')[3] >= rule.RangeFrom.split('.')[3] &&
                        //     Number(encoder.peerIP.split('.')[3]) <= (Number(rule.RangeFrom.split('.')[3]) + rule.CIDR)) {
                        let block = new Netmask(rule.Range);
                        if (block.contains(encoder.peerIP.split(':')[0])) {
                            await this.presetFileUpload(encoder.peerIP, rule.DeviceType, rule.FileName);
                        }
                    }
                    // rule.IP && rule.DeviceName && !rule.RangeFrom
                    else if (rule.IP && rule.DeviceName && !rule.Range) {
                        if (rule.IP === encoder.peerIP && rule.DeviceName === encoder?.properties['devicename']) {
                            await this.presetFileUpload(encoder.peerIP, rule.DeviceType, rule.FileName);
                        }
                    }
                    //!rule.IP && rule.DeviceName && rule.RangeFrom   

                    else if (!rule.IP && rule.DeviceName && rule.Range) {
                        let block = new Netmask(rule.Range);
                        if (rule.DeviceName === encoder?.properties['devicename'] &&
                            block.contains(encoder.peerIP.split(':')[0])) {

                            //encoder.peerIP.split('.')[3] >= rule.RangeFrom.split('.')[3] &&
                            // Number(encoder.peerIP.split('.')[3]) <= (Number(rule.RangeFrom.split('.')[3]) + rule.CIDR)) {
                            await this.presetFileUpload(encoder.peerIP, rule.DeviceType, rule.FileName);
                        }
                    }
                })
            }
        })
        Promise.all(promises).then(()=>{

        })
        .catch((err)=>{
            console.log(err);
        })
    
    }

    public presetFileUpload = async (ip, deviceType, file) => {
        try {
            if (ip === "") {
                return { ack: '2', msg: "Please Select Devices" }
            }
            let fileForUpdate = require("../../../.." + "/upload/Preset/" + deviceType + "/" + file);
            let encoderProperties: any = await encoderModel.findOne({ peerIP: ip });
            let res, next;

            let resultProperties = Object.assign(encoderProperties.properties, fileForUpdate.properties);
            let result: any = await encoderModel.updateOne({ peerIP: ip }, { $set: { properties: resultProperties } });

            if (result) {
                let device = await customerDeviceModel.findOne({ IP: ip });
                let data = {
                    DeviceName: device?.DeviceName,
                    DeviceType: deviceType,
                    DeviceIP: ip,
                    Region: 'OnBoardingRegion',
                    ActionType: 'Update(Properties)',
                    TimeCreated: new Date(),
                    Username: 'Auto update preset',
                }
                commonUtil.updateDeviceReport(data);
            }

            if (resultProperties['current_enc_presets']) {

                let presetArr = ['preset1', 'preset2', 'preset3', 'preset4', 'preset5', 'preset6', 'preset7', 'preset8'];
                let isExistOnBoardPreset = false;

                for (let i = 0; i < presetArr.length; i++) {
                    if (resultProperties[presetArr[i]] === 'onboard') {
                        isExistOnBoardPreset = true; break;
                    }
                }

                if (!isExistOnBoardPreset) {
                    for (let i = 1; i < 9; i++) {
                        if (resultProperties[presetArr[i - 1]] === '') {
                            resultProperties[presetArr[i - 1]] = 'onboard';
                            let pre: any = [];
                            for (let p = 1; p < 9; p++) {
                                pre.push(resultProperties[`preset${p}`]);
                            }
                            let data: any = {
                                body: {
                                    presets: pre,
                                    ip: ip
                                }
                            }

                            let res, next;
                            await encoderControllerV1.UpdatePreset(data, res, next);
                            let data1: any = {
                                body: {
                                    current_enc_presets: presetArr[i],
                                    ip: ip
                                }
                            }
                            await encoderControllerV1.LoadPreset(data1, res, next);
                            break;
                        }
                    }
                }
                else if (resultProperties['current_enc_preset'] !== 'onboard') {

                    let data1: any = {
                        body: {
                            current_enc_presets: 'onboard',
                            ip: ip
                        }
                    }
                    await encoderControllerV1.LoadPreset(data1, res, next);

                    let req1: any = {
                        body: {
                            ip: ip,
                            data: resultProperties
                        }
                    }
                    await encoderControllerV1.SaveSession(req1, res, next);

                } else {
                    let req1: any = {
                        body: {
                            ip: ip,
                            data: resultProperties
                        }
                    }
                    await encoderControllerV1.SaveSession(req1, res, next);
                }
            } else {
                let req1: any = {
                    body: {
                        ip: ip,
                        data: resultProperties
                    }
                }
                await encoderControllerV1.SaveSession(req1, res, next);
            }

            return { ack: "1" }
        } catch (error) {
            return { ack: "0", deviceIP: ip };
        }
    }

    public getAutoUploadJSONrules = async (req: any, res: any) => {
        try {
            let alljson = await AutoUploadJSONrulesModel.findOne({ DeviceType: req?.body?.DeviceType })
            if (alljson) res.send({ ack: '1', msg: alljson })
            else res.send({ ack: '2', msg: 'Data Doesn\'t exist !' })
        }
        catch (err) {
            res.send({ ack: '2', msg: err })
        }
    }

    public getAllSelectRules = async (req: any, res: any) => {
        try {
            let alljson = await AutoUploadJSONrulesModel.find({})
            if (alljson) res.send({ ack: '1', msg: alljson })
            else res.send({ ack: '2', msg: 'Data Doesn\'t exist !' })
        }
        catch (err) {
            res.send({ ack: '2', msg: err })
        }
    }
    // public IP = () => {
    //     var block = new Netmask('50.239.254.71/25');
    //     console.log(block.size, block.first, block.last)                     // 1048576

    //     // console.log(block.contains('10.0.8.10'));    // true
    //     // console.log(block.contains('10.8.0.10'));    // true
    //     // console.log(block.contains('192.168.1.20')); // false
    // }

    public createUpdateRules = async (req: any, res: any) => {
        let { deviceIP, DeviceName, Range, DeviceType, Id } = req?.body;
        try {
            let ret = { ack: '1', msg: '' }
            if (DeviceName) {

                let encoders = await encoderModel.find({})
                encoders = encoders.filter((encoder) => encoder.properties && encoder.properties['devicename'] === DeviceName)
                let encodersIP: any = [];

                encoders.forEach((encoder) => {
                    if (encoder && encoder?.properties)
                        encodersIP.push(encoder.properties['devicename'])
                })

                let devices = await customerDeviceModel.find({ Region: "OnBoardingRegion", DeviceType: DeviceType, IP: { $in: encodersIP } });
                let rules = await AutoUploadJSONrulesModel.find({ DeviceType: DeviceType })

                for (let i = 0; i < devices.length; ++i) {
                    for (let j = 0; j < rules.length; ++j) {
                        // devices.some((device) => {
                        // rules.some((rule) => {
                        if (devices[i].DeviceType === rules[i].DeviceType) {
                            if (rules[i].IP) {
                                if (devices[i].IP?.split(':')[0] === rules[i].IP && rules[i]._id != Id) {
                                    ret.ack = '2', ret.msg = 'rules is already created for this device';
                                    break;
                                }
                                // res.send({ ack: '2', msg: 'rules is already created for this device' });
                            }
                            else if (rules[i].Range && devices[i].IP && rules[i]._id != Id) {
                                var block = new Netmask(rules[i].Range);
                                if (block.contains(devices[i].IP?.split(':')[0])) {
                                    ret.ack = '2', ret.msg = 'rules is already created for this device';
                                    break;
                                }
                                // res.send({ ack: '2', msg: 'rules is already created for this device' });
                                // if (device.IP.split('.')[3] >= rule?.RangeFrom.split('.')[3] &&
                                //     Number(device.IP.split('.')[3]) <= (Number(rule.RangeFrom.split('.')[3]) + rule.CIDR))
                            }
                        }
                    }
                    if (ret.ack === '2') break;
                }
            }
            else if (deviceIP) {
                let encoder: any = await encoderModel.findOne({ peerIP: deviceIP })
                // if (encoder && encoder.properties && encoder.properties['devicename']) {
                let rules = await AutoUploadJSONrulesModel.find({ DeviceType: DeviceType })
                // rules.some((rule) => {
                for (let i = 0; i < rules.length; ++i) {
                    // if (payload.DeviceType === rule.DeviceType) {
                    if (rules[i].DeviceName && encoder && encoder.properties['devicename'] === rules[i].DeviceName && rules[i]._id != Id) {
                        ret.ack = '2', ret.msg = 'rules is already created for this device';
                        break;
                    }
                    if (rules[i].Range && rules[i]._id != Id) {
                        let block = new Netmask(rules[i].Range);
                        if (block.contains(deviceIP)) {
                            ret.ack = '2', ret.msg = 'rules is already created for this device';
                            break;
                        }
                    }
                }
            }
            else if (Range) {
                let rules = await AutoUploadJSONrulesModel.find({ DeviceType: DeviceType })
                let block = new Netmask(Range);
                // rules.some((rule) => {
                for (let i = 0; i < rules.length; ++i) {
                    if (rules[i].Range && rules[i]._id != Id) {
                        let ruleBlock = new Netmask(rules[i].Range)
                        if (block.contains(ruleBlock.first) || block.contains(ruleBlock.last)) {
                            ret.ack = '2', ret.msg = 'rules is already created for this device';
                            break;
                        }
                    }
                    if (rules[i].IP && rules[i]._id != Id) {
                        if (block.contains(rules[i].IP)) {
                            ret.ack = '2', ret.msg = 'rules is already created for this device';
                            break;
                        }
                    }
                }
            }
            if (ret.ack === '2') res.send(ret);

            else if (Id) {
                let data = {
                    IP: req?.body?.deviceIP,
                    DeviceName: req?.body?.DeviceName,
                    Range: req?.body?.Range,
                    FileName: req?.body?.FileName
                }
                let result = await AutoUploadJSONrulesModel.updateOne({ _id: Id }, data)
                if (!result)
                    res.send({ ack: '2', msg: "Server error !!" })
                else
                    res.send({ ack: '1', msg: 'Updated Successfully ' })
            }
            else {
                let model = new AutoUploadJSONrulesModel();
                model.IP = req?.body?.deviceIP;
                model.DeviceName = req?.body?.DeviceName;
                model.Range = req?.body?.Range;
                model.DeviceType = req?.body?.DeviceType;
                model.FileName = req?.body?.FileName;
                model.save();
                res.send({ ack: '1', msg: 'Created Successfully ' })
            }
        }
        catch (e) {
            console.log('error',{ ack: '2', msg: e })
        }
    }

    public deleteSelectRules = async (req: any, res: any) => {
        var resObj = {};
        try {
            var deviceType: any = await AutoUploadJSONrulesModel.deleteOne({ _id: req?.body?.id });
            if (deviceType) {
                resObj["ack"] = "1";
                resObj["msg"] = "Select Rules Deleted Successfully";
            }
        } catch (err) {
            resObj["ack"] = "0";
            resObj["msg"] = err;
        }
        res.send(resObj);
    }
}
export const AutomatedWorkFlowForOnBoardingDevice = new AutoWorkFlowForOnBoardingDevice();