import { NextFunction, Response, Request, request } from 'express';
import { BaseController } from '../../basecontroller';
import { encoderServicesV1 } from '../../../services/v1/encoder/encoderservicesv1';
import { encoderTemPool } from '../../../services/v1/encoder/encodertempool';

import { ReqEncoderschemas, ReqEncoderStartStop } from '../../../routes/v1/encoder/encoderschema';
import { IFilteredRequest } from "../../../interfaces";
import { ApiPath, SwaggerDefinitionConstant, ApiOperationPost } from "swagger-express-ts"
import _ from 'underscore';
import { containerStreamStatsModel } from '../../../models/global/containerstreamstatsmodel';
import { encoderModel } from '../../../models/global/encodermodel';
import { globalServicesV1 } from '../../../services/v1/global/globalservices';
import { customerDeviceModel } from '../../../models/ellvis/customerdevice.model';
import { regionModel } from '../../../models/region/region.model';
import { systemModel } from '../../../models/region/system.model';
import { commonUtil } from '../../../utils/commonUtil';
import fs from 'fs'

@ApiPath({
    path: "/api/v1",
    name: "Encoder API Calls",
    security: { apiKeyHeader: [] },
})
class EncoderControllerV1 extends BaseController {

    /**
     * @description Get currently set properties of encoder.
     */

    @ApiOperationPost({
        description: "Api to get currently set properties",
        path: '/getencoderproperties',
        summary: "Api to get currently set properties",
        parameters: {
            body: {
                description: "Enter Device IP",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async GetEncoderProperties(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult = await encoderServicesV1.GetEncoderProperties(req.body);
            res.setHeader('Cache-Control', "no-store")
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
     * @description Get current status of encoder.
     */
    @ApiOperationPost({
        description: "Api to get status",
        path: '/getencoderstatus',
        summary: "Api to get status",
        parameters: {
            body: {
                description: "Enter Device IP",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async GetEncoderStatus(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult = await encoderServicesV1.GetEncoderStatus(req.body, '');
            res.setHeader('Cache-Control', "no-store")
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
     * @description Request to start encoding.
     */
    @ApiOperationPost({
        description: "Api to start encoding",
        path: '/startencoding',
        summary: "Api to start encoding",
        parameters: {
            body: {
                description: "Enter Device IP",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async StartEncoding(req: IFilteredRequest<ReqEncoderStartStop>, res: Response, next: NextFunction) {
        try {
            const requestResult = await encoderServicesV1.StartEncoding(req.body);
            if (requestResult && requestResult.status === "success") {
                let blob = {
                    "$set": {
                        "status.encoder1_status": requestResult.device.encoder1_status,
                        "status.encoder2_status": requestResult.device.encoder2_status,
                        "status.encoder3_status": requestResult.device.encoder3_status,
                        "status.encoder4_status": requestResult.device.encoder4_status,
                        "status.opstate": requestResult.device.opstate,
                        "status.status": requestResult.device.status
                    }
                }

                await encoderModel.updateOne({ peerIP: req.body.ip }, blob, { new: true }, (err) => {
                    if (err) return;
                })

                customerDeviceModel.updateOne({ IP: { $regex: req.body.ip } }, blob, { new: true }, (err) => {
                    if (err) return;
                })

                let containerBlob = {
                    $set: { "status": "connected" }
                }
                let connected = await containerStreamStatsModel.count({ status: "connected", deviceip: req.body.deviceip })
                let disconnected = await containerStreamStatsModel.count({ status: "disconnected", deviceip: req.body.deviceip })
                await containerStreamStatsModel.updateMany({ peerIP: { $regex: req.body.ip } }, containerBlob, { new: true }, (err) => {
                    if (err) return
                })
                let connectedLatest = await containerStreamStatsModel.count({ status: "connected", deviceip: req.body.deviceip })
                let disconnectedLatest = await containerStreamStatsModel.count({ status: "disconnected", deviceip: req.body.deviceip })

                regionModel.updateOne({ _id: req.body.RegionID }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                systemModel.updateOne({ _id: req.body.SystemID }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                customerDeviceModel.updateOne({ IP: req.body.deviceip }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
            }
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to start multiple encoding",
        path: '/startencodingmultiple',
        summary: "Api to start encoding",
        parameters: {
            body: {
                description: "Enter ip Array",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async StartEncodingMultiple(req: IFilteredRequest<ReqEncoderStartStop>, res: Response, next: NextFunction) {
        try {
            let ips = 0
            for (let i = 0; i < req.body.ipArray.length; i++) {
                let x = new ReqEncoderStartStop()
                x.ip = req.body.ipArray[i]
                const requestResult = await encoderServicesV1.StartEncoding(x);
                if (requestResult && requestResult.status === "success") {
                    ips++;
                    let blob = {
                        "$set": {
                            "status.encoder1_status": requestResult.device.encoder1_status,
                            "status.encoder2_status": requestResult.device.encoder2_status,
                            "status.encoder3_status": requestResult.device.encoder3_status,
                            "status.encoder4_status": requestResult.device.encoder4_status,
                            "status.opstate": requestResult.device.opstate,
                            "status.status": requestResult.device.status
                        }
                    }

                    await encoderModel.updateOne({ peerIP: x.ip }, blob, { new: true }, (err) => {
                        if (err) return;
                    })
                    customerDeviceModel.updateOne({ IP: { $regex: x.ip } }, blob, { new: true }, (err) => {
                        if (err) return;
                    })
                    let containerBlob = {
                        $set: {
                            "status": "connected"
                        }
                    }
                    let connected = await containerStreamStatsModel.count({ status: "connected", deviceip: req.body.deviceip })
                    let disconnected = await containerStreamStatsModel.count({ status: "disconnected", deviceip: req.body.deviceip })
                    let modified = await containerStreamStatsModel.updateMany({ peerIP: { $regex: x.ip } }, containerBlob, { new: true }, (err) => {
                        if (err) return;
                    })
                    let connectedLatest = await containerStreamStatsModel.count({ status: "connected", deviceip: req.body.deviceip })
                    let disconnectedLatest = await containerStreamStatsModel.count({ status: "disconnected", deviceip: req.body.deviceip })
                    regionModel.updateOne({ _id: req.body.RegionID }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                    systemModel.updateOne({ _id: req.body.SystemID }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                    customerDeviceModel.updateOne({ IP: req.body.deviceip }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                }
            }
            return res ? res.send({ updated: ips }) : "";
        } catch (error) {
            return res ? res.send(null) : '';
        }
    }

    /**
     * @description Request to stop encoding.
     */

    @ApiOperationPost({
        description: "Api to stop encoding",
        path: '/stopencoding',
        summary: "Api to stop encoding",
        parameters: {
            body: {
                description: "Enter Device IP",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async StopEncoding(req: IFilteredRequest<ReqEncoderStartStop>, res: Response, next: NextFunction) {
        try {
            const requestResult = await encoderServicesV1.StopEncoding(req.body);
            if (requestResult && requestResult.status === "success") {
                let blob = {
                    "$set": {
                        "status.encoder1_status": "0",
                        "status.encoder2_status": "0",
                        "status.opstate": "Idle",
                        "status.status": "stopped"
                    }
                }

                await encoderModel.updateOne({ peerIP: req.body.ip }, blob, { new: false }, (err) => {
                    if (err) return;
                })

                customerDeviceModel.updateOne({ IP: { $regex: req.body.ip } }, blob, { new: true }, (err) => {
                    if (err) return;
                })

                let containerBlob = {
                    $set: {
                        "status": "disconnected"
                    }
                }
                let connected = await containerStreamStatsModel.count({ status: "connected", deviceip: req.body.deviceip })
                let disconnected = await containerStreamStatsModel.count({ status: "disconnected", deviceip: req.body.deviceip })
                let x = await containerStreamStatsModel.updateMany({ peerIP: { $regex: req.body.ip.split(":")[0] } }, containerBlob, { new: true }, (err) => {
                    if (err) return;
                })
                let connectedLatest = await containerStreamStatsModel.count({ status: "connected", deviceip: req.body.deviceip })
                let disconnectedLatest = await containerStreamStatsModel.count({ status: "disconnected", deviceip: req.body.deviceip })
                regionModel.updateOne({ _id: req.body.RegionID }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                systemModel.updateOne({ _id: req.body.SystemID }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                customerDeviceModel.updateOne({ IP: req.body.deviceip }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
            }
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
         * @description Request to stop encoding.
         */

    @ApiOperationPost({
        description: "Api to stop multiple encoding",
        path: '/stopencodingmultiple',
        summary: "Api to stop encoding",
        parameters: {
            body: {
                description: "Enter ip Array",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async StopEncodingMultiple(req: IFilteredRequest<ReqEncoderStartStop>, res: Response, next: NextFunction) {
        try {
            let ips = 0;
            for (let i = 0; i < req.body.ipArray.length; i++) {
                let x = new ReqEncoderStartStop();
                x.ip = req.body.ipArray[i].split(":")[0]
                const requestResult = await encoderServicesV1.StopEncoding(x);
                if (requestResult && requestResult.status === "success") {
                    ips++;
                    let blob = {
                        "$set": {
                            "status.encoder1_status": "0",
                            "status.encoder2_status": "0",
                            "status.opstate": "Idle",
                            "status.status": "stopped"
                        }
                    }

                    await encoderModel.updateOne({ peerIP: x.ip }, blob, { new: false }, (err) => {
                        if (err) return;
                    })
                    customerDeviceModel.updateOne({ IP: { $regex: x.ip } }, blob, { new: true }, (err) => {
                        if (err) return;
                    })
                    let containerBlob = {
                        $set: {
                            "status": "disconnected"
                        }
                    }
                    let connected = await containerStreamStatsModel.count({ status: "connected", deviceip: req.body.deviceip })
                    let disconnected = await containerStreamStatsModel.count({ status: "disconnected", deviceip: req.body.deviceip })
                    let modified = await containerStreamStatsModel.updateMany({ peerIP: { $regex: x.ip } }, containerBlob, { new: true }, (err) => {
                        if (err) return;
                    })
                    let connectedLatest = await containerStreamStatsModel.count({ status: "connected", deviceip: req.body.deviceip })
                    let disconnectedLatest = await containerStreamStatsModel.count({ status: "disconnected", deviceip: req.body.deviceip })
                    regionModel.updateOne({ _id: req.body.RegionID }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                    systemModel.updateOne({ _id: req.body.SystemID }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                    customerDeviceModel.updateOne({ IP: req.body.deviceip }, { $inc: { Nominal: connectedLatest - connected, Critical: disconnectedLatest - disconnected } })
                }
            }

            return res.send({ updated: ips });
        } catch (error) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to set device name",
        path: "/setdevicename",
        summary: "Api to set device name",
        parameters: {
            body: {
                description: "Enter IP and Device Name",
                required: true,
            }
        },
        responses: {
            200: {
                description: "success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })
    public async SetDeviceName(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult: any = await encoderServicesV1.SetName(req.body.devicename, req.body.ip);
            if (requestResult && requestResult.status === "success") {
                let blob = {
                    "$set": {
                        "properties.devicename": req.body.devicename
                    }
                }

                await encoderModel.updateOne({ peerIP: req.body.ip }, blob, { new: true }, (err) => {
                    if (err) return;
                })
            }
            return res.send(requestResult);
        } catch (err) {

        }
    }

    @ApiOperationPost({
        description: "Api to Load Preset",
        path: "/loadpreset",
        summary: "Api to Load Preset",
        parameters: {
            body: {
                description: "Enter current encoder preset and IP",
                required: true,
            }
        },
        responses: {
            200: {
                description: "success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })
    public async LoadPreset(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult: any = await encoderServicesV1.LoadPreset(req.body.current_enc_preset, req.body.ip);
            if (requestResult && requestResult.status === "success") {
                await globalServicesV1.SavePropertiesAndStatus(req.body.ip, '')
            }
            return res.send(requestResult);
        } catch (err) {

        }
    }

    @ApiOperationPost({
        description: "Api to update presets",
        path: "/updatepresets",
        summary: "Api to update presets",
        parameters: {
            body: {
                description: "Enter an array of presets to update and ip",
                required: true,
            }
        },
        responses: {
            200: {
                description: "success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })
    public async UpdatePreset(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult: any = await encoderServicesV1.UpdatePreset(req.body.presets, req.body.ip);
            if (requestResult && requestResult.status === 'success') {
                let _body = {
                    "$set": {}
                }
                let _presetlist = req.body.presets
                for (let i = 0; i < _presetlist.length; i++) {
                    let preset = "properties.preset" + (i + 1).toString()
                    _body["$set"][preset] = _presetlist[i];
                }
                await encoderModel.updateMany({ peerIP: req.body.ip }, _body, { new: true }, (err) => {
                    if (err) return;
                })
            }
            return res ? res.send(requestResult) : '';
        } catch (error) {
            return res ? res.send(null) : '';
        }
    }

    @ApiOperationPost({
        description: "Api to Request Login",
        path: "/requestlogin",
        summary: "Api to Request Login",
        parameters: {
            body: {
                description: "Enter username, password and ip",
                required: true,
            }
        },
        responses: {
            200: {
                description: "success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })
    public async RequestLogin(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult = await encoderServicesV1.RequestLogin(req.body.password, req.body.ip);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null)
        }
    }

    @ApiOperationPost({
        description: "Api to set login properties",
        path: "/setloginproperties",
        summary: "Api to set login properties",
        parameters: {
            body: {
                description: "Enter username, password and ip",
                required: true,
            }
        },
        responses: {
            200: {
                description: "success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })
    public async SetLoginProperties(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult = await encoderServicesV1.SetLoginProperties(req.body.username, req.body.password, req.body.ip);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null)
        }
    }

    @ApiOperationPost({
        description: "Api to set lcd login properties",
        path: "/setlcdloginproperties",
        summary: "Api to set lcd login properties",
        parameters: {
            body: {
                description: "Enter lcdpassword and ip",
                required: true,
            }
        },
        responses: {
            200: {
                description: "success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })
    public async SetLcdLoginProperties(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult = await encoderServicesV1.SetLcdLoginProperties(req.body.lcdpassword, req.body.ip);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null)
        }
    }

    @ApiOperationPost({
        description: "Api to Request logout",
        path: "/requestlogout",
        summary: "Api to Request logout",
        parameters: {
            body: {
                description: "Enter session and ip",
                required: true,
            }
        },
        responses: {
            200: {
                description: "success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })
    public async RequestLogout(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult = await encoderServicesV1.RequestLogout(req.body.session, req.body.ip);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null)
        }
    }

    @ApiOperationPost({
        description: "Api to reboot device",
        path: "/devicereboot",
        summary: "Api to reboot device",
        parameters: {
            body: {
                description: "Enter ip",
                required: true,
            }
        },
        responses: {
            200: {
                description: "success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })
    public async RebootDevice(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult = await encoderServicesV1.RebootDevice(req.body.ip);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null)
        }
    }

    public async SaveSession(req: Request, res: Response, next: NextFunction) {
        try {
            const requestResult: any = await encoderServicesV1.SaveSession(req, req.body.ip ? req.body.ip : "");

            if (requestResult && requestResult.status === "success") {
                let keys = _.keys(req.body.data)
                let blob = {
                    "$set": {

                    }
                }
                for (let i = 0; i < keys.length; i++) {
                    let key = "properties." + keys[i]
                    blob["$set"][key] = req.body.data[keys[i]]
                }
                containerStreamStatsModel.updateMany({ peerIP: { $regex: req.body.ip } }, blob, { new: true }, (err) => {
                    if (err) return;
                })
                await encoderModel.updateOne({ peerIP: { $regex: req.body.ip } }, blob, {
                    new: true
                }, (err) => {
                    if (err) return
                })
            }

            return res ? res.send(requestResult) : '';
        } catch (error) {
            return res ? res.send(null) : '';
        }
    }
    public async checkPort(req: Request, res: Response, next: NextFunction) {
        try {
            const requestPortResult: any = await encoderServicesV1.checkPort(req, req.body.ip ? req.body.ip : "");

            if (requestPortResult && requestPortResult.status === "success") {
                let blob = {
                    "$set": {

                    }
                }
                if (requestPortResult && requestPortResult.status === "success") {
                    blob["$set"]["inputport"] = req.body.inputport;
                }
                await encoderModel.updateOne({ peerIP: { $regex: req.body.ip } }, blob, {
                    new: true
                }, (err) => {
                    if (err) return
                })
            }
            return res.send(requestPortResult)
        } catch (error) {
            return res.send(null)
        }
    }
    public async checkIRcode(req: Request, res: Response, next: NextFunction) {
        try {
            const requestIRResult: any = await encoderServicesV1.checkIRcode(req, req.body.ip ? req.body.ip : "");

            if (requestIRResult && requestIRResult.status === "success") {
                let keys = _.keys(req.body.data)
                let blob = {
                    "$set": {

                    }
                }
                if (requestIRResult && requestIRResult.status === "success") {
                    blob["$set"]["remotetype"] = req.body["remotetype"];
                    blob["$set"]["ircode"] = req.body["ircode"];
                }
                await encoderModel.updateOne({ peerIP: { $regex: req.body.ip } }, blob, {
                    new: true
                }, (err) => {
                    if (err) return;
                })
            }
            return res.send(requestIRResult)
        } catch (error) {
            return res.send(null)
        }
    }



    public async SaveMultipleSession(req: Request, ipArray: any, res: Response, next: NextFunction) {

        let i = 0
        let updatedIPs: any[] = []
        try {
            for (i = 0; i < ipArray.length; i++) {
                const requestResult: any = await encoderServicesV1.SaveSession(req, ipArray[i])
                if (!requestResult)
                    continue
                if (requestResult.status === "success") {
                    updatedIPs.push(ipArray[i])
                    let keys = _.keys(req.body.data)
                    let blob = {
                        "$set": {

                        }
                    }
                    for (let j = 0; j < keys.length; j++) {
                        let key = "properties." + keys[j]
                        blob["$set"][key] = req.body.data[keys[j]]
                    }

                    await encoderModel.updateOne({ peerIP: ipArray[i] }, blob, {
                        new: true
                    }, (err) => {
                        if (err) return;
                    })
                }
            }
            commonUtil.updateUserReport(req, '')
        } catch (error) {
            res.send({
                updated: i,
                ips: updatedIPs
            })
        }


        return res.send({
            updated: updatedIPs.length,
            ips: updatedIPs
        })
    }

    public async UpdateFirmware(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.UpdateFirmware(req);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }

    }
    public async updatePresetFileOnDeviceIP(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.updatePresetFileOnDeviceIP(req);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }

    }

    public async SaveFirmwareFile(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.SaveFirmwareFile(req);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }

    }

    public async SavePresetFile(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.SavePresetFile(req);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }
    }

    public async SaveLicenseFile(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.saveLicenseFile(req);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }
    }
    
    public async UpdateSingleDeviceByIp(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.UpdateSingleDeviceByIp(req);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }

    public async GetFirmwareFilesByDeviceType(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.GetFirmwareFilesByDeviceType(req.body);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }

    }
    public async GetPresetFilesByDeviceType(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.GetPresetFilesByDeviceType(req.body);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }

    }
    public async UpdateFirmwareByUploadedFile(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.UpdateFirmwareByUploadedFile(req);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }
    }
    public async UpdateJsonAsPresetByUploadedFile(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.UpdateJsonAsPresetByUploadedFile(req.body);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }
    }
    public async GetFirmwareFilesByDeviceName(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.GetFirmwareFilesByDeviceName(req);
            return res.send(requestResult);
        } catch (error) {
            res.send(null);
        }
    }
    public async updatefirmwareforsingledevice(req: Request, res: Response, next: NextFunction) {
        try {
            let requesResult = await encoderServicesV1.updatefirmwareforsingledevice(req);
            return res.send(requesResult);
        } catch (error) {
            res.send(null);
        }
    }
    public async deleteFirmwareFileBydeviceType(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.deleteFirmwareFileBydeviceType(req);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }
    public async deletePresetfilebydevicetype(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.deletePresetfilebydevicetype(req);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }
    public async setautomatedworkflow(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.setautomatedworkflow(req);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }

    public async setHotBackup(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.setHotBackupValue(req);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }

    public async saveSpareUnitIp(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.SaveSpareUnitIp(req?.body);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }
    public async editSpareIpForEnc(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.editSpareIpForEnc(req?.body);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }
    public async deleteSpareIp(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.DeleteSpareUnitIp(req.body);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }
    public async deleteSpareIpForSettings(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.DeleteSpareUnitIpForSettings(req?.body);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }

    public async deleteWarningMessage(req: Request, res: Response, next: NextFunction) {
        try {
            let requestResult = await encoderServicesV1.deleteWarningMessage(req);
            return res.send(requestResult)
        } catch (error) {
            res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api get encoders and store in Encoder pool ",
        path: "/onbordingdevice",
        summary: "Api get encoders and store in Encoder pool",
        parameters: {
            body: {
                description: "Enter ip",
                required: true,
            }
        },
        responses: {
            200: {
                description: "success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })

    public async StoreEncoderInTemPool(ip: any, req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            // const ip = RequestIp.getClientIp(req)
            const ipaddress: any = ip.split(":")
            const requestResult = await encoderTemPool.StoreEncoder(ipaddress[ipaddress.length - 1], req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null)
        }
    }

    public async firmwareFileLocation(req: IFilteredRequest<any>, res: Response) {
        try {
            let fileName = req.params.id.split('+');
            let checkFirmwareFile = fs.existsSync(process.cwd() + "/upload/" + fileName[0] + '/' + fileName[1])
            if (checkFirmwareFile) {
                return await encoderServicesV1.firmwareFileLocation(req, res);
            } else {
                return res.send('File not found !');
            }
        } catch (error) {
            return res.send(null);
        }
    }

    public async FirmwareUpgradeStatus(req: Request, res: Response) {
        try {
            await encoderServicesV1.FirmwareUpgradeStatus(req);
        } catch (error) {
            res.send(null);
        }
    }
    
    public async GetFirmwareUpgradeStatus(req: Request, res: Response) {
        try {
           let result = encoderServicesV1.GetFirmwareUpgradeStatus();
           res.send(result)
        } catch (error) {
            res.send(null);
        }
    }
}

export const encoderControllerV1 = new EncoderControllerV1();