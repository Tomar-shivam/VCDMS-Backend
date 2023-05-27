import { commonUtil } from './../../../utils/commonUtil';
import { exec } from 'child_process';
import { containerStreamStatsModel, ContainersStreamStats } from '../../../models/global/containerstreamstatsmodel'
import { networkSettingsModel, NetworkSettings } from '../../../models/global/networksettingsmodel'
import { liceseInfoModel, LicenseInfo } from '../../../models/global/licenseinfomodel'
import { CustomerDevice, customerDeviceModel } from '../../../models/ellvis/customerdevice.model'
import { ellvisServicesV1 } from '../../../services/v1/ellvis/ellvisservicesv1'
import Container from "../../../models/ellvis/container.model";
import { ConnectedDevice } from '../../../models/ellvis/connecteddevices.model';
import { ReqEllvisschemas } from '../../../routes/v1/ellvis/ellvisschema';
import { ReqEncoderschemas } from '../../../routes/v1/encoder/encoderschema';
import { encoderServicesV1 } from '../encoder/encoderservicesv1';
import { encoderModel } from '../../../models/global/encodermodel';
import _ from 'underscore'
import { regionModel } from '../../../models/region/region.model';
import { systemModel } from '../../../models/region/system.model';
import { SMTPModel } from '../../../models/customer/smtpmodel';
import { saveHistoryModel } from '../../../models/global/savehistorymodel';
import { cronModel } from '../../../models/global/cronmodel';
import { snmpModel } from '../../../models/global/snmpmodel';
import app from '../../../app';
import { alarmsReportingModel } from '../../../models/reporting/alarmsmodel';
import { DeviceReporting, deviceReportingModel } from '../../../models/reporting/devicereportmodel';
import { json } from 'body-parser';
import { MAJORALARMSModel } from '../../../models/customer/majoralarmmodel';
import { BackupCronModel } from '../../../models/backup/backupcron';
import { backupServicesV1 } from '../backup/backupservicesv1';
import { customerServicesV1 } from '../customer/customerservicesv1';
import logging from "../../../logging"
import { validateLicense } from '../../../utils/responsehandlerutil';
import { secretUtil } from '../../../utils/secretutil';
import { globalServicesForAutomatedWorkFlow } from './automatedworkflowservices';
import { HotbackupIpListModel } from "../../../models/backup/backupIpList";
import { encoderControllerV1 } from '../../../controllers/v1/encoder/encodercontrollerv1';
import fs from 'fs'
import path from "path";
var snmp = require("net-snmp");
var dns = require("dns");
var os = require("os");

var backendVersion = require('../../../../package.json');
var flag = 1;
var ipArray = new Array();
var reportFlag = 1;
var spareFlag = 1;
var reportIpArray = new Array();
let EllvisModel = secretUtil.Ellvis;
class GlobalServices {

    // check Password of ellvis for IsPasswordNeeded or not 
    public checkEllvisPassword = async (devices: any) => {
        try {
            for (let i = 0; i < devices.length; i++) {
                const res = await ellvisServicesV1.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": devices[i].Password, "ip": devices[i].IP });
                if (res === 'Incorrect password! Please try again!') {
                    customerDeviceModel.updateOne({ IP: devices[i].IP }, { IsPasswordNeeded: true }, { new: true });
                }
                else if (res) {
                    customerDeviceModel.updateOne({ IP: devices[i].IP }, { IsPasswordNeeded: false, AuthToken: res.accessToken }, { new: true });
                }
            }

        } catch (err) {
            return;
        }
    }

    public SaveContainersAndStats = async () => {
        try {
            const devices: any = await customerDeviceModel.find({ "DeviceType": EllvisModel });
            await this.checkEllvisPassword(devices);
            let containerIds = Array();
            // let devicereportsip = Array();
            let deleteContainers = true
            let majorAlarm: any = await MAJORALARMSModel.find({})
            if (majorAlarm) {
                if (majorAlarm.length > 0) {
                    majorAlarm = majorAlarm[0];
                }
            }
            for (let i = 0; i < devices.length; i++) {
                try {

                    let req: any = new Container()
                    req.ip = devices[i].IP
                    req.Password = devices[i].Password
                    req.AuthToken = devices[i].AuthToken
                    req._id = devices[i]._id
                    let containers
                    try {
                        containers = await ellvisServicesV1.GetAllContainers(req);
                        if (secretUtil.ENABLE_DEBUG_LOG) {
                            logging.logger.info({ containers: "get container" }, `Got ${containers.length} containers for IP ${devices[i].IP}`);
                        }

                        if (containers == null || containers == undefined) {
                            deleteContainers = false
                            if (secretUtil.ENABLE_DEBUG_LOG) {
                                logging.logger.error(`Unable to find containers for IP ${devices[i].IP}`);
                            }
                            continue
                        }
                    } catch (error) {
                        deleteContainers = false
                        if (secretUtil.ENABLE_DEBUG_LOG) {
                            logging.logger.error({ exception: error }, `Unable to find containers for IP ${devices[i].IP}`);
                        }
                        continue
                    }
                    let newreq = new ConnectedDevice()
                    newreq.IP = devices[i].IP
                    newreq.AuthToken = devices[i].AuthToken
                    newreq.Password = devices[i].Password
                    let stats

                    try {
                        stats = await ellvisServicesV1.GetEllvisStreamStats(newreq)
                        if (secretUtil.ENABLE_DEBUG_LOG) {
                            logging.logger.info({ stats: 'success' }, `Got ${stats.length} stats for IP ${newreq.IP}`);
                        }

                        if (stats == null || stats == undefined) {
                            deleteContainers = false
                            if (secretUtil.ENABLE_DEBUG_LOG) {
                                logging.logger.error(`Unable to find stats for IP ${devices[i].IP}`);
                            }
                            continue
                        }
                    } catch (error) {
                        deleteContainers = false
                        if (secretUtil.ENABLE_DEBUG_LOG) {
                            logging.logger.error(`Unable to find stats for IP ${devices[i].IP}`);
                        }
                        continue
                    }
                    for (let j = 0; j < containers.length; j++) {
                        try {
                            let isExistEllvis = await customerDeviceModel.find({ IP: devices[i].IP });
                            if (!isExistEllvis) {
                                await containerStreamStatsModel.deleteMany({ deviceip: devices[i].IP });
                                break;
                            }
                            let container: ContainersStreamStats | any = await containerStreamStatsModel.findOne({ _id: containers[j].Id })
                            let obj = new containerStreamStatsModel()
                            obj.DeviceName = devices[i].DeviceName
                            obj.deviceip = devices[i].IP
                            let deviceid: any = devices[i]._id
                            obj.DeviceID = deviceid
                            obj.Id = containers[j].Id
                            obj.RegionID = devices[i].RegionID
                            obj.SystemID = devices[i].SystemID
                            obj.state = containers[j].state
                            obj.comment = containers[j].comment ? containers[j].comment : "(No-Comment)"
                            obj.qamConfig = containers[j].qamConfig
                            obj.interval = containers[j].interval
                            obj.ps = containers[j].ps
                            obj.contimeo = containers[j].contimeo
                            obj.tlpktdrop = containers[j].tlpktdrop
                            obj.pbkeylen = containers[j].pbkeylen
                            obj.passphrase = containers[j].passphrase
                            obj.sourceLatency = containers[j].sourceLatency
                            obj.sourceProtocol = containers[j].sourceProtocol
                            obj.sourceEncryption = containers[j].sourceEncryption
                            obj.sourceEncryptionKey = containers[j].sourceEncryptionKey
                            obj.sourceTimeout = containers[j].sourceTimeout
                            obj.sourceIP = containers[j].sourceIP
                            obj.sourcePort = containers[j].sourcePort
                            obj.sourceSSMIP = containers[j].sourceSSMIP
                            obj.sourceOutgoingPort = containers[j].sourceOutgoingPort
                            obj.sourceAdapter = containers[j].sourceAdapter
                            obj.sourceAdapterName = containers[j].sourceAdapterName
                            obj.sourceTtl = containers[j].sourceTtl
                            obj.sourceSrtMode = containers[j].sourceSrtMode
                            obj.sourceDropPackets = containers[j].sourceDropPackets
                            obj.destProtocol = containers[j].destProtocol
                            obj.destIP = containers[j].destIP
                            obj.destTtl = containers[j].destTtl
                            obj.destPort = containers[j].destPort
                            obj.destOutgoingPort = containers[j].destOutgoingPort
                            obj.destSrtMode = containers[j].destSrtMode
                            obj.destAdapter = containers[j].destAdapter
                            obj.destAdapterName = containers[j].destAdapterName
                            obj.destLatency = containers[j].destLatency
                            obj.destTimeout = containers[j].destTimeout
                            obj.destEncryption = containers[j].destEncryption
                            obj.destEncryptionKey = containers[j].destEncryptionKey
                            obj.destDropPackets = containers[j].destDropPackets
                            obj.destDashSegmentDuration = containers[j].destDashSegmentDuration
                            obj.destDashMinUpdatePeriod = containers[j].destDashMinUpdatePeriod
                            obj.destDashMinBufferTime = containers[j].destDashMinBufferTime
                            obj.destDashSuggestedPresentationDelay = containers[j].destDashSuggestedPresentationDelay
                            obj.destDashTimeShiftBufferDepth = containers[j].destDashTimeShiftBufferDepth
                            obj.destDashPreservedSegmentsOutsideOfLiveWindow = containers[j].destDashPreservedSegmentsOutsideOfLiveWindow
                            obj.destDashSegmentTemplateConstantDuration = containers[j].destDashSegmentTemplateConstantDuration
                            obj.destDashDir = containers[j].destDashDir
                            obj.destHlsSegmentDuration = containers[j].destHlsSegmentDuration
                            obj.destHlsFragmentDuration = containers[j].destHlsFragmentDuration
                            obj.destHlsTimeShiftBufferDepth = containers[j].destHlsTimeShiftBufferDepth
                            obj.destHlsPreservedSegmentsOutsideOfLiveWindow = containers[j].destHlsPreservedSegmentsOutsideOfLiveWindow
                            obj.destHlsEnableIframe = containers[j].destHlsEnableIframe
                            obj.destRtmpLocation = containers[j].destRtmpLocation
                            obj.inputStream = containers[j].inputStream
                            obj.outputStream = containers[j].outputStream
                            obj.streamId = stats[j].Id
                            obj.dir = stats[j].dir
                            obj.input = stats[j].input
                            obj.output = stats[j].output
                            obj.streamcomment = stats[j].streamcomment
                            obj.status = stats[j].status
                            obj.inputStats = stats[j].inputStats
                            obj.outputStats = stats[j].outputStats
                            obj._id = containers[j].Id
                            let lossPackets = stats[j] && stats[j].inputStats ? stats[j].inputStats.recv ? (Number.parseFloat((stats[j].inputStats["recv"]["packetsDroppedTotal"]).toFixed(2)) / (Number.parseFloat((stats[j].inputStats['recv']["packetsDroppedTotal"]).toFixed(2)) + Number.parseFloat((stats[j].inputStats["recv"]["packetsTotal"]).toFixed(2)))) * 100 : 0 : 0
                            let linkEfficiency = stats[j] && stats[j].inputStats ? stats[j].inputStats.recv ? (Number.parseFloat((stats[j].inputStats["recv"]["packetsTotal"]).toFixed(2)) / (Number.parseFloat((stats[j].inputStats['recv']["packetsBelatedTotal"]).toFixed(2)) + Number.parseFloat((stats[j].inputStats["recv"]["packetsTotal"]).toFixed(2)) + Number.parseFloat((stats[j].inputStats["recv"]["packetsRetransmittedTotal"]).toFixed(2)))) * 100 : 0 : 0
                            if (majorAlarm) {
                                if (majorAlarm.Type === "LinkEfficiency") {
                                    if (linkEfficiency <= majorAlarm.Value && stats[j].status === "connected" && stats[j].inputStats !== undefined && Object.keys(stats[j].inputStats).length > 0) {
                                        obj.MailStatus = "major";
                                    } else {
                                        obj.MailStatus = stats[j].status;
                                    }
                                }
                                else if (majorAlarm.Type === "PacketLoss" && stats[j].status === "connected") {
                                    if (lossPackets >= majorAlarm.Value && stats[j].inputStats !== undefined && Object.keys(stats[j].inputStats).length > 0) {

                                        obj.MailStatus = "major";
                                    } else {
                                        obj.MailStatus = stats[j].status;
                                    }
                                }
                                else {
                                    obj.MailStatus = stats[j].status;
                                }
                            }
                            else {
                                obj.MailStatus = stats[j].status;
                            }
                            if (container) {
                                if (container.AuthToken) {
                                    obj.AuthToken = container.AuthToken
                                }
                                if (container.Password) {
                                    obj.Password = container.Password
                                }
                                if (container.IsPasswordNeeded) {
                                    obj.IsPasswordNeeded = container.IsPasswordNeeded
                                }
                            } else {
                                obj.Password = undefined
                                obj.IsPasswordNeeded = true
                                obj.AuthToken = undefined
                            }
                            if (obj.input?.startsWith("SRT L")) {
                                let temp: any = obj.inputStats
                                obj.peerIP = temp.peerIP
                            }
                            else if (obj.input?.startsWith("SRT C")) {
                                let temp = obj.input.split(" ")
                                obj.peerIP = temp[2]
                            }
                            else if (obj.input?.startsWith("UDP")) {
                                obj.peerIP = obj.sourceSSMIP
                            }

                            try {
                                if (obj.peerIP) {
                                    if (obj.peerIP !== "") {
                                        if (!obj.Password) {
                                            let encoderDevice = await customerDeviceModel.findOne({ IP: obj.peerIP.split(":")[0] })
                                            if (encoderDevice?.Password) {
                                                obj.Password = encoderDevice?.Password
                                                obj.AuthToken = encoderDevice?.AuthToken
                                                obj.IsPasswordNeeded = encoderDevice?.IsPasswordNeeded
                                                obj.IsCorrect = encoderDevice?.IsCorrect
                                            }
                                        }
                                        this.savePropertiesAndStatusInContainerStats(obj.peerIP?.split(":")[0], obj.Id, obj.Password, obj.AuthToken, obj.IsPasswordNeeded, obj.RegionID, obj.SystemID, obj.deviceip)
                                    } else {
                                        obj.Password = undefined
                                        obj.AuthToken = undefined
                                        obj.IsPasswordNeeded = false
                                        obj.IsEncoderNeeded = false
                                        obj.IsCorrect = true
                                    }
                                } else {
                                    obj.Password = undefined
                                    obj.AuthToken = undefined
                                    obj.IsPasswordNeeded = false
                                    obj.IsEncoderNeeded = false
                                    obj.IsCorrect = true

                                    var blob = {
                                        peerIP: "",
                                        inputStats: obj.inputStats,
                                        properties: {}
                                    }

                                    containerStreamStatsModel.updateOne({ _id: containers[j].Id }, blob, {
                                        new: true
                                    }, (err) => {
                                        if (err) return;
                                    })
                                }
                            } catch (error) {
                                // console.log("Unable to find  for peer IP", obj.peerIP):
                                return
                            }
                            if (container === null || container.length === 0) {
                                obj.save()
                            }
                            else {
                                containerStreamStatsModel.updateOne({ _id: containers[j].Id }, obj, {
                                    new: true
                                }, (err) => {
                                    if (err) return;
                                })
                            }
                            containerIds.push(containers[j].Id);
                        } catch (error) {
                            continue
                        }
                    }
                    try {
                        await this.SaveEllvisSettings(devices[i].IP);
                    } catch (error) {
                        console.log("Unable to save settings for ellivis", devices[i].IP)
                    }
                } catch (error) {
                    continue
                }
            }
            if (deleteContainers) {
                await containerStreamStatsModel.deleteMany({ _id: { $nin: containerIds } }).then((err) => {
                    if (err) return;
                })
            }
        } catch (error) {
            console.log(error)
        }

    }

    public UploadMibFile = async () => {
        // let checkMibFile = path.join(process.cwd(), '/usr/share/snmp/mibs/RADIANT-VCDMS-MIB.txt');
        try {
            let checkMibFile = fs.existsSync('/usr/share/snmp/mibs/RADIANT-VCDMS-MIB.txt')
            if (!checkMibFile) {
                const filePath = './Mib/RADIANT-VCDMS-MIB.txt';
                const filePathCopy = '/usr/share/snmp/mibs/RADIANT-VCDMS-MIB.txt';
                fs.copyFile(filePath, filePathCopy, (err) => {
                    if (err) return;
                    console.log('File Copy Successfully.');
                });
            }
        } catch (error) {
            return
        }

    }

    public SendSnmpTrapCriticalRecieved = async (device: any) => {
        // -------------------------------- sending snmp trap to the snmp manager----------------------------------------------------------
        await this.UploadMibFile();
        let getSnmpDetails: any = await snmpModel.find({});
        if (getSnmpDetails.length > 0) {
            let TimeAndDate = new Date().toLocaleString();
            let options = {
                port: 161,
                retries: 1,
                timeout: 5000,
                transport: "udp4",
                trapPort: 162,
                version: snmp.Version3,
                idBitsSize: 32,
            };

            // Example user
            let user = {
                name: getSnmpDetails[0].SnmpV3User,
                level: snmp.SecurityLevel.authPriv,
                authProtocol: snmp.AuthProtocols.sha,
                authKey: "madeahash",
                privProtocol: snmp.PrivProtocols.des,
                privKey: "privycouncil"
            };
            if (getSnmpDetails[0].SnmpVersion === '1' || getSnmpDetails[0].SnmpVersion === '2c') {
                let options = {}
                if (getSnmpDetails[0].SnmpVersion === '1') {
                    options = {
                        port: 161,
                        retries: 1,
                        timeout: 2 * 5000,
                        backoff: 1.0,
                        transport: "udp4",
                        trapPort: 162,
                        version: snmp.Version1,
                        backwardsGetNexts: true,
                        reportOidMismatchErrors: false,
                        idBitsSize: 32
                    };
                } else {
                    options = {
                        port: 161,
                        retries: 1,
                        timeout: 2 * 5000,
                        backoff: 1.0,
                        transport: "udp4",
                        trapPort: 162,
                        version: snmp.Version2c,
                        backwardsGetNexts: true,
                        reportOidMismatchErrors: false,
                        idBitsSize: 32
                    };
                }

                let session = snmp.createSession(getSnmpDetails[0].SnmpManager, getSnmpDetails[0].CommunityName, options);
                let trapOid = "1.3.6.1.4.1.3445.1.0";
                let varbinds = [
                    {
                        oid: "1.3.6.1.4.1.3445.1.0",
                        type: snmp.ObjectType.OctetString,
                        value: (device ? `VCDMS: Critical Alarm Recieved ${TimeAndDate} ${device.DeviceType} ${device.IP} ${device.DeviceName} Stopped `
                            : 'VCDMS SNMP DEFAULT TRAP')
                    }
                ];

                // version 2c should have been specified when creating the session
                session.trap(trapOid, varbinds, function (error) {
                    if (error)
                        console.error(error);
                });

            } else {
                options["context"] = "";
                let varbinds = [
                    {
                        oid: "1.3.6.1.4.1.3445.1.0",
                        type: snmp.ObjectType.OctetString,
                        value: `VCDMS: Critical Alarm Recieved ${TimeAndDate} ${device.DeviceType} ${device.IP} ${device.DeviceName} Stopped `
                    }
                ];
                let session = snmp.createV3Session(getSnmpDetails[0].SnmpManager, user, options);
                dns.lookup(os.hostname(), function (error, address) {
                    if (error) {
                        console.trace(error);
                    } else {
                        // address will be ignored for version 2c
                        session.trap("1.3.6.1.4.1.3445.1.0", varbinds,
                            address, (error) => {
                                if (error)
                                    console.trace("Trap failed: " + error);
                                else {
                                    // console.log("Trap sent successfully");
                                }
                            });
                    }
                });
            }
        }
        return { ack: "1" }
        // -------------------------------------------Trap sending ----->end-----------------------------------------
    }


    public SendSnmpTrapCriticalCleared = async (device: any) => {
        await this.UploadMibFile();
        // -------------------------------- sending snmp trap to the snmp manager----------------------------------------------------------

        let getSnmpDetails: any = await snmpModel.find({});
        if (getSnmpDetails.length > 0) {
            let TimeAndDate = new Date().toLocaleString();
            let options = {
                port: 161,
                retries: 1,
                timeout: 5000,
                transport: "udp4",
                trapPort: 162,
                version: snmp.Version3,
                idBitsSize: 32,
            };

            // Example user
            let user = {
                name: getSnmpDetails[0].SnmpV3User,
                level: snmp.SecurityLevel.authPriv,
                authProtocol: snmp.AuthProtocols.sha,
                authKey: "madeahash",
                privProtocol: snmp.PrivProtocols.des,
                privKey: "privycouncil"
            };
            if (getSnmpDetails[0].SnmpVersion === '1' || getSnmpDetails[0].SnmpVersion === '2c') {
                let options = {}
                if (getSnmpDetails[0].SnmpVersion === '1') {
                    options = {
                        port: 161,
                        retries: 1,
                        timeout: 2 * 5000,
                        backoff: 1.0,
                        transport: "udp4",
                        trapPort: 162,
                        version: snmp.Version1,
                        backwardsGetNexts: true,
                        reportOidMismatchErrors: false,
                        idBitsSize: 32
                    };
                } else {
                    options = {
                        port: 161,
                        retries: 1,
                        timeout: 2 * 5000,
                        backoff: 1.0,
                        transport: "udp4",
                        trapPort: 162,
                        version: snmp.Version2c,
                        backwardsGetNexts: true,
                        reportOidMismatchErrors: false,
                        idBitsSize: 32
                    };
                }

                let session = snmp.createSession(getSnmpDetails[0].SnmpManager, getSnmpDetails[0].CommunityName, options);
                let trapOid = "1.3.6.1.4.1.3445.1.0";
                let varbinds = [
                    {
                        oid: "1.3.6.1.4.1.3445.1.0",
                        type: snmp.ObjectType.OctetString,
                        value: `VCDMS: Critical Alarm Cleared ${TimeAndDate} ${device.DeviceType} ${device.IP} ${device.DeviceName} Stopped `
                    }
                ];

                // version 2c should have been specified when creating the session
                session.trap(trapOid, varbinds, function (error) {
                    if (error)
                        console.error(error);
                });

            } else {
                options["context"] = "";
                let varbinds = [
                    {
                        oid: "1.3.6.1.4.1.3445.1.0",
                        type: snmp.ObjectType.OctetString,
                        value: `VCDMS: Critical Alarm Cleared ${TimeAndDate} ${device.DeviceType} ${device.IP} ${device.DeviceName} Stopped `
                    }
                ];
                let session = snmp.createV3Session(getSnmpDetails[0].SnmpManager, user, options);
                dns.lookup(os.hostname(), function (error, address) {
                    if (error) {
                        console.trace(error);
                    } else {
                        // address will be ignored for version 2c
                        session.trap("1.3.6.1.4.1.3445.1.0", varbinds,
                            address, (error) => {
                                if (error)
                                    console.trace("Trap failed: " + error);
                                else {
                                    // console.log("Trap sent successfully");
                                }
                            });
                    }
                });
            }
        }
        // -------------------------------------------Trap sending ----->end-----------------------------------------
    }

    public downloadMIBFile = async (req, res) => {
        try {
            let pathurl = req.path;
            // let sourceBackupPath = path.join(process.cwd(), 'usr/share/snmp/mibs/RADIANT-VCDMS-MIB.txt');
            // await zip(sourceBackupPath, 'Mib.zip');
            let cd = path.join(process.cwd(), `Mib.txt`);
            if (pathurl !== '/') {
                const response = res.download("/usr/share/snmp/mibs/RADIANT-VCDMS-MIB.txt", `Mib.txt`, err => {
                    if (err) return err;
                    console.log();
                }).catch(err => {
                    console.log(err);
                });
                return response;
            }
        } catch (error) {
            return { err: error };
        }
    }


    public SaveContainersAndStatsByDeviceIP = async (IP: any, manual: any) => {
        try {
            let isSuccessful = false;
            const devices: any = await customerDeviceModel.find({ IP: IP });
            await this.checkEllvisPassword(devices);
            let containerIds = Array();
            let deleteContainers = true
            let majorAlarm: any = await MAJORALARMSModel.find({})
            if (majorAlarm) {
                if (majorAlarm.length > 0) {
                    majorAlarm = majorAlarm[0];
                }
            }
            for (let i = 0; i < devices.length; i++) {

                try {
                    let req = new Container()
                    req.ip = devices[i].IP
                    req.Password = devices[i].Password
                    req.AuthToken = devices[i].AuthToken
                    let containers
                    try {
                        containers = await ellvisServicesV1.GetAllContainers(req)
                        if (containers) isSuccessful = true;
                        if (secretUtil.ENABLE_DEBUG_LOG) {
                            if (manual === 'manual') {
                                logging.logger.info({ type: 'manualley' }, `Got ${containers.length} stats for IP ${containers.IP}`);
                            } else {
                                logging.logger.info({ type: 'by crone' }, `Got ${containers.length} stats for IP ${containers.IP}`);
                            }
                        }
                    } catch (error) {
                        deleteContainers = false
                        isSuccessful = false
                        // console.log("Unable to find container for IP", devices[i].IP)
                        logging.logger.error(`Unable to find containers for IP ${devices[i].IP}`);

                        continue
                    }
                    let newreq = new ConnectedDevice()
                    newreq.IP = devices[i].IP
                    newreq.Password = devices[i].Password
                    newreq.AuthToken = devices[i].AuthToken
                    let stats

                    try {
                        stats = await ellvisServicesV1.GetEllvisStreamStats(newreq)
                        if (stats) isSuccessful = true;
                        if (secretUtil.ENABLE_DEBUG_LOG) {
                            if (manual === 'manual') {
                                logging.logger.info({ type: 'manualley' }, { stats: stats }, `Got ${stats.length} stats for IP ${newreq.IP}`);
                            } else {
                                logging.logger.info({ type: 'by crone' }, { stats: stats }, `Got ${stats.length} stats for IP ${newreq.IP}`);
                            }
                        }
                    } catch (error) {
                        deleteContainers = false
                        isSuccessful = false
                        if (secretUtil.ENABLE_DEBUG_LOG) {
                            logging.logger.error(`Unable to find stats for IP ${devices[i].IP}`);
                        }
                        continue
                    }
                    let isExistEllvis = await customerDeviceModel.find({ IP: devices[i].IP });
                    if (isExistEllvis) {
                        let containerStream: any = await containerStreamStatsModel.find({ deviceip: devices[i].IP })
                        for (let i = 0; i < containerStream.length && containerStream.length; i++) {

                            let filterStream = containers.filter(containersData => containersData.Id == containerStream[i].Id);
                            if (filterStream.length == 0) {
                                await containerStreamStatsModel.deleteOne({ Id: containerStream[i].id });
                            }
                        }
                    }
                    for (let j = 0; j < containers.length; j++) {
                        try {
                            let isExistEllvis = await customerDeviceModel.find({ IP: devices[i].IP });
                            if (!isExistEllvis) {
                                await containerStreamStatsModel.deleteMany({ deviceip: devices[i].IP });
                                break;
                            }
                            let container: ContainersStreamStats | any = await containerStreamStatsModel.findOne({ _id: containers[j].Id })

                            let obj = new containerStreamStatsModel()
                            if (container) {
                                if (container.AuthToken) {
                                    obj.AuthToken = container.AuthToken
                                }
                                if (container.Password) {
                                    obj.Password = container.Password
                                }
                                if (container.IsPasswordNeeded) {
                                    obj.IsPasswordNeeded = container.IsPasswordNeeded
                                }
                            } else {
                                obj.Password = undefined
                                obj.IsPasswordNeeded = true
                                obj.AuthToken = undefined
                            }
                            obj.DeviceName = devices[i].DeviceName
                            obj.deviceip = devices[i].IP
                            obj.Id = containers[j].Id
                            obj.RegionID = devices[i].RegionID
                            obj.SystemID = devices[i].SystemID
                            obj.state = containers[j].state
                            obj.comment = containers[j].comment ? containers[j].comment : "(No-Comment)"
                            obj.qamConfig = containers[j].qamConfig
                            obj.interval = containers[j].interval
                            obj.ps = containers[j].ps
                            obj.contimeo = containers[j].contimeo
                            obj.tlpktdrop = containers[j].tlpktdrop
                            obj.pbkeylen = containers[j].pbkeylen
                            obj.passphrase = containers[j].passphrase
                            obj.sourceLatency = containers[j].sourceLatency
                            obj.sourceProtocol = containers[j].sourceProtocol
                            obj.sourceEncryption = containers[j].sourceEncryption
                            obj.sourceEncryptionKey = containers[j].sourceEncryptionKey
                            obj.sourceTimeout = containers[j].sourceTimeout
                            obj.sourceIP = containers[j].sourceIP
                            obj.sourcePort = containers[j].sourcePort
                            obj.sourceSSMIP = containers[j].sourceSSMIP
                            obj.sourceOutgoingPort = containers[j].sourceOutgoingPort
                            obj.sourceAdapter = containers[j].sourceAdapter
                            obj.sourceAdapterName = containers[j].sourceAdapterName
                            obj.sourceTtl = containers[j].sourceTtl
                            obj.sourceSrtMode = containers[j].sourceSrtMode
                            obj.sourceDropPackets = containers[j].sourceDropPackets
                            obj.destProtocol = containers[j].destProtocol
                            obj.destIP = containers[j].destIP
                            obj.destTtl = containers[j].destTtl
                            obj.destPort = containers[j].destPort
                            obj.destOutgoingPort = containers[j].destOutgoingPort
                            obj.destSrtMode = containers[j].destSrtMode
                            obj.destAdapter = containers[j].destAdapter
                            obj.destAdapterName = containers[j].destAdapterName
                            obj.destLatency = containers[j].destLatency
                            obj.destTimeout = containers[j].destTimeout
                            obj.destEncryption = containers[j].destEncryption
                            obj.destEncryptionKey = containers[j].destEncryptionKey
                            obj.destDropPackets = containers[j].destDropPackets
                            obj.destDashSegmentDuration = containers[j].destDashSegmentDuration
                            obj.destDashMinUpdatePeriod = containers[j].destDashMinUpdatePeriod
                            obj.destDashMinBufferTime = containers[j].destDashMinBufferTime
                            obj.destDashSuggestedPresentationDelay = containers[j].destDashSuggestedPresentationDelay
                            obj.destDashTimeShiftBufferDepth = containers[j].destDashTimeShiftBufferDepth
                            obj.destDashPreservedSegmentsOutsideOfLiveWindow = containers[j].destDashPreservedSegmentsOutsideOfLiveWindow
                            obj.destDashSegmentTemplateConstantDuration = containers[j].destDashSegmentTemplateConstantDuration
                            obj.destDashDir = containers[j].destDashDir
                            obj.destHlsSegmentDuration = containers[j].destHlsSegmentDuration
                            obj.destHlsFragmentDuration = containers[j].destHlsFragmentDuration
                            obj.destHlsTimeShiftBufferDepth = containers[j].destHlsTimeShiftBufferDepth
                            obj.destHlsPreservedSegmentsOutsideOfLiveWindow = containers[j].destHlsPreservedSegmentsOutsideOfLiveWindow
                            obj.destHlsEnableIframe = containers[j].destHlsEnableIframe
                            obj.destRtmpLocation = containers[j].destRtmpLocation
                            obj.inputStream = containers[j].inputStream
                            obj.outputStream = containers[j].outputStream
                            obj.streamId = stats[j].Id
                            obj.dir = stats[j].dir
                            obj.input = stats[j].input
                            obj.output = stats[j].output
                            obj.streamcomment = stats[j].streamcomment

                            obj.status = stats[j].status
                            obj.inputStats = stats[j].inputStats
                            obj.outputStats = stats[j].outputStats
                            obj._id = containers[j].Id
                            let lossPackets = stats[j] && stats[j].inputStats ? stats[j].inputStats.recv ? (Number.parseFloat((stats[j].inputStats["recv"]["packetsDroppedTotal"]).toFixed(2)) / (Number.parseFloat((stats[j].inputStats['recv']["packetsDroppedTotal"]).toFixed(2)) + Number.parseFloat((stats[j].inputStats["recv"]["packetsTotal"]).toFixed(2)))) * 100 : 0 : 0
                            let linkEfficiency = stats[j] && stats[j].inputStats ? stats[j].inputStats.recv ? (Number.parseFloat((stats[j].inputStats["recv"]["packetsTotal"]).toFixed(2)) / (Number.parseFloat((stats[j].inputStats['recv']["packetsBelatedTotal"]).toFixed(2)) + Number.parseFloat((stats[j].inputStats["recv"]["packetsTotal"]).toFixed(2)) + Number.parseFloat((stats[j].inputStats["recv"]["packetsRetransmittedTotal"]).toFixed(2)))) * 100 : 0 : 0
                            if (majorAlarm) {

                                if (majorAlarm.Type === "LinkEfficiency" && stats[j].status === "connected") {
                                    if (linkEfficiency <= majorAlarm.Value && stats[j].inputStats !== undefined && Object.keys(stats[j].inputStats).length > 0) {

                                        obj.MailStatus = "major";
                                    } else {
                                        obj.MailStatus = stats[j].status;
                                    }
                                }

                                else if (majorAlarm.Type === "LostPackets" && stats[j].status === "connected") {
                                    if (lossPackets >= majorAlarm.Value && stats[j].inputStats !== undefined && Object.keys(stats[j].inputStats).length > 0) {

                                        obj.MailStatus = "major";
                                    } else {
                                        obj.MailStatus = stats[j].status;
                                    }
                                }
                                else {
                                    obj.MailStatus = stats[j].status;
                                }
                            }
                            else {
                                obj.MailStatus = stats[j].status;
                            }
                            if (obj.input?.startsWith("SRT L")) {
                                let temp: any = obj.inputStats
                                obj.peerIP = temp.peerIP
                            }
                            else if (obj.input?.startsWith("SRT C")) {
                                let temp = obj.input.split(" ")
                                obj.peerIP = temp[2]
                            }
                            else if (obj.input?.startsWith("UDP")) {
                                obj.peerIP = obj.sourceSSMIP
                            }

                            try {
                                if (obj.peerIP) {
                                    if (obj.peerIP.split(":")[0] !== "") {
                                        if (!obj.Password) {
                                            let encoderDevice = await customerDeviceModel.findOne({ IP: obj.peerIP.split(":")[0] })
                                            if (encoderDevice?.Password) {
                                                obj.Password = encoderDevice?.Password
                                                obj.AuthToken = encoderDevice?.AuthToken
                                                obj.IsPasswordNeeded = encoderDevice?.IsPasswordNeeded
                                                obj.IsCorrect = encoderDevice?.IsCorrect
                                            }
                                        }
                                        this.savePropertiesAndStatusInContainerStats(obj.peerIP.split(":")[0], obj.Id, obj.Password, obj.AuthToken, obj.IsPasswordNeeded, obj.RegionID, obj.SystemID, obj.deviceip)
                                    } else {
                                        obj.Password = undefined
                                        obj.AuthToken = undefined
                                        obj.IsPasswordNeeded = false
                                        obj.IsEncoderNeeded = false
                                        obj.IsCorrect = true
                                    }
                                } else {
                                    obj.Password = undefined
                                    obj.AuthToken = undefined
                                    obj.IsPasswordNeeded = false
                                    obj.IsEncoderNeeded = false
                                    obj.IsCorrect = true
                                }
                            } catch (error) {
                                return;
                            }
                            if (container === null || container.length === 0) {
                                obj.save()
                            }
                            else {
                                containerStreamStatsModel.updateOne({ _id: containers[j].Id }, obj, {
                                    new: true
                                }, (err) => {
                                    if (err) return;
                                })
                            }
                            containerIds.push(containers[j].Id);
                        } catch (error) {
                            isSuccessful = false
                            continue
                        }
                    }
                    try {
                        await this.SaveEllvisSettings(devices[i].IP);
                    } catch (error) {
                        console.log("Unable to save settings for ellivis", devices[i].IP)
                    }
                } catch (error) {
                    continue
                }
            }
            if (deleteContainers) {
                // await containerStreamStatsModel.deleteMany({ _id: { $nin: containerIds }, IP: IP }).then((err) => {
                //     if (err) return;
                // })
            }
            if (isSuccessful) {

                // alarm report for ellvis stop
                let isExist = await alarmsReportingModel.find({ StreamID: devices[0]?.IP });
                if (isExist.length > 0 || (isExist[isExist.length - 1] && !isExist[isExist.length - 1]?.TimeCleared)) {
                    let created: any = isExist[isExist.length - 1]?.TimeCreated;
                    let cleared = new Date();
                    let diff = cleared.getTime() - created.getTime();
                    let timeinterval = commonUtil.msToTime(diff);
                    let blob = {
                        TimeInterval: timeinterval,
                        TimeCleared: cleared
                    }
                    await alarmsReportingModel.updateOne({ StreamID: devices[0]?.IP, TimeCleared: { $eq: undefined }, AlarmType: { $ne: "Critical(No Device Available)" } }, { $set: blob }, { new: true }, (err) => {
                        if (err) return;
                    })

                    // sending mail for ellvis start
                    let smtp = await SMTPModel.find({})
                    let content = ""
                    let critical: any = []
                    let subject: any = []
                    let region: any = await regionModel.findOne({ _id: devices[0]?.RegionID })
                    let system: any = await systemModel.findOne({ _id: devices[0]?.SystemID });
                    let regionmails = region.Email.split(",")
                    for (let j = 0; j < regionmails.length; j++) {
                        critical.push(regionmails[j])
                        subject.push(`Critical Alarm Cleared for Region ${region?.Region}`)
                    }
                    let systemCriticalMails = system.Contact.split(",");
                    for (let j = 0; j < systemCriticalMails.length; j++) {
                        critical.push(systemCriticalMails[j])
                        subject.push(`Critical Alarm Cleared for System ${system?.System}`)
                    }
                    let updatedAt = devices[0]?.updatedAt;
                    let timezone2: any = await customerServicesV1.gettimezone();
                    let timezone = timezone2.offset;
                    let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                    let date = str.substring(0, 16)
                    let time = str.substring(16, 25)
                    content = `
                    Region : ${region?.Region}<br>
                    System : ${system?.System}<br>
                    <h3 style="color:green;">"Critical Alarm Received"</h3>
                    Time : ${time}<br>
                    Date: ${date}<br>
                    Device Name: ${devices[0]?.DeviceName}<br>
                    Device IP Address: ${devices[0]?.IP}<br>
                    Stream ID: ${devices[0]?.IP}<br>
                    Alarm Type: Device Start<br>
                    `
                    if (smtp.length !== 0) {
                        commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                    }// sending mail end

                    this.SendSnmpTrapCriticalCleared(devices[0]);
                }
                return {
                    status: "success",
                    message: "Refreshed ELLVIS"
                }
            }
            else {
                // alarm report and mail send for ellvis stop
                let isExist = await alarmsReportingModel.find({ StreamID: devices[0]?.IP });
                if (isExist.length == 0 || (isExist[isExist.length - 1] && isExist[isExist.length - 1]?.TimeCleared)) {
                    let smtp = await SMTPModel.find({})
                    let content = ""
                    let critical: any = []
                    let subject: any = []
                    let region: any = await regionModel.findOne({ _id: devices[0]?.RegionID })
                    let system: any = await systemModel.findOne({ _id: devices[0]?.SystemID });
                    let regionmails = region.Email.split(",")
                    for (let j = 0; j < regionmails.length; j++) {
                        critical.push(regionmails[j])
                        subject.push(`Critical Alarm Received for Region ${region?.Region}`)
                    }
                    let systemCriticalMails = system.Contact.split(",");
                    for (let j = 0; j < systemCriticalMails.length; j++) {
                        critical.push(systemCriticalMails[j])
                        subject.push(`Critical Alarm Received for System ${system?.System}`)
                    }
                    let updatedAt = devices[0]?.updatedAt;
                    let timezone2: any = await customerServicesV1.gettimezone();
                    let timezone = timezone2.offset;
                    let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                    let date = str.substring(0, 16)
                    let time = str.substring(16, 25)
                    content = `
                    Region : ${region?.Region}<br>
                    System : ${system?.System}<br>
                    <h3 style="color:red;">"Critical Alarm Received"</h3>
                    Time : ${time}<br>
                    Date: ${date}<br>
                    Device Name: ${devices[0]?.DeviceName}<br>
                    Device IP Address: ${devices[0]?.IP}<br>
                    Stream ID: ${devices[0]?.IP}<br>
                    Alarm Type: Device Stopped<br>
                    `
                    if (smtp.length !== 0)
                        commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                    let model = new alarmsReportingModel();
                    model.Subject = `Critical Alarm Received for Region ${devices[0]?.Region}`;
                    model.RegionID = devices[0]?.RegionID;
                    model.Region = devices[0]?.Region;
                    model.System = system?.System;
                    model.SystemID = devices[0]?.SystemID;
                    model.AlarmType = "Critical";
                    model.TimeCreated = new Date();
                    model.Device = devices[0]?.DeviceName;
                    model.StreamID = devices[0]?.IP;
                    let mailsSent = {}
                    for (let i = 0; i < critical.length; i++) {
                        mailsSent[critical[i]] = 1;
                    }
                    let mailarray = _.keys(mailsSent)
                    let mails = ""
                    for (let i = 0; i < mailarray.length; i++) {
                        if (i === mailarray.length - 1) {
                            mails += mailarray[i]
                        }
                        else
                            mails += mailarray[i] + ", "
                    }
                    if (smtp.length !== 0) model.MailInformed = mails
                    model.save();
                    // report end


                    // -------------------------------- sending snmp trap to the snmp manager----------------------------------------------------------
                    this.SendSnmpTrapCriticalRecieved(devices[0]);
                }
                await containerStreamStatsModel.updateMany({ deviceip: devices[0]?.IP }, { $set: { MailStatus: "disconnected" } })
            }
            return {
                status: "failure",
                message: "Unable to refresh ELLVIS"
            }
        } catch (error) {
            return;
        }
    }

    public SetEllvisPassword = async (req: any) => {
        if (!req.IP)
            return;
        try {
            let authLogin = await ellvisServicesV1.VerifyPassword(req.IP.split(":")[0], req.Password);
            let ack = "0"
            let message = ""
            if (authLogin) {
                if (authLogin.accessToken) {
                    await customerDeviceModel.updateOne({ _id: req._id }, { $set: { Password: req.Password, AuthToken: authLogin.accessToken, IsCorrect: true, IsPasswordNeeded: false } })
                    ack = "1";
                    message = "Ellvis login successfully"
                    commonUtil.updateUserReport(req, '');
                    this.SaveContainersAndStatsByDeviceIP(req.IP, '')
                }
                else {
                    ack = "0";
                    message = "Password is incorrect or device is not working"
                }
            } else {
                ack = "0";
                message = "Password is incorrect or device is not working"
            }
            return {
                ack: ack,
                message: message
            }
        } catch (err) {
            return null;
        }
    }

    public SetEncoderPassword = async (req: any) => {
        if (!req.IP)
            return
        try {
            let authLogin: any = await encoderServicesV1.RequestLogin(req.Password, req.IP);
            let ack = "0"
            let message = ""
            if (authLogin) {
                if (authLogin.status === "success") {
                    if (authLogin.session.id !== "---") {
                        await customerDeviceModel.updateOne({ _id: req._id }, { $set: { Password: req.Password, AuthToken: authLogin.session.id, IsCorrect: true, IsPasswordNeeded: false } }, { new: false }, (err) => {
                            if (err) return;
                        })
                        await containerStreamStatsModel.updateMany({ peerIP: { $regex: req.IP.split(":")[0] } }, { $set: { Password: req.Password, AuthToken: authLogin.session.id, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        await encoderModel.updateMany({ peerIP: { $regex: req.IP.split(":")[0] } }, { $set: { Password: req.Password, AuthToken: authLogin.session.id, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        commonUtil.updateUserReport(req, '')
                        this.SavePropertiesAndStatus(req.IP, '');
                        ack = "1";
                        message = "Password has been updated successfully"
                    }
                    else {
                        await customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: true, IsPasswordNeeded: false }, $unset: { Password: 1, AuthToken: 1 } }, { new: false }, (err) => {
                            if (err) return;
                        })
                        await containerStreamStatsModel.updateMany({ peerIP: { $regex: req.IP.split(":")[0] } }, { $set: { IsCorrect: true, IsPasswordNeeded: false }, $unset: { Password: 1, AuthToken: 1 } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        await encoderModel.updateMany({ peerIP: { $regex: req.IP.split(":")[0] } }, { $set: { IsCorrect: true, IsPasswordNeeded: false }, $unset: { Password: 1, AuthToken: 1 } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        this.SavePropertiesAndStatus(req.IP, '');
                        ack = "1";
                        message = "Password has been updated successfully"
                    }
                }
                else {
                    ack = "0";
                    message = "Password is incorrect or device is not working"
                }
            } else {
                ack = "0";
                message = "Password is incorrect or device is not working"
            }
            return {
                ack: ack,
                message: message
            }
        } catch (err) {
            return null;
        }
    }

    public SetStreamPassword = async (req: any) => {
        if (!req.IP)
            return
        try {
            let authLogin: any = await encoderServicesV1.RequestLogin(req.Password, req.IP.split(":")[0]);
            let ack = "0"
            let message = ""
            if (authLogin) {
                if (authLogin.status === "success") {
                    if (authLogin.session.id !== "---") {
                        await customerDeviceModel.updateOne({ IP: req.IP.split(":")[0] }, { $set: { Password: req.Password, AuthToken: authLogin.session.id, IsCorrect: true, IsPasswordNeeded: true } }, { new: false }, (err) => {
                            if (err) return;
                        })
                        await containerStreamStatsModel.updateMany({ peerIP: { $regex: req.IP.split(":")[0] } }, { $set: { Password: req.Password, AuthToken: authLogin.session.id, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        await encoderModel.updateMany({ peerIP: { $regex: req.IP.split(":")[0] } }, { $set: { Password: req.Password, AuthToken: authLogin.session.id, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        commonUtil.updateUserReport(req, '')
                        this.SavePropertiesAndStatus(req.IP, '');
                        ack = "1";
                        message = "Password has been updated successfully"
                    }
                    else {
                        await customerDeviceModel.updateOne({ IP: req.IP.split(":")[0] }, { $set: { IsCorrect: true, IsPasswordNeeded: false }, $unset: { Password: 1, AuthToken: 1 } }, { new: false }, (err) => {
                            if (err) return
                        })
                        await containerStreamStatsModel.updateMany({ peerIP: { $regex: req.IP.split(":")[0] } }, { $set: { IsCorrect: true, IsPasswordNeeded: false }, $unset: { Password: 1, AuthToken: 1 } }, { new: true }, (err) => {
                            if (err) return
                        })
                        await encoderModel.updateMany({ peerIP: { $regex: req.IP.split(":")[0] } }, { $set: { IsCorrect: true, IsPasswordNeeded: false }, $unset: { Password: 1, AuthToken: 1 } }, { new: true }, (err) => {
                            if (err) return
                        })
                        this.SavePropertiesAndStatus(req.IP, '');
                        ack = "1";
                        message = "Password has been updated successfully"
                    }
                }
                else {
                    ack = "0";
                    message = "Password is incorrect or device is not working"
                }
            } else {
                ack = "0";
                message = "Password is incorrect or device is not working"
            }
            return {
                ack: ack,
                message: message
            }
        } catch (err) {
            return null;
        }
    }

    public SaveEncoder = async () => {
        try {
            let deviceTypes = Array();
            deviceTypes.push(EllvisModel);
            deviceTypes.push("LEGACY");
            const devices: CustomerDevice[] = await customerDeviceModel.find({ $and: [{ DeviceType: { $nin: deviceTypes } }, { Region: { $ne: "OnBoardingRegion" } }] });

            for (let i = 0; i < devices.length; i++) {
                try {
                    await this.SavePropertiesAndStatus(devices[i].IP, '')
                } catch (err) {
                    continue;
                }
            }
        } catch (error) {
            return;
        }
    }

    public PingDevices = async () => {
        let devices: any = await customerDeviceModel.find({ and: [{ DeviceType: "LEGACY" }, { Region: { $ne: "OnBoardingRegion" } }] });
        for (let i = 0; i < devices.length; i++) {
            try {

                let resp: any = await new Promise((resolve, reject) => {
                    try {
                        let args = ""
                        if (process.platform == "linux") {
                            args = "-c 4";
                        }
                        exec(`ping ${args} ${devices[i].IP}`, (error, stdout, stderr) => {
                            if (error) return resolve({ ack: "0", })
                            if (stdout) return resolve({ ack: "1" })
                            if (stderr) return resolve({ ack: "0" })
                        })
                    } catch (error) {
                        resolve({})
                    }
                });
                if (resp.ack === "1") {
                    let isExist = await alarmsReportingModel.find({ StreamID: devices[i]?.IP });
                    if ((devices[i]?.status.status == 'connected') && (isExist[isExist.length - 1]?.TimeCreated && !isExist[isExist.length - 1]?.TimeCleared)) {
                        let smtp = await SMTPModel.find({})
                        let content = ""
                        let critical: any = []
                        let subject: any = []
                        let region: any = await regionModel.findOne({ _id: devices[i]?.RegionID })
                        let system: any = await systemModel.findOne({ _id: devices[i]?.SystemID });
                        let regionmails = region.Email.split(",")
                        for (let j = 0; j < regionmails.length; j++) {
                            critical.push(regionmails[j])
                            subject.push(`Critical Alarm Received for Region ${region?.Region}`)
                        }
                        let systemCriticalMails = system.Contact.split(",");
                        for (let j = 0; j < systemCriticalMails.length; j++) {
                            critical.push(systemCriticalMails[j])
                            subject.push(`Critical Alarm Received for System ${system?.System}`)
                        }
                        let updatedAt = devices[i]?.updatedAt;
                        let timezone2: any = await customerServicesV1.gettimezone();
                        let timezone = timezone2.offset;
                        let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                        let date = str.substring(0, 16)
                        let time = str.substring(16, 25)
                        content = `
                            Region : ${region?.Region}<br>
                            System : ${system?.System}<br>
                            <h3 style="color:green;">Critical Alarm Cleared</h3>
                            Time : ${time}<br>
                            Date: ${date}<br>
                            Device Name: ${devices[i]?.DeviceName}<br>
                            Device IP Address: ${devices[i]?.IP}<br>
                            Stream ID: ${devices[i]?.IP}<br>
                            Alarm Type: Device Connected<br>
                            `
                        if (smtp.length !== 0)
                            commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)

                        let created: any = isExist[isExist.length - 1]?.TimeCreated;
                        let cleared = new Date();
                        let diff = cleared.getTime() - created.getTime();
                        let timeinterval = commonUtil.msToTime(diff);
                        let blob = {
                            TimeInterval: timeinterval,
                            TimeCleared: cleared
                        }
                        alarmsReportingModel.updateOne({ StreamID: devices[i]?.IP, TimeCleared: { $eq: undefined } }, { $set: blob }, { new: true }, (err) => {
                            if (err) return;
                        })

                        // -------------------------------- sending snmp trap to the snmp manager----------------------------------------------------------
                        this.SendSnmpTrapCriticalCleared(devices[i]);
                    }
                    customerDeviceModel.updateOne({ _id: devices[i]._id }, { $set: { status: { status: "connected" } } }, { new: false }, (err) => {
                        if (err) return;
                    })
                }
                else {
                    let isExist = await alarmsReportingModel.find({ StreamID: devices[i]?.IP });
                    if ((devices[i]?.status.status == 'disconnected') && (isExist.length == 0 || (isExist[isExist.length - 1] && isExist[isExist.length - 1]?.TimeCleared))) {
                        let smtp = await SMTPModel.find({})
                        let content = ""
                        let critical: any = []
                        let subject: any = []
                        let region: any = await regionModel.findOne({ _id: devices[i]?.RegionID })
                        let system: any = await systemModel.findOne({ _id: devices[i]?.SystemID });
                        let regionmails = region.Email.split(",")
                        for (let j = 0; j < regionmails.length; j++) {
                            critical.push(regionmails[j])
                            subject.push(`Critical Alarm Received for Region ${region?.Region}`)
                        }
                        let systemCriticalMails = system.Contact.split(",");
                        for (let j = 0; j < systemCriticalMails.length; j++) {
                            critical.push(systemCriticalMails[j])
                            subject.push(`Critical Alarm Received for System ${system?.System}`)
                        }

                        let updatedAt = devices[i]?.updatedAt;
                        let timezone2: any = await customerServicesV1.gettimezone();
                        let timezone = timezone2.offset;
                        let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                        let date = str.substring(0, 16)
                        let time = str.substring(16, 25)
                        content = `
                            Region : ${region?.Region}<br>
                            System : ${system?.System}<br>
                            <h3 style="color:red;">Critical Alarm Received</h3>
                            Time : ${time}<br>
                            Date: ${date}<br>
                            Device Name: ${devices[i]?.DeviceName}<br>
                            Device IP Address: ${devices[i]?.IP}<br>
                            Stream ID: ${devices[i]?.IP}<br>
                            Alarm Type: Device Disconnected<br>
                            `
                        if (smtp.length !== 0)
                            commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                        let model = new alarmsReportingModel();
                        model.Subject = `Critical Alarm Received for Region ${devices[i]?.Region}`;
                        model.RegionID = devices[i]?.RegionID;
                        model.Region = devices[i]?.Region;
                        model.System = system?.System;
                        model.SystemID = devices[i]?.SystemID;
                        model.AlarmType = "Critical";
                        model.TimeCreated = new Date();
                        model.Device = devices[i]?.DeviceName;
                        model.StreamID = devices[i]?.IP;
                        let mailsSent = {}
                        for (let i = 0; i < critical.length; i++) {
                            mailsSent[critical[i]] = 1;
                        }
                        let mailarray = _.keys(mailsSent)
                        let mails = ""
                        for (let i = 0; i < mailarray.length; i++) {
                            if (i === mailarray.length - 1) {
                                mails += mailarray[i]
                            }
                            else
                                mails += mailarray[i] + ", "
                        }


                        // -------------------------------- sending snmp trap to the snmp manager----------------------------------------------------------

                        this.SendSnmpTrapCriticalRecieved(devices[i]);

                        if (smtp.length !== 0) model.MailInformed = mails
                        model.save(); break;
                    }

                    customerDeviceModel.updateOne({ _id: devices[i]._id }, { $set: { status: { status: "disconnected" } } }, { new: false }, (err) => {
                        if (err) return;
                    })
                }
            } catch (error) {
                customerDeviceModel.updateOne({ _id: devices[i]._id }, { $set: { status: { status: "disconnected" } } }, { new: false }, (err) => {
                    if (err) return;
                })
            }
        }
    }

    public checkDevicePrecentageForHotBackupDevices = async () => {
        try {
            let anyDeviceHasHotBackUp = await encoderModel.findOne({ hotBackup: true });
            if (!anyDeviceHasHotBackUp) return;
            let flag = false;
            let content = "";
            let msg = 'High Priority Mail'
            let msgContent = `All available hot spare IPs are below than 10% of the Total available devices`
            let subject: any = [];
            let mailarray: any = [];
            let criticalMailarray: any = [];
            let allAvailableDevices: any = await customerDeviceModel.find({ DeviceType: { $ne: 'LEGACY' }, hotBackup: true, spareIp: '' });
            let allAvailableHotBackupDevices: any = await HotbackupIpListModel.find({ inUse: { $ne: true } });
            let getAllSystems: any = await systemModel.find({});
            let getAllRegions: any = await regionModel.find({});
            let smtp: any = await SMTPModel.find({})
            let timezone2: any = await customerServicesV1.gettimezone();
            let timezone = timezone2.offset;
            let str = new Date(new Date().getTime() + timezone * 3600000).toUTCString();
            let date = str.substring(0, 16)
            let time = str.substring(16, 25)
            let TenPrecentageOfAvailableDevices = (allAvailableDevices.length > 0) ? (allAvailableDevices.length / 10) : 0;

            if (allAvailableHotBackupDevices.length === 0 && (!allAvailableDevices || allAvailableDevices.length > 0)) {
                // make reports by resion and systems
                for (let i = 0; i < getAllRegions.length; i++) {
                    let f = false;
                    let systemsUnderRegion: any = await systemModel.find({ Location: getAllRegions[i].Region });
                    for (let j = 0; j < systemsUnderRegion.length; j++) {
                        let anyCheckedDevice: any = await customerDeviceModel.findOne({ DeviceType: { $ne: 'LEGACY' }, hotBackup: true, spareIp: '', Region: getAllRegions[i].Region, SystemID: systemsUnderRegion[j]._id });
                        if (anyCheckedDevice) {
                            let isExistReport: any = await alarmsReportingModel.find({ StreamID: "No Device Available For Hot Backup", RegionID: getAllRegions[i]?._id, SystemID: systemsUnderRegion[j]?._id });
                            if (isExistReport.length === 0 || (isExistReport[isExistReport.length - 1] && isExistReport[isExistReport.length - 1]?.TimeCleared)) {

                                let systemCriticalMails = systemsUnderRegion[j].Contact.split(",");
                                for (let j = 0; j < systemCriticalMails.length; j++) {
                                    criticalMailarray.push(systemCriticalMails[j])
                                    subject.push("Critical Alert: No device available for Hot Backup");
                                }
                                let regionmails = getAllRegions[i].Email.split(",")
                                for (let j = 0; j < regionmails.length; j++) {
                                    criticalMailarray.push(regionmails[j]);
                                    subject.push("Critical Alert: No device available for Hot Backup");
                                }

                                let model = new alarmsReportingModel();
                                model.Subject = `Critical Alarm Received for Region ${getAllRegions[i]?.Region}`;
                                model.RegionID = getAllRegions[i]?._id;
                                model.Region = getAllRegions[i]?.Region;
                                model.System = systemsUnderRegion[j]?.System;
                                model.SystemID = systemsUnderRegion[j]?._id;
                                model.AlarmType = "Critical";
                                model.TimeCreated = new Date();
                                // model.Device = allAvailableDevices[i]?.DeviceName;
                                model.StreamID = "No Device Available For Hot Backup";
                                let mailsSent = {}
                                for (let i = 0; i < criticalMailarray.length; i++) {
                                    mailsSent[criticalMailarray[i]] = 1;
                                }
                                let mailarray = _.keys(mailsSent)
                                let mails = ""
                                for (let i = 0; i < mailarray.length; i++) {
                                    if (i === mailarray.length - 1) {
                                        mails += mailarray[i]
                                    }
                                    else
                                        mails += mailarray[i] + ", "
                                }
                                if (smtp.length !== 0) model.MailInformed = mails
                                model.save();   // report save 
                                flag = true;
                            }
                        }
                    }
                }

                if (flag) {
                    content = `
                        <h3 style="color:red;">Critical Mail Received</h3><br>
                        <p>No device available for hot backup</p><br>
                        Time : ${time}<br>
                        Date: ${date}<br>
                        `
                    if (smtp.length !== 0) {
                        commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, criticalMailarray, smtp[0].Sendername, smtp[0].isSecure)
                    }
                }

                return;
            }
            else if (allAvailableHotBackupDevices.length < TenPrecentageOfAvailableDevices) {
                // collecting mails for major alarm
                for (let i = 0; i < getAllSystems.length; i++) {
                    let systemCriticalMails = getAllSystems[i].Email.split(",");
                    for (let j = 0; j < systemCriticalMails.length; j++) {
                        mailarray.push(systemCriticalMails[j])
                        subject.push("Major Alert: Spare units availability is below 10%")
                    }
                }

                // let AllCheckedDeviceSystem: any = new Set();
                let AllSystemAndRegionsIds: any = new Set();
                // alarm repot for => all available hot backup devices are less than 10% of all checked devices
                for (let i = 0; i < allAvailableDevices.length; i++) {
                    let systemAndRegionIds = { RegionID: allAvailableDevices[i]?.RegionID, SystemId: allAvailableDevices[i]?.SystemID };
                    if (!AllSystemAndRegionsIds.has(systemAndRegionIds)) {
                        AllSystemAndRegionsIds.add(systemAndRegionIds);
                        let isExistReport: any = await alarmsReportingModel.find({ StreamID: "Hot SpareIP < 10%", RegionID: allAvailableDevices[i]?.RegionID, SystemID: allAvailableDevices[i]?.SystemID });
                        if (isExistReport.length === 0 || (isExistReport[isExistReport.length - 1] && isExistReport[isExistReport.length - 1]?.TimeCleared)) {
                            let system: any = await systemModel.findOne({ _id: allAvailableDevices[i].SystemID });
                            // AllCheckedDeviceSystem.add(system);
                            let model = new alarmsReportingModel();
                            model.Subject = `Major Alarm Received for Region ${allAvailableDevices[i]?.Region}`;
                            model.RegionID = allAvailableDevices[i]?.RegionID;
                            model.Region = allAvailableDevices[i]?.Region;
                            model.System = system?.System;
                            model.SystemID = allAvailableDevices[i]?.SystemID;
                            model.AlarmType = "Major";
                            model.TimeCreated = new Date();
                            // model.Device = allAvailableDevices[i]?.DeviceName;
                            model.StreamID = `Hot SpareIP < 10%`;

                            let systemCriticalMails = system.Email.split(",");
                            for (let j = 0; j < systemCriticalMails.length; j++) {
                                mailarray.push(systemCriticalMails[j])
                                subject.push("Major Alert: Spare units availability is below 10%")
                            }

                            let mailsSent = {}
                            for (let i = 0; i < systemCriticalMails.length; i++) {
                                mailsSent[systemCriticalMails[i]] = 1;
                            }

                            let mailarray1 = _.keys(mailsSent)
                            let mails = ""
                            for (let i = 0; i < mailarray1.length; i++) {
                                if (i === mailarray1.length - 1) {
                                    mails += mailarray1[i]
                                }
                                else
                                    mails += mailarray1[i] + ", "
                            }
                            if (smtp.length !== 0) model.MailInformed = mails
                            model.save();   // report save 
                            flag = true;
                        }

                    }
                }//end 

                // sending mail for Available hot backup devices are less than 10% of checked devices
                // let checkReportForNoDeviceAvailable: any = await alarmsReportingModel.findOne({ AlarmType: "Major(Hot SpareIP < 10%)", TimeCleared: undefined });
                if (flag) {
                    content = `
                    <h3 style="color:orange;">${msg}</h3><br>
                    <p>${msgContent}</p><br>
                    Time : ${time}<br>
                    Date: ${date}<br>
                    `
                    if (smtp.length !== 0) {
                        commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, mailarray, smtp[0].Sendername, smtp[0].isSecure)
                    }
                }// end

            } else if (allAvailableHotBackupDevices.length >= TenPrecentageOfAvailableDevices) {
                // cleared mail and reports when available hot backup devices >= 10% of all checked devices
                let setOfSystemsMails = new Set();
                let allCriticalReports: any = await alarmsReportingModel.find({ StreamID: "Hot SpareIP < 10%", TimeCleared: undefined });
                for (let i = 0; i < allCriticalReports.length; i++) {
                    let MailInformed = allCriticalReports[i].MailInformed.split(',');
                    for (let j = 0; j < MailInformed.length; j++) {
                        setOfSystemsMails.add(MailInformed[j]);
                    }
                    let created: any = allCriticalReports[i]?.TimeCreated;
                    let cleared = new Date();
                    let diff = cleared.getTime() - created.getTime();
                    let timeinterval = commonUtil.msToTime(diff);
                    let blob = {
                        TimeInterval: timeinterval,
                        TimeCleared: cleared
                    }
                    await alarmsReportingModel.updateOne({ _id: allCriticalReports[i]?._id }, { $set: blob }, { new: true }, (err) => { if (err) return; });
                }

                // sending mail
                for (let item of setOfSystemsMails.values()) {
                    mailarray.push(item);
                    subject.push("Major Alert: Spare units availability is greater than 10%")
                }

                content = `
                    <h3 style="color:green;">${msg}</h3><br>
                    <p>All available hot spare IPs are above than 10% of the Total available devices</p><br>
                    Time : ${time}<br>
                    Date: ${date}<br>
                    `
                if (smtp.length !== 0) {
                    commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, mailarray, smtp[0].Sendername, smtp[0].isSecure)
                }
            }
        } catch (err) {
            return null;
        }
    }

    public RefreshLegacy = async (IP: any) => {
        // try {
        let resp: any = await new Promise((resolve, reject) => {
            try {
                let args = ""
                if (process.platform === "linux") {
                    args = "-c 4";
                }
                exec(`ping ${args} ${IP}`, (error, stdout, stderr) => {
                    if (error) {
                        return resolve({ ack: "0", })
                    }
                    if (stdout) {
                        return resolve({ ack: "1" })
                    }
                    if (stderr) {
                        return resolve({ ack: "0" })
                    }
                })
            } catch (error) {
                resolve({})
            }
        });
        let device: any = await customerDeviceModel.findOne({ IP: IP })
        if (resp.ack !== '1') {
            // alarm report for legacy device stop

            // alarm report and mail send for legacy device stop
            let isExist = await alarmsReportingModel.find({ StreamID: device?.IP });
            if (isExist.length == 0 || (isExist[isExist.length - 1] && isExist[isExist.length - 1]?.TimeCleared)) {
                let smtp = await SMTPModel.find({})
                let content = ""
                let critical: any = []
                let subject: any = []
                let region: any = await regionModel.findOne({ _id: device?.RegionID })
                let system: any = await systemModel.findOne({ _id: device?.SystemID });
                let regionmails = region.Email.split(",")
                for (let j = 0; j < regionmails.length; j++) {
                    critical.push(regionmails[j])
                    subject.push(`Critical Alarm Received for Region ${region?.Region}`)
                }
                let systemCriticalMails = system.Contact.split(",");
                for (let j = 0; j < systemCriticalMails.length; j++) {
                    critical.push(systemCriticalMails[j])
                    subject.push(`Critical Alarm Received for System ${system?.System}`)
                }
                let updatedAt = device?.updatedAt;
                let timezone2: any = await customerServicesV1.gettimezone();
                let timezone = timezone2.offset;
                let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                let date = str.substring(0, 16)
                let time = str.substring(16, 25)
                content = `
                    Region : ${region?.Region}<br>
                    System : ${system?.System}<br>
                    <h3 style="color:red;">"Critical Alarm Received"</h3>
                    Time : ${time}<br>
                    Date: ${date}<br>
                    Device Name: ${device?.DeviceName}<br>
                    Device IP Address: ${device?.IP}<br>
                    Stream ID: ${device?.IP}<br>
                    Alarm Type: Device Stopped<br>
                    `
                if (smtp.length !== 0)
                    commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                let model = new alarmsReportingModel();
                model.Subject = `Critical Alarm Received for Region ${device?.Region}`;
                model.RegionID = device?.RegionID;
                model.Region = device?.Region;
                model.System = system?.System;
                model.SystemID = device?.SystemID;
                model.AlarmType = "Critical";
                model.TimeCreated = new Date();
                model.Device = device?.DeviceName;
                model.StreamID = device?.IP;
                let mailsSent = {}
                for (let i = 0; i < critical.length; i++) {
                    mailsSent[critical[i]] = 1;
                }
                let mailarray = _.keys(mailsSent)
                let mails = ""
                for (let i = 0; i < mailarray.length; i++) {
                    if (i === mailarray.length - 1) {
                        mails += mailarray[i]
                    }
                    else
                        mails += mailarray[i] + ", "
                }
                if (smtp.length !== 0) model.MailInformed = mails
                model.save();
            }
            // await containerStreamStatsModel.updateMany({ deviceip: device?.IP }, { $set: { MailStatus: "disconnected" } })

            await customerDeviceModel.updateOne({ IP: IP }, { $set: { status: { status: "disconnected" } } }, { new: false }, (err) => {
                if (err) return;
            })
            return {
                ack: "0",
                message: "Unable to refresh device"
            }
        }
        else {
            let isExist = await alarmsReportingModel.find({ StreamID: IP });
            if (isExist.length > 0 || (isExist[isExist.length - 1] && !isExist[isExist.length - 1]?.TimeCleared)) {
                let created: any = isExist[isExist.length - 1]?.TimeCreated;
                let cleared = new Date();
                let diff = cleared.getTime() - created.getTime();
                let timeinterval = commonUtil.msToTime(diff);
                let blob = {
                    TimeInterval: timeinterval,
                    TimeCleared: cleared
                }
                await alarmsReportingModel.updateOne({ StreamID: IP, TimeCleared: { $eq: undefined }, AlarmType: { $ne: "Critical(No Device Available)" } }, { $set: blob }, { new: true }, (err) => {
                    if (err) return;
                })

                // sending mail for ellvis start
                let smtp = await SMTPModel.find({})
                let content = ""
                let critical: any = []
                let subject: any = []
                let region: any = await regionModel.findOne({ _id: device?.RegionID })
                let system: any = await systemModel.findOne({ _id: device?.SystemID });
                let regionmails = region.Email.split(",")
                for (let j = 0; j < regionmails.length; j++) {
                    critical.push(regionmails[j])
                    subject.push(`Critical Alarm Cleared for Region ${region?.Region}`)
                }
                let systemCriticalMails = system.Contact.split(",");
                for (let j = 0; j < systemCriticalMails.length; j++) {
                    critical.push(systemCriticalMails[j])
                    subject.push(`Critical Alarm Cleared for System ${system?.System}`)
                }
                let updatedAt = device?.updatedAt;
                let timezone2: any = await customerServicesV1.gettimezone();
                let timezone = timezone2.offset;
                let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                let date = str.substring(0, 16)
                let time = str.substring(16, 25)
                content = `
                    Region : ${region?.Region}<br>
                    System : ${system?.System}<br>
                    <h3 style="color:green;">"Critical Alarm Cleared"</h3>
                    Time : ${time}<br>
                    Date: ${date}<br>
                    Device Name: ${device?.DeviceName}<br>
                    Device IP Address: ${device.IP}<br>
                    Stream ID: ${device?.IP}<br>
                    Alarm Type: Device Start<br>
                    `
                if (smtp.length !== 0) {
                    commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                }// sending mail end

                // this.SendSnmpTrapCriticalCleared(devices[0]);
            }
            await customerDeviceModel.updateOne({ IP: IP }, { $set: { status: { status: "connected" } } }, { new: false }, (err) => {
                if (err) return;
            })
            return {
                ack: "1",
                message: "Successfully refreshed device"
            }

        }
    }

    public SaveEllvisSettings = async (IP: any) => {
        try {
            let req = new ConnectedDevice()
            req.IP = IP
            let liceseInfoModelData = await liceseInfoModel.find({ deviceip: IP })
            if (liceseInfoModelData) {
                await liceseInfoModel.deleteMany({ deviceip: IP })
            }
            let networkSettingsModelData = await networkSettingsModel.find({ deviceip: IP })
            if (networkSettingsModelData) {
                await networkSettingsModel.deleteMany({ deviceip: IP })
            }

            let licenses = await ellvisServicesV1.GetVersionLicensingInfo(req)
            let networkSettings = await ellvisServicesV1.GetNetworkSettings(req)
            let licenseSchema = new liceseInfoModel()
            licenseSchema.licenses = licenses.licenses
            licenseSchema.deviceip = IP
            licenseSchema.demoMode = licenses.demoMode
            licenseSchema.demoModeTimeout = licenses.demoModeTimeout
            licenseSchema.enableDASH = licenses.enableDASH
            licenseSchema.enableTSStats = licenses.enableTSStats
            licenseSchema.enableVideoPreview = licenses.enableVideoPreview
            licenseSchema.enableQam = licenses.enableQam
            licenseSchema.enablePackager = licenses.enablePackager
            licenseSchema.enableRTMP = licenses.enableRTMP
            licenseSchema.enableEllvis9000HP = licenses.enableEllvis9000HP
            licenseSchema.enableSSLCertUpdate = licenses.enableSSLCertUpdate
            licenseSchema.appVersion = licenses.appVersion
            licenseSchema.save()
            let networkSettingsSchema = new networkSettingsModel()
            networkSettingsSchema.eth = networkSettings.eth
            networkSettingsSchema.deviceip = IP
            networkSettingsSchema.managementPort = networkSettings.managementPort;
            networkSettingsSchema.save();
            let blob = {
                $set: {
                    sourceAdapterName: _.keys(networkSettings.eth[0])[0]
                }
            }
            containerStreamStatsModel.updateMany({ sourceAdapter: networkSettings.eth[0][_.keys(networkSettings.eth[0])[0]].address, deviceip: IP }, blob, { new: true }, (err) => {
                if (err) return;
            })
            blob = {
                $set: {
                    sourceAdapterName: _.keys(networkSettings.eth[1])[0]
                }
            }
            containerStreamStatsModel.updateMany({ sourceAdapter: networkSettings.eth[1][_.keys(networkSettings.eth[1])[0]].address, deviceip: IP }, blob, { new: true }, (err) => {
                if (err) return;
            })

            let destBlob = {
                $set: {
                    destAdapterName: _.keys(networkSettings.eth[1])[0]
                }
            }
            containerStreamStatsModel.updateMany({ destAdapter: networkSettings.eth[1][_.keys(networkSettings.eth[1])[0]].address, deviceip: IP }, destBlob, { new: true }, (err) => {
                if (err) return;
            })

            destBlob = {
                $set: {
                    destAdapterName: _.keys(networkSettings.eth[0])[0]
                }
            }
            containerStreamStatsModel.updateMany({ destAdapter: networkSettings.eth[0][_.keys(networkSettings.eth[0])[0]].address, deviceip: IP }, destBlob, { new: true }, (err) => {
                if (err) return;
            })
        } catch (error) {
            return null;
        }
    }

    public SavePropertiesAndStatus = async (ip: any, manual: any) => {

        try {
            if (!ip) {
                return {
                    status: "failure"
                }
            }
            let data: any = null;
            let device: any = await customerDeviceModel.findOne({ IP: ip })
            if (device) {
                if (device.Password)
                    data = device
            }
            if (!data) {
                let stream = await containerStreamStatsModel.findOne({ peerIP: { $regex: ip } })
                if (stream) {
                    if (stream.Password) {
                        data = stream
                    }
                }
            }

            if (data === null && device?.IsPasswordNeeded)
                return;
            if (!device?.IsPasswordNeeded) {
                data = device;
            }

            let encoderReq = new ReqEncoderschemas()
            encoderReq.password = data.Password
            encoderReq.session = data.AuthToken
            encoderReq.IsPasswordNeeded = data.IsPasswordNeeded
            encoderReq.ip = ip;
            encoderReq.DeviceType = data.DeviceType;

            let status = await encoderServicesV1.GetEncoderStatus(encoderReq, manual)
            if (status === null || status.ack === '0' || status.ack === "503") {
                status = {
                    "devicestatus": {
                        "current_enc_preset": "",
                        "encoder1_status": 5,
                        "encoder2_status": 5,
                        "encoder_count": "",
                        "input_framerate": "",
                        "input_resolution": "",
                        "mgmt_mac": "",
                        "opstate": "NA",
                        "status": "NA",
                        "ts_mac": "",
                        "uptime": ""
                    }
                }

                let isExist = await alarmsReportingModel.find({ StreamID: device?.IP });
                if (isExist.length == 0 || (isExist[isExist.length - 1] && isExist[isExist.length - 1]?.TimeCleared)) {
                    let smtp = await SMTPModel.find({})
                    let content = ""
                    let critical: any = []
                    let subject: any = []
                    let region: any = await regionModel.findOne({ _id: device?.RegionID })
                    let system: any = await systemModel.findOne({ _id: device?.SystemID });
                    let regionmails = region.Email.split(",")
                    for (let j = 0; j < regionmails.length; j++) {
                        critical.push(regionmails[j])
                        subject.push(`Critical Alarm Received for Region ${region?.Region}`)
                    }
                    let systemCriticalMails = system.Contact.split(",");
                    for (let j = 0; j < systemCriticalMails.length; j++) {
                        critical.push(systemCriticalMails[j])
                        subject.push(`Critical Alarm Received for System ${system?.System}`)
                    }
                    let updatedAt = device?.updatedAt;
                    let timezone2: any = await customerServicesV1.gettimezone();
                    let timezone = timezone2.offset;
                    let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                    let date = str.substring(0, 16)
                    let time = str.substring(16, 25)
                    content = `
                    Region : ${region?.Region}<br>
                    System : ${system?.System}<br>
                    <h3 style="color:red;">${status.ack !== "503" ? "Critical Alarm Received" : "503- Service Not Available"}</h3>
                    Time : ${time}<br>
                    Date: ${date}<br>
                    Device Name: ${device?.DeviceName}<br>
                    Device IP Address: ${device?.IP}<br>
                    Stream ID: ${device?.IP}<br>
                    Alarm Type: Device Stopped<br>
                    `
                    if (smtp.length !== 0)
                        commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                    let model = new alarmsReportingModel();
                    model.Subject = `Critical Alarm Received for Region ${device?.Region}`;
                    model.RegionID = device?.RegionID;
                    model.Region = device?.Region;
                    model.System = system?.System;
                    model.SystemID = device?.SystemID;
                    model.AlarmType = "Critical";
                    model.TimeCreated = new Date();
                    model.Device = device?.DeviceName;
                    model.StreamID = device?.IP;
                    let mailsSent = {}
                    for (let i = 0; i < critical.length; i++) {
                        mailsSent[critical[i]] = 1;
                    }
                    let mailarray = _.keys(mailsSent)
                    let mails = ""
                    for (let i = 0; i < mailarray.length; i++) {
                        if (i === mailarray.length - 1) {
                            mails += mailarray[i]
                        }
                        else
                            mails += mailarray[i] + ", "
                    }
                    if (smtp.length !== 0) model.MailInformed = mails
                    model.save();


                    // -------------------------------- sending snmp trap to the snmp manager----------------------------------------------------------
                    this.SendSnmpTrapCriticalRecieved(device);
                }



            }
            let encoderSpareIp: any = await encoderModel.findOne({ peerIP: encoderReq.ip })
            if (encoderSpareIp && encoderSpareIp.hotBackup) {
                // first ping device here
                let resp: any = await new Promise((resolve, reject) => {
                    try {
                        let args = ""
                        if (process.platform == "linux") {
                            args = "-c 4";
                        }
                        exec(`ping ${args} ${encoderReq.ip}`, (error, stdout, stderr) => {
                            if (error) return resolve({ ack: "0", })
                            if (stdout) return resolve({ ack: "1" })
                            if (stderr) return resolve({ ack: "0" })
                        })
                    } catch (error) {
                        resolve({})
                    }
                });
                if (resp.ack === "0" && status.devicestatus && status.devicestatus.status === 'NA') {
                    // all hotspre ip work here
                    let jsonDataOfEncoder = {}
                    if (encoderSpareIp && encoderSpareIp.properties) {
                        jsonDataOfEncoder = encoderSpareIp.properties;
                        delete jsonDataOfEncoder['ts_ip'];
                        delete jsonDataOfEncoder['mgmt_ip'];
                    }
                    if (encoderSpareIp && encoderSpareIp.spareIp) {
                        // set all properties on this spare ip
                        let loginEnc: any = false;
                        if (encoderSpareIp.spareIpPassword) {
                            loginEnc = await this.loginSpareIpEncoder(encoderSpareIp.spareIpPassword, encoderSpareIp.spareIp)
                        } else {
                            loginEnc = await this.loginSpareIpEncoder("", encoderSpareIp.spareIp)
                        }
                        if (loginEnc) {
                            await this.updateEncoderPropertiesOnSpareIp(encoderSpareIp.spareIp, jsonDataOfEncoder, data, loginEnc.session.id, device)
                            ip = encoderSpareIp.spareIp;
                            encoderReq.ip = ip;
                        }
                        let isExist = await alarmsReportingModel.find({ StreamID: device?.IP });
                        let created: any = isExist[isExist.length - 1]?.TimeCreated;
                        let cleared = new Date();
                        let diff = cleared.getTime() - created.getTime();
                        let timeinterval = commonUtil.msToTime(diff);
                        let blob = {
                            TimeInterval: timeinterval,
                            TimeCleared: cleared
                        }
                        await alarmsReportingModel.updateOne({ StreamID: device?.IP, TimeCleared: { $eq: undefined } }, { $set: blob }, { new: true }, (err) => {
                            if (err) return;
                        })
                        return {
                            status: "success",
                            message: `Successfully updated device on Spare Device (${ip})`
                        }
                    } else {
                        let spareIps: any = await HotbackupIpListModel.find({ DeviceType: encoderReq.DeviceType, inUse: { $ne: true } })
                        if (spareIps.length > 0 && spareIps[0].SpareIp) {
                            // top first ip for backup
                            let loginEnc: any = false;
                            if (spareIps[0].Password) {
                                loginEnc = await this.loginSpareIpEncoder(spareIps[0].Password, spareIps[0].SpareIp)
                            } else {
                                loginEnc = await this.loginSpareIpEncoder("", spareIps[0].SpareIp)
                            }
                            if (loginEnc) {
                                await this.updateEncoderPropertiesOnSpareIp(spareIps[0].SpareIp, jsonDataOfEncoder, data, loginEnc.session.id, device)
                                ip = spareIps[0].SpareIp;
                                encoderReq.ip = ip;
                            }
                            let isExist = await alarmsReportingModel.find({ StreamID: device?.IP });
                            let created: any = isExist[isExist.length - 1]?.TimeCreated;
                            let cleared = new Date();
                            let diff = cleared.getTime() - created.getTime();
                            let timeinterval = commonUtil.msToTime(diff);
                            let blob = {
                                TimeInterval: timeinterval,
                                TimeCleared: cleared
                            }
                            await alarmsReportingModel.updateOne({ StreamID: device?.IP, TimeCleared: { $eq: undefined }, AlarmType: { $ne: "Critical(No Device Available)" } }, { $set: blob }, { new: true }, (err) => {
                                if (err) return;
                            })
                            return {
                                status: "success",
                                message: `Successfully updated device on Spare Device (${ip})`
                            }
                        }

                    }
                }
            }
            let properties = await encoderServicesV1.GetEncoderProperties(encoderReq);
            if (properties === null || properties.ack === '0') {
                let encoder = {}
                encoder["peerIP"] = encoderReq.ip;
                encoder["status"] = status.devicestatus
                encoderModel.updateMany({ peerIP: encoderReq.ip }, { $set: encoder }, { new: true, upsert: true }, (err) => {
                    if (err) return;
                })
                await containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $unset: { properties: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                await customerDeviceModel.updateMany({ IP: encoderReq.ip }, { $set: { status: status.devicestatus } }, { new: false }, (err) => {
                    if (err) return
                })
                spareFlag = 1;
                return null
            }

            //set device type if not same as the device model
            const setDeviceype = async () => {
                try {
                    if (properties.device.model.includes("RM1121CXF")) {
                        await customerDeviceModel.updateOne({ IP: ip }, { $set: { DeviceType: "RM1121HD/CXF" } })
                    } else if (properties.device.model.includes("RM1121-HD") || properties.device.model.includes("RM1121XD")) {
                        await customerDeviceModel.updateOne({ IP: ip }, { $set: { DeviceType: "RM1121XD" } })
                    } else if (properties.device.model == "VL4510") {
                        await customerDeviceModel.updateOne({ IP: ip }, { $set: { DeviceType: "VL4510" } })
                    } else if (properties.device.model.includes("VL4510C")) {
                        await customerDeviceModel.updateOne({ IP: ip }, { $set: { DeviceType: "VL4510C" } })
                    } else if (properties.device.model.includes("VL4510H")) {
                        await customerDeviceModel.updateOne({ IP: ip }, { $set: { DeviceType: "VL4510H" } })
                    } else if (properties.device.model.includes("VL4522")) {
                        await customerDeviceModel.updateOne({ IP: ip }, { $set: { DeviceType: "VL4522" } })
                    } else if (properties.device.model.includes("VL4522Q")) {
                        await customerDeviceModel.updateOne({ IP: ip }, { $set: { DeviceType: "VL4522Q" } })
                    }
                } catch (error) {
                    return;
                }
            }
            // check device type if note same then add it
            try {
                let deviceModel: any = await customerDeviceModel.findOne({ IP: ip })
                if (deviceModel && properties.device) {
                    if (deviceModel.DeviceType == "RM1121HD/CXF" && !properties.device.model.includes("RM1121CXF")) {
                        setDeviceype();
                    } else if (deviceModel.DeviceType == "RM1121XD" && !properties.device.model.includes("RM1121-HD")) {
                        setDeviceype();
                    } else if (deviceModel.DeviceType == "VL4510C" && !properties.device.model.includes("VL4510C")) {
                        setDeviceype();
                    } else if (deviceModel.DeviceType == "VL4510H" && !properties.device.model.includes("VL4510H")) {
                        setDeviceype();
                    } else if (deviceModel.DeviceType == "VL4522" && !properties.device.model.includes("VL4522")) {
                        setDeviceype();
                    } else if (deviceModel.DeviceType == "VL4522Q" && !properties.device.model.includes("VL4522Q")) {
                        setDeviceype();
                    } else if (deviceModel.DeviceType == "VL4510" && !properties.device.model.includes("VL4510")) {
                        setDeviceype();
                    }
                }
            } catch (error) {
                console.log(error);
            }
            // end 
            let encoder: any = new encoderModel()
            encoder.Password = data.Password
            encoder.AuthToken = data.AuthToken
            encoder.IsPasswordNeeded = data.IsPasswordNeeded;
            encoder.IsCorrect = data.IsCorrect;
            encoder.peerIP = encoderReq.ip;
            encoder.status = status.devicestatus
            encoder.properties = properties.device
            let encoder_ = await encoderModel.findOne({ peerIP: ip.trim() });
            if (encoder_ == null) {
                device ? await deviceReportingModel.updateMany({ DeviceIP: device?.IP }, { DeviceName: device?.DeviceName }) : await deviceReportingModel.updateMany({ DeviceIP: device?.IP }, { DeviceName: encoder.properties['devicename'] });
                await encoder.save()
            } else {
                device ? await deviceReportingModel.updateMany({ DeviceIP: device?.IP }, { DeviceName: device?.DeviceName }) : await deviceReportingModel.updateMany({ DeviceIP: device?.IP }, { DeviceName: encoder.properties['devicename'] });
                let enc_count: any = encoder.properties ? Number.parseInt(encoder.properties["encoder_count"]) : null;
                let isExist = await alarmsReportingModel.find({ StreamID: device?.IP });
                let count = 0;
                for (let i = 1; i < enc_count + 1; i++) {
                    let encNo = encoder.properties ? encoder?.properties[`encoder${i}_status`] : "0";
                    if (Number.parseInt(encNo) != 4) {
                        count = count + 1;
                    }
                }
                if (isExist.length == 0 || (isExist[isExist.length - 1] && isExist[isExist.length - 1]?.TimeCleared)) {
                    for (let i = 1; i < enc_count + 1; i++) {
                        let encNo = encoder.properties ? (encoder?.properties[`encoder${i}_status`]) : "";
                        if (encNo == '4') {
                            let smtp = await SMTPModel.find({})
                            let content = ""
                            let critical: any = []
                            let subject: any = []
                            let region: any = await regionModel.findOne({ _id: device?.RegionID })
                            let system: any = await systemModel.findOne({ _id: device?.SystemID });
                            let regionmails = region.Email.split(",")
                            for (let j = 0; j < regionmails.length; j++) {
                                critical.push(regionmails[j])
                                subject.push(`Critical Alarm Received for Region ${region?.Region}`)
                            }
                            let systemCriticalMails = system.Contact.split(",");
                            for (let j = 0; j < systemCriticalMails.length; j++) {
                                critical.push(systemCriticalMails[j])
                                subject.push(`Critical Alarm Received for System ${system?.System}`)
                            }

                            let updatedAt = device?.updatedAt;
                            let timezone2: any = await customerServicesV1.gettimezone();
                            let timezone = timezone2.offset;
                            let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                            let date = str.substring(0, 16)
                            let time = str.substring(16, 25)
                            content = `
                            Region : ${region?.Region}<br>
                            System : ${system?.System}<br>
                            <h3 style="color:red;">Critical Alarm Received</h3>
                            Time : ${time}<br>
                            Date: ${date}<br>
                            Device Name: ${device?.DeviceName}<br>
                            Device IP Address: ${device?.IP}<br>
                            Stream ID: ${device?.IP}<br>
                            Alarm Type: Encoder Disconnected<br>
                            `
                            if (smtp.length !== 0)
                                commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                            let model = new alarmsReportingModel();
                            model.Subject = `Critical Alarm Received for Region ${device?.Region}`;
                            model.RegionID = device?.RegionID;
                            model.Region = device?.Region;
                            model.System = system?.System;
                            model.SystemID = device?.SystemID;
                            model.AlarmType = "Critical";
                            model.TimeCreated = new Date();
                            model.Device = device?.DeviceName;
                            model.StreamID = device?.IP;
                            let mailsSent = {}
                            for (let i = 0; i < critical.length; i++) {
                                mailsSent[critical[i]] = 1;
                            }
                            let mailarray = _.keys(mailsSent)
                            let mails = ""
                            for (let i = 0; i < mailarray.length; i++) {
                                if (i === mailarray.length - 1) {
                                    mails += mailarray[i]
                                }
                                else
                                    mails += mailarray[i] + ", "
                            }
                            // -------------------------------- sending snmp trap to the snmp manager----------------------------------------------------------
                            this.SendSnmpTrapCriticalRecieved(device);
                            if (smtp.length !== 0) model.MailInformed = mails
                            model.save(); break;

                        }
                    }
                }
                if (count == enc_count && isExist[isExist.length - 1]?.TimeCreated && !isExist[isExist.length - 1]?.TimeCleared && (isExist[isExist.length - 1]?.AlarmType !== "Major(Hot SpareIP < 10%)" && isExist[isExist.length - 1]?.AlarmType !== "Critical(No Device Available)")) {
                    let smtp = await SMTPModel.find({})
                    let content = ""
                    let critical: any = []
                    let subject: any = []
                    let region: any = await regionModel.findOne({ _id: device?.RegionID })
                    let system: any = await systemModel.findOne({ _id: device?.SystemID });
                    let regionmails = region.Email.split(",")
                    for (let j = 0; j < regionmails.length; j++) {
                        critical.push(regionmails[j])
                        subject.push(`Critical Alarm Received for Region ${region?.Region}`)
                    }
                    let systemCriticalMails = system.Contact.split(",");
                    for (let j = 0; j < systemCriticalMails.length; j++) {
                        critical.push(systemCriticalMails[j])
                        subject.push(`Critical Alarm Received for System ${system?.System}`)
                    }
                    let updatedAt = device?.updatedAt;
                    let timezone2: any = await customerServicesV1.gettimezone();
                    let timezone = timezone2.offset;
                    let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                    let date = str.substring(0, 16)
                    let time = str.substring(16, 25)
                    content = `
                            Region : ${region?.Region}<br>
                            System : ${system?.System}<br>
                            <h3 style="color:green;">Critical Alarm Cleared</h3>
                            Time : ${time}<br>
                            Date: ${date}<br>
                            Device Name: ${device?.DeviceName}<br>
                            Device IP Address: ${device?.IP}<br>
                            Stream ID: ${device?.IP}<br>
                            Alarm Type: Encoder Connected<br>
                            `
                    if (smtp.length !== 0)
                        commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)

                    let created: any = isExist[isExist.length - 1]?.TimeCreated;
                    let cleared = new Date();
                    let diff = cleared.getTime() - created.getTime();
                    let timeinterval = commonUtil.msToTime(diff);
                    let blob = {
                        TimeInterval: timeinterval,
                        TimeCleared: cleared
                    }
                    await alarmsReportingModel.updateOne({ StreamID: device?.IP, TimeCleared: { $eq: undefined }, AlarmType: { $ne: "Critical(No Device Available)" } }, { $set: blob }, { new: true }, (err) => {
                        if (err) return;
                    })
                    // -------------------------------- sending snmp trap to the snmp manager----------------------------------------------------------
                    this.SendSnmpTrapCriticalCleared(device);
                    // -------------------------------------------Trap sending ----->end-----------------------------------------
                }
                let blob = {
                    $set: {
                        properties: properties.device,
                        status: status.devicestatus
                    }
                }
                await encoderModel.updateMany({ peerIP: ip.trim() }, blob);
                await customerDeviceModel.updateMany({ IP: ip }, { $set: { status: encoder.status } }, { new: false }, (err) => {
                    if (err) return
                });
                let isPresetEnabled = device ? device?.presetOptimization : '';
                let isSrtEnabled = device ? device?.srtOptimization : '';
                if ((isPresetEnabled || isSrtEnabled) && manual == 'manual') {
                    globalServicesForAutomatedWorkFlow.CheckAutomatedWorkFlow(ip.trim());
                }
            }
            let blob = {
                $set: {
                    properties: encoder.properties
                }
            }
            await containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, blob, {
                new: true
            }, (err) => { if (err) return; })
            await customerDeviceModel.updateMany({ IP: ip }, { $set: { status: encoder.status } }, { new: false }, (err) => {
                if (err) return
            })

            if (device?.DeviceFrom === "stream") {
                var devicetype = commonUtil.GetDeviceTypeByModel(properties["device"]["model"]);
                var devicename = properties["device"]["devicename"];

                // device type from perticular collection based on ip
                let currDevice: any = await customerDeviceModel.findOne({ IP: ip });
                devicetype = currDevice.DeviceType;
                await customerDeviceModel.updateMany({ IP: ip }, { $set: { DeviceType: devicetype, IsPasswordNeeded: false, DeviceName: devicename } }, { new: false }, (err) => {
                    if (err) return;
                })
                await encoderModel.updateMany({ peerIP: ip }, { $set: { IsPasswordNeeded: false } }, { new: false }, (err) => {
                    if (err) return
                });
                let allreports = await deviceReportingModel.find({ DeviceIP: ip });
                if (allreports[allreports.length - 1].DeviceName !== devicename) {
                    let model = new deviceReportingModel();
                    var datetime = new Date();
                    model.DeviceName = devicename;
                    model.DeviceType = "VL4500";
                    model.DeviceIP = ip.trim();
                    model.Region = device?.Region;
                    model.ActionType = `Update(${device.DeviceName} To ${devicename})`;
                    model.TimeCreated = datetime;
                    model.Username = "ellvis stream";
                    await model.save();
                    await deviceReportingModel.updateMany({ DeviceIP: ip }, { DeviceName: devicename });
                }
            }
            device ? await deviceReportingModel.updateMany({ DeviceIP: device?.IP }, { DeviceName: device?.DeviceName }) : await deviceReportingModel.updateMany({ DeviceIP: device?.IP }, { DeviceName: encoder.properties['devicename'] })
            return {
                status: "success",
                message: "Encoder Refreshed Successfully"
            }
        } catch (error) {
            spareFlag = 1;
            return null
        }
    }

    public loginSpareIpEncoder = async (password: any, spareIp: any) => {
        try {
            if (password === "") {
                let res: any = await encoderServicesV1.RequestLoginWithoutPassword(spareIp);
                if (res.status == "success") {
                    return res;
                }
            } else {
                let res: any = await encoderServicesV1.RequestLogin(password, spareIp);
                if (res.status == "success") {
                    return res;
                }

            }
        } catch (error) {
            return null;
        }
    }

    public updateEncoderPropertiesOnSpareIp = async (ip: any, properties, data, spareSession, device) => {
        let req: any = {
            body: {
                ip: ip,
                data: properties
            }
        }
        let res, next;
        if (data.Password) {
            let response = await encoderServicesV1.SetLoginPropertiesForSpareIp("", data.Password, ip, spareSession);
        }

        const requestResult: any = encoderControllerV1.SaveSession(req, res, next);
        // update encoder model and device model with latest properties

        await encoderModel.updateOne({ peerIP: data.IP.trim() }, { $set: { peerIP: ip, properties: properties, IsPasswordNeeded: false, hotBackup: false, spareIp: '', spareIpPassword: '', spareIpAuthToken: '' } });
        await customerDeviceModel.updateOne({ IP: data.IP.trim() }, { $set: { IP: ip, properties: properties, IsPasswordNeeded: false, AuthToken: spareSession } });

        // await encoderModel.updateOne({ peerIP: ip }, { $set: { hotBackup: false, spareIp: '', spareIpPassword: '', spareIpAuthToken: '' } });
        await HotbackupIpListModel.deleteOne({ SpareIp: ip });

        let deviceModel = new deviceReportingModel();
        var datetime = new Date();
        deviceModel.DeviceName = data.DeviceName;
        deviceModel.DeviceType = data.DeviceType;
        deviceModel.DeviceIP = data.IP.trim();
        deviceModel.Region = data.Region;
        deviceModel.ActionType = `Replaced(${data.IP} To ${ip})`;
        deviceModel.TimeCreated = datetime;
        deviceModel.Username = 'cron update';
        await deviceModel.save();



        let deviceModel1 = new deviceReportingModel();
        var datetime = new Date();
        deviceModel1.DeviceName = data.DeviceName;
        deviceModel1.DeviceType = data.DeviceType;
        deviceModel1.DeviceIP = ip.trim();
        deviceModel1.Region = data.Region;
        deviceModel1.ActionType = `Replaced(${ip} To ${data.IP.trim()})`;
        deviceModel1.TimeCreated = datetime;
        deviceModel1.Username = 'cron update';
        await deviceModel1.save();

        // sen mail here for uploading encode properties to spareIP

        let smtp = await SMTPModel.find({})
        let updatedAt = data?.updatedAt;
        let timezone2: any = await customerServicesV1.gettimezone();
        let timezone = timezone2.offset;
        let str = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
        let date = str.substring(0, 16)
        let time = str.substring(16, 25)
        let subject: any = []

        let critical: any = []
        let region: any = await regionModel.findOne({ _id: device?.RegionID })
        let system: any = await systemModel.findOne({ _id: device?.SystemID });
        let regionmails = region.Email.split(",")
        for (let j = 0; j < regionmails.length; j++) {
            critical.push(regionmails[j]);
            subject.push(`Hot Backup: ${data?.IP} is Replaced by ${ip}`);
        }
        let systemCriticalMails = system.Contact.split(",");
        let systemMajorMails = system.Email.split(",");
        for (let j = 0; j < systemCriticalMails.length; j++) {
            critical.push(systemCriticalMails[j]);
            subject.push(`Hot Backup: ${data?.IP} is Replaced by ${ip}`);
        }
        for (let j = 0; j < systemMajorMails.length; j++) {
            critical.push(systemMajorMails[j]);
            subject.push(`Hot Backup: ${data?.IP} is Replaced by ${ip}`);
        }
        let content = `
                    Region : ${region?.Region}<br>
                    System : ${system?.System}<br>
                    <h3 style="color:green;">Device ${data?.IP} has been replicated with the spare device ${ip}</h3>
                    Time : ${time}<br>
                    Date: ${date}<br>
                    Device Name: ${data?.DeviceName}<br>
                    Device IP Address: ${data?.IP}<br>
                    Alarm Type: updated ${data?.IP} to ${ip} <br>
                    `
        if (smtp.length !== 0) {
            commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
        }

        let model = new alarmsReportingModel();
        model.Subject = `Critical Alarm Received for hotbackup ${data.IP} To ${ip}`;
        model.RegionID = device?.RegionID;
        model.Region = data.Region;
        model.System = system?.System;
        model.SystemID = device?.SystemID;
        model.AlarmType = "Convert";
        model.TimeCreated = new Date();
        model.Device = data.DeviceName;
        model.StreamID = data.IP.trim();
        let mailsSent = {};
        for (let i = 0; i < critical.length; i++) {
            mailsSent[critical[i]] = 1;
        }
        let mailarray = _.keys(mailsSent)
        let mails = ""
        for (let i = 0; i < mailarray.length; i++) {
            if (i === mailarray.length - 1) {
                mails += mailarray[i]
            }
            else
                mails += mailarray[i] + ", "
        }
        if (smtp.length !== 0) model.MailInformed = mails
        model.save();
        await encoderServicesV1.StartEncoderEncoding(ip, '');

    }

    public savePropertiesAndStatusInContainerStats = async (ip: any, id: any, password: any, authtoken: any, ispassreq: any, regionid: any, systemid: any, devicedIP: any) => {
        // free array
        ipArray.length = 0;
        flag = 1;
        reportIpArray.length = 0;
        reportFlag = 1;
        try {
            let encoderReq: any = new ReqEncoderschemas()
            let devicereportmodel = new DeviceReporting();
            encoderReq.ip = ip.trim()
            let devicemodel = {
            }
            let data = await encoderServicesV1.SessionGetterForDeviceEncoderAddFromDiscoveredStream(encoderReq);
            var count: any;
            var licenseCount: any;
            if (secretUtil.CHECK_KEYLOK) {
                count = await ellvisServicesV1.getLicenses("check-license");
                if (count != undefined) {
                    if (count['output'] == '') licenseCount = 0;
                    else licenseCount = count['output'];

                }
            }
            if (data.addAsLegacy == true) {
                let region: any = await regionModel.findOne({ _id: regionid })
                devicemodel["IP"] = ip.trim();
                devicemodel["DeviceName"] = "LEGACY";
                devicemodel["DeviceType"] = "LEGACY";
                devicemodel["Region"] = region["Region"];
                devicemodel["RegionID"] = regionid;
                devicemodel["SystemID"] = systemid;
                devicemodel["ManagementIP"] = "";
                // add device in devices table from stream
                let isExistDevice: any = await customerDeviceModel.findOne({ IP: devicedIP });
                if (isExistDevice) {
                    await this.SaveDevicesFromStreamDevices(devicemodel);
                }
                return null;
            }
            else if (data.checkForEllvis) {
                let newData = await ellvisServicesV1.checkRemoteDeviceAdd(encoderReq);
                if (newData.addAsLegacy) {
                    let region: any = await regionModel.findOne({ _id: regionid })
                    devicemodel["IP"] = ip.trim();
                    devicemodel["DeviceName"] = "LEGACY";
                    devicemodel["DeviceType"] = "LEGACY";
                    devicemodel["Region"] = region["Region"];
                    devicemodel["RegionID"] = regionid;
                    devicemodel["SystemID"] = systemid;
                    devicemodel["ManagementIP"] = "";
                    // add device in devices table from stream
                    let isExistDevice: any = await customerDeviceModel.findOne({ IP: devicedIP });
                    if (isExistDevice) {
                        await this.SaveDevicesFromStreamDevices(devicemodel);
                    }
                    return null;
                }
                else if (newData.addAsEllvis) {
                    let region: any = await regionModel.findOne({ _id: regionid })
                    let deviceCheck = await customerDeviceModel.findOne({ IP: encoderReq.ip })
                    if (deviceCheck !== null && deviceCheck !== undefined) {
                        encoderReq.password = deviceCheck.Password;
                        encoderReq.session = deviceCheck.AuthToken
                    }
                    if (deviceCheck === null) {
                        let model = new customerDeviceModel();
                        model.IP = ip.trim();
                        model.DeviceName = "REMOTE ELLVIS";
                        model.DeviceType = EllvisModel;
                        model.Region = region["Region"];
                        model.RegionID = regionid;
                        model.SystemID = systemid;
                        model.ManagementIP = "";
                        model.Password = "";
                        model.IsCorrect = false;
                        model.IsPasswordNeeded = true;
                        model.DeviceFrom = "stream";
                        // check condition
                        let totalDevices = await customerDeviceModel.find({ Region: { $ne: "OnBoardingRegion" } });
                        let totalDeviceCount = totalDevices.length;
                        if (secretUtil.CHECK_KEYLOK) {
                            if (totalDeviceCount < licenseCount) {
                                let isExistDevice = await customerDeviceModel.findOne({ IP: ip.trim() });
                                if (!isExistDevice) {
                                    await model.save();
                                }
                            }
                        } else {
                            let isExistDevice = await customerDeviceModel.findOne({ IP: ip.trim() });
                            if (!isExistDevice) {
                                await model.save();
                            }
                        }
                    } else {
                        devicemodel["IP"] = ip.trim();
                        //devicemodel["DeviceName"] = deviceCheck.DeviceName;
                        devicemodel["DeviceType"] = EllvisModel;
                        devicemodel["Region"] = region["Region"];
                        devicemodel["RegionID"] = regionid;
                        devicemodel["SystemID"] = systemid;
                        devicemodel["ManagementIP"] = "";
                        devicemodel["Password"] = deviceCheck.Password;
                        devicemodel["IsCorrect"] = deviceCheck.IsCorrect;
                        devicemodel["IsPasswordNeeded"] = deviceCheck.IsPasswordNeeded;
                        //devicemodel["DeviceFrom"] = "stream";
                        await customerDeviceModel.updateMany({ _id: deviceCheck._id }, { $set: devicemodel }, { new: false }, (err) => {
                            if (err) return;
                        });
                    }
                }
                return;
            }
            else {
                var devicename = "STREAM ENCODER"
                var devicetype = "VL4500"
                let region: any = await regionModel.findOne({ _id: regionid })
                let deviceCheck = await customerDeviceModel.findOne({ IP: encoderReq.ip })
                if (deviceCheck !== null && deviceCheck !== undefined) {
                    encoderReq.password = deviceCheck.Password;
                    encoderReq.session = deviceCheck.AuthToken
                }

                let encoder = await encoderModel.findOne({ peerIP: ip.trim() });
                if (encoder) {
                    if (encoder.properties) {
                        let x: string | undefined = encoder.properties["devicename"];
                        let y: string | undefined = encoder.properties["model"];
                        if (x === undefined || x === null) {
                            devicename = "STREAM ENCODER"
                        }
                        else {
                            devicename = x;
                        }
                        if (y === undefined || y === null) {
                            devicetype = "VL4500"
                        }
                        else {
                            let currDevice: any = await customerDeviceModel.findOne({ IP: ip.trim() });
                            if (currDevice) {
                                devicetype = currDevice.DeviceType;
                            } else {
                                devicetype = y;
                            }
                            // devicetype = commonUtil.GetDeviceTypeByModel(y);
                        }
                    }
                    else {
                        devicename = "STREAM ENCODER"
                        devicetype = "VL4500"
                    }
                }

                if (deviceCheck === null) {
                    let model = new customerDeviceModel();
                    model.IP = ip.trim();
                    model.DeviceName = devicename;
                    model.DeviceType = devicetype;
                    model.Region = region["Region"];
                    model.RegionID = regionid;
                    model.SystemID = systemid;
                    model.ManagementIP = "";
                    model.Password = "";
                    model.IsCorrect = false;
                    model.IsPasswordNeeded = true;
                    model.DeviceFrom = "stream"
                    // check conditioon
                    let totalDevices = await customerDeviceModel.find({ Region: { $ne: "OnBoardingRegion" } });
                    let totalDeviceCount = totalDevices.length;
                    if (secretUtil.CHECK_KEYLOK) {
                        if (totalDeviceCount < licenseCount) {
                            let isExistDevice = await customerDeviceModel.findOne({ IP: ip.trim() });
                            if (!isExistDevice) {
                                await model.save(); this.createReportForFirstTimeForStreamDevices(model);
                            }
                        }
                    } else {
                        let isExistDevice = await customerDeviceModel.findOne({ IP: ip.trim() });
                        if (!isExistDevice) {
                            await model.save(); this.createReportForFirstTimeForStreamDevices(model);
                        }
                    }
                } else {
                    if (deviceCheck.DeviceFrom === "stream") {
                        devicemodel["DeviceType"] = devicetype;
                    }
                    devicemodel["IP"] = ip.trim();
                    devicemodel["Region"] = region["Region"];
                    devicemodel["RegionID"] = regionid;
                    devicemodel["SystemID"] = systemid;
                    devicemodel["ManagementIP"] = "";
                    devicemodel["Password"] = deviceCheck.Password;
                    devicemodel["IsCorrect"] = deviceCheck.IsCorrect;
                    devicemodel["IsPasswordNeeded"] = deviceCheck.IsPasswordNeeded;
                    await customerDeviceModel.updateOne({ _id: deviceCheck._id }, { $set: devicemodel }, { new: false }, (err) => {
                        if (err) return;
                    });
                }
            }
            encoderReq.password = password
            if (password == undefined) {
                encoderReq.password = "";
            }
            encoderReq.session = authtoken
            encoderReq.IsPasswordNeeded = ispassreq
            let status = await encoderServicesV1.GetEncoderStatus(encoderReq, '')
            if (status === null || status.ack === '0') {
                status = {
                    "devicestatus": {
                        "current_enc_preset": "",
                        "encoder1_status": 5,
                        "encoder2_status": 5,
                        "encoder_count": "",
                        "input_framerate": "",
                        "input_resolution": "",
                        "mgmt_mac": "",
                        "opstate": "NA",
                        "status": "NA",
                        "ts_mac": "",
                        "uptime": ""
                    }
                }

            }

            let properties = await encoderServicesV1.GetEncoderProperties(encoderReq)
            if (properties === null || properties.ack === '0') {
                let encoder = {}
                encoder["peerIP"] = encoderReq.ip;
                encoder["status"] = status.devicestatus
                encoder["Password"] = password;
                encoder["IsPasswordNeeded"] = true;
                encoder["IsCorrect"] = false;
                encoderModel.updateOne({ peerIP: encoderReq.ip }, { $set: encoder }, { new: true, upsert: true }, (err) => {
                    if (err) return
                    //Updated Encoder with NA
                })
                containerStreamStatsModel.updateMany({ peerIP: { $regex: ip.trim() } }, { $unset: { properties: 1 } }, { new: true }, (err) => {
                    if (err) return;
                    //Updated Container Stream Stats
                })
                customerDeviceModel.updateOne({ IP: encoderReq.ip }, { $set: { status: status.devicestatus } }, { new: false }, (err) => {
                    if (err) return;
                })
                return null
            }
            let encoder = new encoderModel()
            encoder.peerIP = encoderReq.ip;
            encoder.status = status.devicestatus
            encoder.properties = properties.device
            encoder.Password = password;
            encoder.AuthToken = authtoken;
            encoder.IsCorrect = true;
            encoder.IsPasswordNeeded = false;
            let encoder2 = await encoderModel.findOne({ peerIP: ip.trim() });
            if (encoder2 == null) {
                await encoder.save()
            } else {
                let blob = {
                    $set: {
                        properties: properties.device
                    }
                }
                await encoderModel.findOneAndUpdate({ peerIP: ip.trim() }, blob);
            }
            let blob = {
                $set: {
                    properties: encoder.properties
                }
            }

            containerStreamStatsModel.updateOne({ _id: id }, blob, {
                new: true
            }, (err) => {
                if (err) return;
            })
            customerDeviceModel.updateOne({ IP: ip.trim() }, { $set: { status: status.devicestatus } }, { new: false }, (err) => {
                if (err) return;
            })
            try {
                devicemodel["DeviceName"] = properties["device"]["devicename"];
                let currDevice: any = await customerDeviceModel.findOne({ IP: ip.trim() });
                if (currDevice) {
                    devicetype = currDevice.DeviceType;
                } else {
                    devicetype = properties["device"]["model"];
                }
                // devicemodel["DeviceType"] = commonUtil.GetDeviceTypeByModel(properties["device"]["model"]);
            } catch (e) {
                devicemodel["DeviceName"] = "STREAM ENCODER";
                devicemodel["DeviceType"] = "VL4500";
            }
            devicereportmodel.DeviceName = "STREAM ENCODER";
            devicereportmodel.DeviceType = "VL4500";
            devicereportmodel.DeviceIP = ip.trim();
            devicereportmodel.Region = regionid;

            //save device in device report from stream
            // await this.SaveDeviceReportFromStreamDevices(devicereportmodel);
        } catch (error) {
            return null;
        }
    }

    public SaveStatusInDevices = async (req: CustomerDevice) => {
        try {
            let newreq: any = new ReqEncoderschemas();
            newreq.ip = req.IP;
            newreq.password = "";
            newreq.session = "";
            let status = await encoderServicesV1.GetEncoderStatus(newreq, '');
            if (status) {
                if (status.status === "success") {
                    let blob = {
                        $set: { status: status.devicestatus },
                    };
                    customerDeviceModel.updateOne(
                        { IP: req.IP },
                        blob,
                        { new: false },
                        (err) => {
                            if (err) return;
                            // else console.log("Successfully added status");
                        }
                    );
                }
            }
        } catch (error) {
            return null;
        }
    }

    public createReportForFirstTimeForStreamDevices = async (req: any) => {
        let model = new deviceReportingModel();
        var datetime = new Date();
        model.DeviceName = req?.DeviceName;
        model.DeviceType = req?.DeviceType;
        model.DeviceIP = req?.IP;
        model.Region = req?.Region;
        model.ActionType = "Added";
        model.TimeCreated = datetime;
        model.Username = "ellvis stream";
        await model.save();
    }

    public SaveDevicesFromStreamDevices =
        async (req: any) => {
            // check array if ip i savailbel or not
            //check device Ip isExist in array 
            let isExist = ipArray.includes(req?.IP.trim());
            if (!isExist) {
                //if not then push it
                ipArray.push(req?.IP.trim())
                flag = 1;
            } else { flag = 0; }
            if (flag == 1) {
                try {
                    var customerDevices: any = await customerDeviceModel.find({ IP: req?.IP.trim() });
                    var deviceslegacy: any = await customerDeviceModel.find({ LegacyIP: req?.IP.trim() });
                    var count: any;
                    var licenseCount: any;
                    if (secretUtil.CHECK_KEYLOK) {
                        count = await ellvisServicesV1.getLicenses("check-license");
                        if (count != undefined) {
                            if (count['output'] == '') licenseCount = 0;
                            else licenseCount = count['output'];
                        }
                    }

                    var msg = "";
                    let ack = "0";
                    if (customerDevices.length === 0 && deviceslegacy.length === 0) {
                        var model = new customerDeviceModel();
                        model.IP = req?.IP;
                        model.DeviceName = req?.DeviceName;
                        model.DeviceType = req?.DeviceType;
                        model.ManagementIP = req?.ManagementIP;
                        model.RegionID = req?.RegionID;
                        model.Region = req?.Region;
                        model.SystemID = req?.SystemID;
                        model.Password = req?.Password;
                        model.DeviceFrom = "stream";

                        let isVerified = true;
                        if (
                            model.DeviceType === EllvisModel &&
                            model.Password &&
                            model.Password !== ""
                        ) {
                            let response = await ellvisServicesV1.VerifyPassword(
                                model.IP,
                                model.Password
                            );
                            if (response) {
                                if (response.accessToken) {
                                    isVerified = true;
                                    model.AuthToken = response.accessToken;
                                    model.IsCorrect = true;
                                    model.IsPasswordNeeded = false;
                                    req.AuthToken = response.accessToken;
                                    req.IsCorrect = true;
                                    ack = "1";
                                } else {
                                    isVerified = false;
                                }
                            } else {
                                isVerified = false;
                            }
                        } else if (
                            model.DeviceType !== "LEGACY" &&
                            model.Password &&
                            model.Password !== ""
                        ) {
                            let response: any = await encoderServicesV1.RequestLogin(
                                model.Password,
                                model.IP
                            );
                            if (response) {
                                if (response.status === "success") {
                                    if (response.session.id === "---") {
                                        isVerified = true;
                                        model.IsCorrect = true;
                                        model.IsPasswordNeeded = false;
                                        req.IsCorrect = true;
                                        ack = "1";
                                    } else {
                                        isVerified = true;
                                        model.IsCorrect = true;
                                        model.IsPasswordNeeded = false;
                                        model.AuthToken = response.session.id;
                                        req.IsCorrect = true;
                                        req.AuthToken = response.session.id;
                                        ack = "1";
                                    }
                                } else {
                                    isVerified = false;
                                }
                            } else {
                                isVerified = false;
                            }
                        }
                        if (req.DeviceType === "LEGACY") {
                            ack = "1";
                        }
                        if (isVerified && req.DeviceType !== "LEGACY") {
                            // check condition
                            let totalDevices = await customerDeviceModel.find({ Region: { $ne: "OnBoardingRegion" } });
                            let totalDeviceCount = totalDevices.length;
                            if (secretUtil.CHECK_KEYLOK) {
                                if (totalDeviceCount < licenseCount) {
                                    let isExistDevice = await customerDeviceModel.findOne({ IP: req?.IP.trim() });
                                    if (!isExistDevice) {
                                        await model.save(); this.createReportForFirstTimeForStreamDevices(req);
                                    }
                                }
                            }
                            else {
                                let isExistDevice = await customerDeviceModel.findOne({ IP: req?.IP.trim() });
                                if (!isExistDevice) {
                                    await model.save(); this.createReportForFirstTimeForStreamDevices(req);
                                }
                                ;
                            }
                            await containerStreamStatsModel.updateMany(
                                { peerIP: { $regex: model.IP } },
                                {
                                    Password: req.Password,
                                    IsCorrect: true,
                                    IsPasswordNeeded: true,
                                    AuthToken: req.AuthToken,
                                },
                                { new: true },
                                (err) => {
                                    if (err) return;
                                }
                            );
                            ack = "1";
                            msg = "Added Successfully";
                        }
                        else if (isVerified && req.DeviceType === "LEGACY") {
                            // check condition
                            flag = 0;
                            let totalDevices = await customerDeviceModel.find({ Region: { $ne: "OnBoardingRegion" } });
                            let totalDeviceCount = totalDevices.length;
                            if (secretUtil.CHECK_KEYLOK) {
                                if (totalDeviceCount < licenseCount) {
                                    await model.save(); this.createReportForFirstTimeForStreamDevices(req);
                                }
                            }
                            else { await model.save(); this.createReportForFirstTimeForStreamDevices(req); }
                            await containerStreamStatsModel.updateMany(
                                { peerIP: { $regex: model.IP } },
                                {
                                    Password: "",
                                    IsCorrect: true,
                                    IsPasswordNeeded: false,
                                    AuthToken: "",
                                    IsEncoderNeeded: false,
                                    properties: { model: "LEGACY", devicename: "LEGACY" }
                                },
                                { new: true },
                                (err) => {
                                    if (err) return;
                                }
                            );
                            ack = "1";
                            msg = "Added Successfully";
                        }
                        else {
                            msg = "Password is incorrect";
                        }

                        if (
                            model.DeviceType !== EllvisModel &&
                            model.DeviceType !== "LEGACY"
                        ) {
                            await this.SaveStatusInDevices(req);
                            await globalServicesV1.SavePropertiesAndStatus(req.IP, '');
                        } else if (model.DeviceType == "LEGACY") {
                            await globalServicesV1.RefreshLegacy(req.IP);
                        } else {
                            globalServicesV1.SaveContainersAndStatsByDeviceIP(
                                req.IP, ''
                            );
                        }
                    } else {
                        this.UpdateDeviceFromStreams(req);
                    }
                    return {
                        ack: ack,
                        message: msg,
                    };
                } catch (error) {
                    return {
                        ack: "0",
                        message: "Something went wrong",
                    };
                }
            }
        }

    public UpdateDeviceFromStreams = async (req: CustomerDevice) => {
        try {
            return new Promise(async (resolve, reject) => {
                var msg = "";
                let ack = "0";
                let isVerified = true;
                var blog = {
                    // <-- Here
                    IP: req?.IP,
                    DeviceName: req?.DeviceName,
                    DeviceType: req?.DeviceType,
                    // ManagementIP: req?.ManagementIP,
                    Region: req?.Region,
                    RegionID: req?.RegionID,
                    SystemID: req?.SystemID,
                    Password: req?.Password,
                };

                if (
                    req.DeviceType === EllvisModel &&
                    req.Password &&
                    req.Password !== ""
                ) {
                    let response = await ellvisServicesV1.VerifyPassword(
                        req.IP,
                        req.Password
                    );
                    if (response) {
                        if (response.accessToken) {
                            isVerified = true;
                            req.AuthToken = response.accessToken;
                            req.IsCorrect = true;
                            req.IsPasswordNeeded = false;
                            req.AuthToken = response.accessToken;
                            req.IsCorrect = true;
                            ack = "1";
                        } else {
                            isVerified = false;
                        }
                    } else {
                        isVerified = false;
                    }
                } else if (
                    req.DeviceType !== "LEGACY" &&
                    req.Password &&
                    req.Password !== ""
                ) {
                    let response: any = await encoderServicesV1.RequestLogin(
                        req.Password,
                        req.IP
                    );
                    if (response) {
                        if (response.status === "success") {
                            if (response.session.id === "---") {
                                isVerified = true;
                                req.IsCorrect = true;
                                req.IsPasswordNeeded = false;
                                req.IsCorrect = true;
                                ack = "1";
                            } else {
                                isVerified = true;
                                req.IsCorrect = true;
                                req.IsPasswordNeeded = false;
                                req.AuthToken = response.session.id;
                                req.IsCorrect = true;
                                req.AuthToken = response.session.id;
                                ack = "1";
                            }
                        } else {
                            isVerified = false;
                        }
                    } else {
                        isVerified = false;
                    }
                }
                if (req.DeviceType === "LEGACY") {
                    isVerified = true;
                }
                if (isVerified && req.DeviceType !== "LEGACY") {
                    customerDeviceModel.updateOne(
                        { IP: req?.IP },
                        blog,
                        {
                            new: false,
                        },
                        (err) => {
                            if (err) return resolve("Error in Updation.");
                            return resolve({ ack: "1", message: "Updated Successfully" });
                        }
                    );
                    ack = "1";
                }
                else if (isVerified && req.DeviceType === "LEGACY") {
                    customerDeviceModel.updateOne(
                        { IP: req?.IP },
                        blog,
                        {
                            new: false,
                        },
                        (err) => {
                            if (err) return resolve("Error in Updation.");
                            return resolve({ ack: "1", message: "Updated Successfully" });
                        }
                    );

                    containerStreamStatsModel.updateMany(
                        { peerIP: { $regex: req.IP } },
                        {
                            IsCorrect: true,
                            IsPasswordNeeded: false,
                            IsEncoderNeeded: false,
                            properties: { model: "LEGACY", devicename: "LEGACY" }
                        },
                        { new: true },
                        (err) => {
                            if (err) return;
                        }
                    );
                    ack = "1";
                    msg = "Added Successfully";
                }
                else {
                    return resolve({ ack: ack, message: "Password is incorrect" });
                }
                if (req.DeviceType !== EllvisModel && req.DeviceType !== "LEGACY") {
                    this.SaveStatusInDevices(req);
                    globalServicesV1.SavePropertiesAndStatus(req.IP?.split(":")[0], '');
                } else if (req.DeviceType == "LEGACY") {
                    globalServicesV1.RefreshLegacy(req.IP);
                } else {
                    globalServicesV1.SaveContainersAndStatsByDeviceIP(
                        req.IP?.split(":")[0], ''
                    );
                }
            });
        } catch (error) {
            return null;
        }
    }

    public SaveDeviceReportFromStreamDevices = async (req: any) => {
        let isExist = reportIpArray.includes(req?.DeviceIP);
        if (!isExist) {
            //if not then push it
            reportIpArray.push(req?.DeviceIP)
            reportFlag = 1;
        }
        else {
            reportFlag = 0;
        }
        if (reportFlag == 1) {
            let reports: any = await deviceReportingModel.find({ DeviceIP: req?.DeviceIP });
            let lataestAdded = reports[reports.length - 1];
            let region: any = await regionModel.findOne({ _id: req?.Region })
            if (reports.length == 0 || (lataestAdded["ActionType"] == "Delete")) {
                let model = new deviceReportingModel();
                var datetime = new Date();
                model.DeviceName = req?.DeviceName;
                model.DeviceType = req?.DeviceType;
                model.DeviceIP = req?.DeviceIP;
                model.Region = region?.Region;
                model.ActionType = "Added";
                model.TimeCreated = datetime;
                model.Username = "ellvis stream";
                await model.save();
                reportFlag = 0;
            }
        }
    }

    public GetCron = async () => {
        try {
            let requestResult = await cronModel.find({})
            if (requestResult) {
                if (requestResult.length > 0) {
                    return {
                        ack: "1",
                        Cron: requestResult[0]
                    }
                } else {
                    return {
                        ack: "0",
                        message: "Unable to find data"
                    }
                }
            }
            else {
                return {
                    ack: "0",
                    message: "Unable to find data"
                }
            }
        } catch (error) {
            return {
                ack: "0",
                message: "Unable to find data"
            }
        }
    }
    public SaveCron = async (req: any) => {
        try {
            let model = new cronModel();
            model.CronTime = req.CronTime;
            model.SaveHistory = req.SaveHistory;
            if (req._id) {
                let blob = {
                    $set: { CronTime: req.CronTime, SendMail: req.SendMail, SaveHistory: req.SaveHistory }
                }
                await cronModel.updateOne({ _id: req._id }, blob, { new: true }, (err) => {
                    if (err) return;
                    //Updated cron model
                })
                blob["_id"] = req._id;
                app.StartCron(req)
                commonUtil.updateUserReport(req, '');
                return {
                    ack: "1",
                    Cron: blob
                }
            }
            else {
                let resp = await model.save();
                app.StartCron(req)
                commonUtil.updateUserReport(req, '');
                return {
                    ack: "1",
                    Cron: resp
                }
            }
        } catch (error) {
            return {
                ack: "0",
                message: "Something went wrong"
            }
        }
    }

    public getSnmpDetails = async () => {
        try {
            let requestResult: any = await snmpModel.find({})
            if (requestResult.length > 0) {
                return {
                    ack: "1",
                    Snmp: requestResult[0]
                }
            }
            else {
                return {
                    ack: "0",
                    message: "Unable to find data"
                }
            }
        } catch (error) {
            return {
                ack: "0",
                message: "Unable to find data"
            }
        }
    }

    public saveSnmpDetails = async (req: any) => {
        try {
            let checkIsExistSNMPData = await snmpModel.find({});
            let blob = {
                SnmpManager: req.SnmpManager,
                CommunityName: req.CommunityName ? req.CommunityName : '',
                SnmpVersion: req.SnmpVersion,
                SnmpV3User: req.SnmpV3User ? req.SnmpV3User : '',
                SnmpV3UserPassword: req.SnmpV3UserPassword ? req.SnmpV3UserPassword : '',
                SnmpPort: req.SnmpPort ? req.SnmpPort : '',
            }
            if (checkIsExistSNMPData.length) {
                await snmpModel.updateOne({ _id: checkIsExistSNMPData[0]._id }, { $set: blob });
                if (req.SendTrap) await this.SendSnmpTrapCriticalRecieved('');
                return {
                    ack: "1",
                    Snmp: blob
                }
            }
            else {
                let model = new snmpModel();
                model.SnmpManager = req.SnmpManager;
                model.CommunityName = req.CommunityName;
                model.SnmpVersion = req.SnmpVersion;
                model.SnmpV3User = req.SnmpV3User;
                model.SnmpV3UserPassword = req.SnmpV3UserPassword;
                model.SnmpPort = req.SnmpPort;
                let resp = await model.save();
                if (req.SendTrap) await this.SendSnmpTrapCriticalRecieved('');
                return {
                    ack: "1",
                    Snmp: resp
                }
            }
        } catch (error) {
            return {
                ack: "0",
                message: "Unable to find data"
            }
        }
    }

    public GetAllContainers = async (req: Container) => {
        try {
            let filter = {
                deviceip: req.ip
            }

            let containers: ContainersStreamStats[] = await containerStreamStatsModel.find(filter)
            return containers;
        } catch (error) {
            return null;
        }
    }

    public SaveHistory = async (req: ContainersStreamStats) => {
        try {
            let blob = {
                $set: { isSavedHistory: req?.isSavedHistory }
            }
            containerStreamStatsModel.updateOne({ _id: req?._id }, blob, { new: true }, (err) => {
                if (err) return;
            })
            return {
                ack: "1"
            }
        } catch (error) {
            return { ack: "0" };
        }
    }

    public GetDeviceBySystem = async (req: ReqEllvisschemas) => {
        try {
            let containers: ContainersStreamStats[] = await containerStreamStatsModel.find({ CustomerID: req.customerid, RegionID: req.RegionID, SystemID: req.SystemID })
            if (containers) {
                containers.sort((a: any, b: any) => {
                    return a.deviceip.localeCompare(b.deviceip)
                })
            }
            let response = new Array()

            for (let i = 0; i < containers.length;) {
                let ip = containers[i].deviceip
                let data = {
                    deviceip: ip,
                    ConnectedDevice: new Array(),
                    DeviceName: containers[i].DeviceName
                }
                let j
                for (j = i; j < containers.length; j++) {
                    if (containers[j].deviceip === ip) {
                        data.ConnectedDevice.push(containers[j])
                    }
                    else
                        break
                }
                response.push(data)
                i = j
            }

            return response
        } catch (error) {
            return null;
        }
    }

    public GetNetworkSettings = async (req: ConnectedDevice) => {
        try {
            const networkSettings = await networkSettingsModel.findOne({ deviceip: req.IP })
            return networkSettings
        } catch (error) {
            return null;
        }
    }

    public GetVersionLicensingInfo = async (req: ConnectedDevice) => {
        try {
            const licenses = await liceseInfoModel.findOne({ deviceip: req.IP })
            return licenses
        } catch (error) {
            return null;
        }
    }

    public GetEncoderProperties = async (req: ReqEncoderschemas) => {
        try {
            const encoderProperties = await encoderModel.findOne({ peerIP: req.ip })
            return encoderProperties
        } catch (error) {
            return null;
        }
    }

    public GetDevicesByCustomerID = async (req: ReqEllvisschemas) => {
        try {
            let containers: ContainersStreamStats[] = await containerStreamStatsModel.find({ CustomerID: req.customerid })
            if (containers) {
                containers.sort((a: any, b: any) => {
                    return a.deviceip.localeCompare(b.deviceip)
                })
            }
            let response = new Array()

            for (let i = 0; i < containers.length;) {
                let ip = containers[i].deviceip
                let data = {
                    deviceip: ip,
                    ConnectedDevice: new Array(),
                    DeviceName: containers[i].DeviceName,
                    RegionID: containers[i].RegionID,
                    SystemID: containers[i].SystemID
                }
                let j
                for (j = i; j < containers.length; j++) {
                    if (containers[j].deviceip === ip) {
                        data.ConnectedDevice.push(containers[j])
                    }
                    else
                        break
                }
                response.push(data)
                i = j
            }

            return response
        } catch (error) {
            return null;
        }
    }

    public SendMailToAll = async () => {
        try {// get all mails from database
            let smtp = await SMTPModel.find({})
            // get all stream stats from containerstream stats
            // if (smtp.length === 0)
            //     return;
            let containers: any = await containerStreamStatsModel.find({})
            let majorAlarm: any = await MAJORALARMSModel.find({})
            if (majorAlarm) {
                if (majorAlarm.length > 0) {
                    majorAlarm = majorAlarm[0];
                }
            }

            for (let i = 0; i < containers.length; i++) {
                try {
                    if (containers[i].sentMailStatus) {
                        if (containers[i].sentMailStatus !== containers[i].MailStatus) {
                            if (containers[i].MailStatus === "disconnected") {
                                //shivam
                                let isExist: any = await alarmsReportingModel.find({ StreamID: containers[i].inputStream })
                                if (isExist.length > 0 || (isExist[isExist.length - 1] && !isExist[isExist.length - 1]?.TimeCleared)) {
                                    return;
                                }
                                let content = ""
                                let region: any = await regionModel.findOne({ _id: containers[i].RegionID })
                                let system: any = await systemModel.findOne({ _id: containers[i].SystemID })
                                let updatedAt = containers[i].updatedAt
                                let timezone2: any = await customerServicesV1.gettimezone();
                                let timezone = timezone2.offset;
                                updatedAt = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                                let date = updatedAt.substring(0, 16)
                                let time = updatedAt.substring(16, 25)
                                content = `
                                Region : ${region?.Region}<br>
                                System : ${system?.System}<br>
                                <h3 style="color:red;">Critical Alarm Received</h3>
                                Time : ${time}<br>
                                Date: ${date}<br>
                                Device Name: ${containers[i].properties ? containers[i].properties.devicename : ""}<br>
                                Device IP Address: ${containers[i].peerIP}<br>
                                Stream ID: ${containers[i].inputStream}<br>
                                Comment: ${containers[i].comment}<br>
                                Alarm Type: Stream Stopped<br>
                                `
                                let critical: any = []
                                let subject: any = []
                                let regionmails = region.Email.split(",")
                                for (let j = 0; j < regionmails.length; j++) {
                                    critical.push(regionmails[j])
                                    subject.push(`Critical Alarm Received for Region ${region?.Region}`)
                                }
                                let systemCriticalMails = system.Contact.split(",")
                                for (let j = 0; j < systemCriticalMails.length; j++) {
                                    critical.push(systemCriticalMails[j])
                                    subject.push(`Critical Alarm Received for System ${system?.System}`)
                                }
                                if (smtp.length !== 0)
                                    commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                                let model = new alarmsReportingModel();
                                model.Subject = subject[0]
                                model.RegionID = region._id;
                                model.Region = region.Region;
                                model.System = system.System;
                                model.SystemID = system._id;
                                model.AlarmType = "Critical";
                                model.TimeCreated = containers[i].updatedAt;
                                model.Device = containers[i].DeviceName;
                                model.DeviceID = containers[i].DeviceID;
                                model.ContainerID = containers[i].Id;
                                model.StreamID = containers[i].inputStream;
                                let mailsSent = {}
                                for (let i = 0; i < critical.length; i++) {
                                    mailsSent[critical[i]] = 1;
                                }
                                let mailarray = _.keys(mailsSent)
                                let mails = ""
                                for (let i = 0; i < mailarray.length; i++) {
                                    if (i === mailarray.length - 1) {
                                        mails += mailarray[i]
                                    }
                                    else
                                        mails += mailarray[i] + ", "
                                }
                                if (smtp.length !== 0) model.MailInformed = mails
                                model.save();
                                containerStreamStatsModel.updateOne({ _id: containers[i]._id }, { sentMailStatus: containers[i].MailStatus }, { new: true }, (err) => {
                                    if (err) return;
                                })
                            }
                            else if (containers[i].MailStatus === "major") {
                                let alarmtype: any = await customerServicesV1.CheckMajorAlarm();
                                alarmtype = alarmtype[0];
                                let content = ""
                                let region: any = await regionModel.findOne({ _id: containers[i].RegionID })
                                let system: any = await systemModel.findOne({ _id: containers[i].SystemID })
                                let updatedAt = containers[i].updatedAt
                                let timezone2: any = await customerServicesV1.gettimezone();
                                let timezone = timezone2.offset;
                                updatedAt = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                                let date = updatedAt.substring(0, 16)
                                let time = updatedAt.substring(16, 25)
                                if (containers[i].MailStatus === "major") {
                                    content = `
                                Region : ${region?.Region}<br>
                                System : ${system?.System}<br>
                                <h3 style="color:orange">Major Alarm Recieved</h3>
                                Time : ${time}<br>
                                Date: ${date}<br>
                                Device Name: ${containers[i].properties ? containers[i].properties.devicename : ""}<br>
                                Device IP Address: ${containers[i].peerIP}<br>
                                Stream ID: ${containers[i].inputStream}<br>
                                Comment: ${containers[i].comment}<br>
                                Alarm Type: ${alarmtype.Type}<br>
                                `
                                }
                                let critical: any = []
                                let subject: any = []
                                // let regionmails = region.Email.split(",")
                                // for (let j = 0; j < regionmails.length; j++) {
                                //     critical.push(regionmails[j])
                                //     subject.push(`Major Alarm Received for Region ${region?.Region}`)
                                // }
                                let systemCriticalMails = system.Email.split(",")
                                for (let j = 0; j < systemCriticalMails.length; j++) {
                                    critical.push(systemCriticalMails[j])
                                    subject.push(`Major Alarm Received for System ${system?.System}`)
                                }
                                if (smtp.length !== 0)
                                    commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                                let model = new alarmsReportingModel();
                                model.Subject = subject[0]
                                model.RegionID = region._id;
                                model.Region = region.Region;
                                model.System = system.System;
                                model.SystemID = system._id;
                                model.AlarmType = "Major";
                                model.TimeCreated = containers[i].updatedAt;
                                model.Device = containers[i].DeviceName;
                                model.DeviceID = containers[i].DeviceID;
                                model.ContainerID = containers[i].Id;
                                model.StreamID = containers[i].inputStream;
                                let mailsSent = {}
                                for (let i = 0; i < critical.length; i++) {
                                    mailsSent[critical[i]] = 1;
                                }
                                let mailarray = _.keys(mailsSent)
                                let mails = ""
                                for (let i = 0; i < mailarray.length; i++) {
                                    if (i === mailarray.length - 1) {
                                        mails += mailarray[i]
                                    }
                                    else
                                        mails += mailarray[i] + ", "
                                }
                                if (smtp.length !== 0) model.MailInformed = mails
                                model.save();
                                containerStreamStatsModel.updateOne({ _id: containers[i]._id }, { sentMailStatus: containers[i].MailStatus }, { new: true }, (err) => {
                                    if (err) return;
                                    else console.log("updated container stream stats")
                                })
                            }
                            else if (containers[i].MailStatus === "connected") {
                                let alarmtype: any = await customerServicesV1.CheckMajorAlarm();
                                alarmtype = alarmtype[0];
                                let content = ""
                                let region: any = await regionModel.findOne({ _id: containers[i].RegionID })
                                let system: any = await systemModel.findOne({ _id: containers[i].SystemID })
                                let updatedAt = containers[i].updatedAt;
                                let timezone2: any = await customerServicesV1.gettimezone();
                                let timezone = timezone2.offset;
                                updatedAt = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                                let date = updatedAt.substring(0, 16)
                                let time = updatedAt.substring(16, 25)
                                if (containers[i].sentMailStatus === "disconnected") {
                                    content = `
                                Region : ${region?.Region}<br>
                                System : ${system?.System}<br>
                                <h3 style="color:green">Critical Alarm Cleared</h3>
                                Time : ${time}<br>
                                Date: ${date}<br>
                                Device Name: ${containers[i].properties ? containers[i].properties.devicename : ""}<br>
                                Device IP Address: ${containers[i].peerIP}<br>
                                Stream ID: ${containers[i].inputStream}<br>
                                Comment: ${containers[i].comment}<br>
                                Alarm Type: Stream Started<br>
                                `
                                } else {
                                    content = `
                                Region : ${region?.Region}<br>
                                System : ${system?.System}<br>
                                <h3 style="color:green">Major Alarm Cleared</h3>
                                Time : ${time}<br>
                                Date: ${date}<br>
                                Device Name: ${containers[i].properties ? containers[i].properties.devicename : ""}<br>
                                Device IP Address: ${containers[i].peerIP}<br>
                                Stream ID: ${containers[i].inputStream}<br>
                                Comment: ${containers[i].comment}<br>
                                Alarm Type: ${alarmtype.Type}<br>
                                `
                                }


                                let critical: any = []
                                let subject: any = []
                                let regionmails = region.Email.split(",")
                                if (containers[i].sentMailStatus === "disconnected") {
                                    for (let j = 0; j < regionmails.length; j++) {
                                        critical.push(regionmails[j])
                                        if (containers[i].sentMailStatus === "disconnected")
                                            subject.push(`Critical Alarm Cleared for Region ${region?.Region}`)
                                        else
                                            subject.push(`Major Alarm Cleared for Region ${region?.Region}`)
                                    }
                                    let systemCriticalMails = system.Contact.split(",")
                                    for (let j = 0; j < systemCriticalMails.length; j++) {
                                        critical.push(systemCriticalMails[j])
                                        if (containers[i].sentMailStatus === "disconnected")
                                            subject.push(`Critical Alarm Cleared for System ${system.System}`)
                                        else
                                            subject.push(`Major Alarm Cleared for System ${system.System}`)
                                    }
                                }
                                else {
                                    let systemCriticalMails = system.Email.split(",")
                                    for (let j = 0; j < systemCriticalMails.length; j++) {
                                        critical.push(systemCriticalMails[j])
                                        if (containers[i].sentMailStatus === "disconnected")
                                            subject.push(`Critical Alarm Cleared for System ${system.System}`)
                                        else
                                            subject.push(`Major Alarm Cleared for System ${system.System}`)
                                    }
                                }
                                if (smtp.length !== 0)
                                    commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                                let alarmReport: any = await alarmsReportingModel.findOne({ ContainerID: containers[i].Id, TimeCleared: { $eq: undefined } });
                                if (alarmReport) {
                                    let created: any = new Date(new Date(alarmReport.TimeCreated).getTime() + timezone * 3600000);
                                    let cleared = new Date(new Date(containers[i].updatedAt).getTime() + timezone * 3600000)
                                    let diff = cleared.getTime() - created.getTime();
                                    let timeinterval = commonUtil.msToTime(diff);
                                    let blob = {
                                        TimeInterval: timeinterval,
                                        TimeCleared: containers[i].updatedAt
                                    }
                                    alarmsReportingModel.updateOne({ ContainerID: containers[i]._id, TimeCleared: { $eq: undefined }, AlarmType: { $ne: "Critical(No Device Available)" } }, { $set: blob }, { new: true }, (err) => {
                                        if (err) return;
                                    })
                                }
                                containerStreamStatsModel.updateOne({ _id: containers[i]._id }, { sentMailStatus: containers[i].MailStatus }, { new: true }, (err) => {
                                    if (err) return;
                                })
                            }
                        }
                    } else {
                        if (containers[i].MailStatus === "disconnected") {
                            // shivam
                            let isExist = await alarmsReportingModel.find({ StreamID: containers[i].inputStream })
                            if (isExist.length > 0 || (isExist[isExist.length - 1] && !isExist[isExist.length - 1]?.TimeCleared)) {
                                return;
                            }
                            let content = ""
                            let region: any = await regionModel.findOne({ _id: containers[i].RegionID })
                            let system: any = await systemModel.findOne({ _id: containers[i].SystemID })
                            let updatedAt = containers[i].updatedAt
                            let timezone2: any = await customerServicesV1.gettimezone();
                            let timezone = timezone2.offset;
                            updatedAt = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                            let date = updatedAt.substring(0, 16)
                            let time = updatedAt.substring(16, 25)
                            let critical: any = []
                            let subject: any = []
                            let regionmails = region.Email.split(",")
                            for (let j = 0; j < regionmails.length; j++) {
                                critical.push(regionmails[j])
                                subject.push(`Critical Alarm Received for Region ${region?.Region}`)
                            }
                            let systemCriticalMails = system.Contact.split(",")
                            for (let j = 0; j < systemCriticalMails.length; j++) {
                                critical.push(systemCriticalMails[j])
                                subject.push(`Critical Alarm Received for System ${system?.System}`)
                            }
                            if (containers[i].MailStatus === "disconnected") {
                                content = `
                            Region : ${region?.Region}<br>
                            System : ${system?.System}<br>
                            <h3 style="color:red;">Critical Alarm Received</h3>
                            Time : ${time}<br>
                            Date: ${date}<br>
                            Device Name: ${containers[i].properties ? containers[i].properties.devicename : ""}<br>
                            Device IP Address: ${containers[i].peerIP}<br>
                            Stream ID: ${containers[i].inputStream}<br>
                            Comment: ${containers[i].comment}<br>
                            Alarm Type: Stream Stopped<br>
                            `
                            }
                            if (smtp.length !== 0)
                                commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                            let model = new alarmsReportingModel();
                            model.Subject = subject[0]
                            model.RegionID = region._id;
                            model.Region = region.Region;
                            model.System = system.System;
                            model.SystemID = system._id;
                            model.AlarmType = "Critical";
                            model.TimeCreated = containers[i].updatedAt;
                            model.Device = containers[i].DeviceName;
                            model.DeviceID = containers[i].DeviceID;
                            model.ContainerID = containers[i].Id;
                            model.StreamID = containers[i].inputStream;
                            let mailsSent = {}
                            for (let i = 0; i < critical.length; i++) {
                                mailsSent[critical[i]] = 1;
                            }
                            let mailarray = _.keys(mailsSent)
                            let mails = ""
                            for (let i = 0; i < mailarray.length; i++) {
                                if (i === mailarray.length - 1) {
                                    mails += mailarray[i]
                                }
                                else
                                    mails += mailarray[i] + ", "
                            }
                            if (smtp.length !== 0) model.MailInformed = mails
                            model.save();
                            containerStreamStatsModel.updateOne({ _id: containers[i]._id }, { sentMailStatus: containers[i].MailStatus }, { new: true }, (err) => {
                                if (err) return;
                            })
                        } else if (containers[i].MailStatus === "major") {
                            let alarmtype: any = await customerServicesV1.CheckMajorAlarm();
                            alarmtype = alarmtype[0];
                            let content = ""
                            let region: any = await regionModel.findOne({ _id: containers[i].RegionID })
                            let system: any = await systemModel.findOne({ _id: containers[i].SystemID })
                            let updatedAt = containers[i].updatedAt;
                            let timezone2: any = await customerServicesV1.gettimezone();
                            let timezone = timezone2.offset;
                            updatedAt = new Date(updatedAt.getTime() + timezone * 3600000).toUTCString();
                            let date = updatedAt.substring(0, 16)
                            let time = updatedAt.substring(16, 25)
                            if (containers[i].MailStatus === "major") {
                                content = `
                            Region : ${region?.Region}<br>
                            System : ${system?.System}<br>
                            <h3 style="color:orange">Major Alarm Recieved</h3>
                            Time : ${time}<br>
                            Date: ${date}<br>
                            Device Name: ${containers[i].properties ? containers[i].properties.devicename : ""}<br>
                            Device IP Address: ${containers[i].peerIP}<br>
                            Stream ID: ${containers[i].inputStream}<br>
                            Comment: ${containers[i].comment}<br>
                            Alarm Type: ${alarmtype.Type}<br>
                            `
                            }
                            let critical: any = []
                            let subject: any = []
                            // let regionmails = region.Email.split(",")
                            // for (let j = 0; j < regionmails.length; j++) {
                            //     critical.push(regionmails[j])
                            //     subject.push(`Major Alarm Received for Region ${region?.Region}`)
                            // }
                            let systemCriticalMails = system.Email.split(",")
                            for (let j = 0; j < systemCriticalMails.length; j++) {
                                critical.push(systemCriticalMails[j])
                                subject.push(`Major Alarm Received for System ${system?.System}`)
                            }
                            if (smtp.length !== 0)
                                commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, critical, smtp[0].Sendername, smtp[0].isSecure)
                            let model = new alarmsReportingModel();
                            model.Subject = subject[0]
                            model.RegionID = region._id;
                            model.Region = region.Region;
                            model.System = system.System;
                            model.SystemID = system._id;
                            model.AlarmType = "Major";
                            model.TimeCreated = containers[i].updatedAt;
                            model.Device = containers[i].DeviceName;
                            model.DeviceID = containers[i].DeviceID;
                            model.ContainerID = containers[i].Id;
                            model.StreamID = containers[i].inputStream;
                            let mailsSent = {}
                            for (let i = 0; i < critical.length; i++) {
                                mailsSent[critical[i]] = 1;
                            }
                            let mailarray = _.keys(mailsSent)
                            let mails = ""
                            for (let i = 0; i < mailarray.length; i++) {
                                if (i === mailarray.length - 1) {
                                    mails += mailarray[i]
                                }
                                else
                                    mails += mailarray[i] + ", "
                            }
                            if (smtp.length !== 0) model.MailInformed = mails
                            model.save();
                            containerStreamStatsModel.updateOne({ _id: containers[i]._id }, { sentMailStatus: containers[i].MailStatus }, { new: true }, (err) => {
                                if (err) return;
                            })
                        }
                    }
                } catch (err) {
                    continue
                }

            }
        } catch (error) {
            return null;
        }
    }

    public SaveHistoryCron = async () => {
        try {
            let containers = await containerStreamStatsModel.find({ isSavedHistory: true })
            let yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            let responseDelete = await saveHistoryModel.deleteMany({ createdAt: { $lt: yesterday } }, {}, (err) => {
                if (err) return;
            })
            let time: any;
            let responseTime = await cronModel.find({})
            if (responseTime) {
                if (responseTime.length > 0) {
                    time = Number.parseInt(responseTime[0].SaveHistory as string);
                }
                else {
                    time = 10;
                }
            } else {
                time = 10;
            }


            for (let i = 0; i < containers.length; i++) {
                try {
                    if (containers[i].isSavedHistory) {
                        let Id = containers[i].Id
                        let req: any = new ReqEllvisschemas();
                        req.Id = Id;
                        req.ip = containers[i].deviceip;
                        let streamStats = await ellvisServicesV1.GetConnectedDeviceStreamStats(req)
                        let inputStats: any = streamStats[0].inputStats
                        let outputStats: any = streamStats[0].outputStats
                        let Bandwidth = {
                            recv: inputStats !== undefined && inputStats.link !== undefined && inputStats.link.bandwidth !== undefined ? (inputStats.link.bandwidth) : 0,
                            send: outputStats !== undefined && outputStats.link !== undefined && outputStats.link.bandwidth !== undefined ? outputStats.link.bandwidth : 0
                        }
                        let MBitRate = {
                            recv: inputStats !== undefined && inputStats.recv !== undefined ? inputStats.recv.mbitRate : 0,
                            send: outputStats !== undefined && outputStats.send !== undefined ? outputStats.send.mbitRate : 0
                        }
                        let RTT = {
                            recv: inputStats !== undefined && inputStats.link !== undefined && inputStats.link.rtt !== undefined ? inputStats.link.rtt : 0,
                            send: outputStats !== undefined && outputStats.link !== undefined && outputStats.link.rtt !== undefined ? outputStats.link.rtt : 0
                        }
                        let Packets = {
                            recv: inputStats !== undefined && inputStats.recv !== undefined ? inputStats.recv.packets : 0,
                            send: outputStats !== undefined && outputStats.send !== undefined ? outputStats.send.packets : 0
                        }
                        let PacketsLost = {
                            recv: inputStats !== undefined && inputStats.recv !== undefined && inputStats.recv.packetsLost !== undefined ? (inputStats.recv.packetsLost) : 0,
                            send: outputStats !== undefined && outputStats.send !== undefined && outputStats.recv.packetsLost !== undefined ? (outputStats.recv.packetsLost) : 0,
                        }
                        let PacketsDropped = {
                            recv: inputStats !== undefined && inputStats.recv !== undefined && inputStats.recv.packetsDropped !== undefined ? (inputStats.recv.packetsDropped) : 0,
                            send: outputStats !== undefined && outputStats.send !== undefined && outputStats.recv.packetsDropped !== undefined ? (outputStats.recv.packetsDropped) : 0,
                        }
                        let RetransmittedTotal = {
                            recv: inputStats !== undefined && inputStats.recv !== undefined ? inputStats.recv.packetsRetransmitted : 0,
                            send: outputStats !== undefined && outputStats.send !== undefined ? outputStats.send.packetsRetransmitted : 0
                        }
                        let BelatedPackets = inputStats !== undefined && inputStats.recv !== undefined ? inputStats.recv.packetsBelated : 0;

                        if (streamStats[0].status === "disconnected") {
                            Bandwidth = {
                                recv: 0,
                                send: 0
                            }
                            MBitRate = {
                                recv: 0,
                                send: 0
                            }
                            RTT = {
                                recv: 0,
                                send: 0
                            }
                            Packets = {
                                recv: 0,
                                send: 0
                            }
                            PacketsLost = {
                                recv: 0,
                                send: 0
                            }
                            PacketsDropped = {
                                recv: 0,
                                send: 0
                            }
                            RetransmittedTotal = {
                                recv: 0,
                                send: 0
                            }
                            BelatedPackets = 0;

                        }

                        let newdate = new Date()
                        let MaxTimeElement: any = await saveHistoryModel.find().sort({ OurDate: -1 }).limit(1)
                        if (MaxTimeElement.length > 0) {
                            let olddate: Date = MaxTimeElement[0].OurDate;
                            let start = olddate.getMinutes() + time;
                            olddate.setMinutes(olddate.getMinutes() + time);
                            while ((newdate.getTime() - olddate.getTime()) / 60000 > time) {
                                let blob = new saveHistoryModel()
                                blob.ContainerId = Id;
                                blob.Bandwidth = { recv: 0, send: 0 };
                                blob.MBitRate = { recv: 0, send: 0 };
                                blob.RTT = { recv: 0, send: 0 };
                                blob.Packets = { recv: 0, send: 0 };
                                blob.PacketsLost = { recv: 0, send: 0 };
                                blob.PacketsDropped = { recv: 0, send: 0 };
                                blob.ReTransmittedPackets = { recv: 0, send: 0 };
                                blob.BelatedPackets = "0"
                                blob.OurDate = olddate;
                                start = start + time;
                                olddate.setMinutes(olddate.getMinutes() + time)
                                await blob.save();
                            }
                        }

                        let blob = new saveHistoryModel()
                        blob.ContainerId = Id
                        blob.Bandwidth = Bandwidth;
                        blob.MBitRate = MBitRate;
                        blob.RTT = RTT;
                        blob.Packets = Packets;
                        blob.PacketsLost = PacketsLost;
                        blob.PacketsDropped = PacketsDropped;
                        blob.ReTransmittedPackets = RetransmittedTotal;
                        blob.BelatedPackets = BelatedPackets;
                        blob.OurDate = newdate;
                        await blob.save();

                    }
                } catch (err) {
                    continue
                }
            }

        } catch (error) {
            return null;
        }
    }

    public GetGraphData = async (req) => {
        try {
            let resultRequest = await saveHistoryModel.find({ ContainerId: req.ContainerId })
            return resultRequest;
        } catch (error) {
            return null;
        }
    }

    public getFlooredFixed(v, d) {
        try {
            return (Math.floor(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
        } catch (error) {
            return null;
        }
    }

    public GetLinkEfficiencyAndDropPercentage = async (req: ContainersStreamStats) => {
        try {

            let container = await containerStreamStatsModel.findOne({ _id: req.Id })
            let lossPackets = container && container.inputStats ? (Number.parseFloat((container.inputStats["recv"]["packetsDroppedTotal"]).toFixed(2)) / (Number.parseFloat((container.inputStats['recv']["packetsDroppedTotal"]).toFixed(2)) + Number.parseFloat((container.inputStats["recv"]["packetsTotal"]).toFixed(2)))) * 100 : 0
            let linkEfficiency = container && container.inputStats ? (Number.parseFloat((container.inputStats["recv"]["packetsTotal"]).toFixed(2)) / (Number.parseFloat((container.inputStats['recv']["packetsBelatedTotal"]).toFixed(2)) + Number.parseFloat((container.inputStats["recv"]["packetsTotal"]).toFixed(2)) + Number.parseFloat((container.inputStats["recv"]["packetsRetransmittedTotal"]).toFixed(2)))) * 100 : 0
            return {
                LossPacketsPercentage: this.getFlooredFixed(lossPackets, 2),
                LinkEfficiency: this.getFlooredFixed(linkEfficiency, 2)
            }
        } catch (error) {
            return null;
        }
    }
    public StartBackupCron = async () => {
        try {
            let backupCron = await BackupCronModel.find({});
            if (backupCron.length) {
                if (backupCron[0]?.dailyexpression && backupCron[0]?.dailystorage) {
                    app.Manager.add("dbdaily", backupCron[0]?.dailyexpression, () => {
                        backupServicesV1.ScheduledBackup("", backupCron[0]?.dailystorage);
                    }, {
                        start: true,
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })
                }
                if (backupCron[0]?.weeklyexpression && backupCron[0]?.weeklyexpression) {
                    app.Manager.add('dbweekly', backupCron[0]?.weeklyexpression, () => {
                        backupServicesV1.ScheduledBackup("", backupCron[0]?.weeklystorage);
                    }, {
                        start: true,
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })
                }
                return "Backup Cron job set"
            }
            else return "No Backup Scheduled";
        } catch (error) {
            return null;
        }

    }

    // public getdeviceobjectold = async () => {
    //     try {
    //         let devices: any = await customerDeviceModel.find({});
    //         let containerstat = await containerStreamStatsModel.find({});
    //         let deviceObject:any = [];
    //         let ipcontainer:any = [];

    //         for(let i=0; i<containerstat.length; i++){
    //             let devIp:any = containerstat[i].peerIP?.split(':')[0];
    //             let deviceIp: any = containerstat[i].deviceip;

    //             if(ipcontainer.length === 0 || ipcontainer.includes(devIp) === false){
    //                 ipcontainer.push(devIp);
    //                 ipcontainer.push(deviceIp);
    //             }else{
    //                 continue;
    //             }

    //             let deviceone = await customerDeviceModel.findOne({IP: devIp});

    //             if(deviceone !== null && deviceone !== undefined){
    //                 let newobj= {};
    //                 newobj[deviceIp] = deviceone;

    //                 deviceObject.push(newobj);
    //             }


    //         }

    //         for(let i= 0; i<devices.length; i++){
    //             let deviceIPrem ={};
    //             deviceIPrem[devices[i].IP] = {};
    //             if(ipcontainer.includes(devices[i].IP)){
    //                 continue;
    //             }else{
    //                 deviceObject.push(deviceIPrem);
    //             }
    //         }
    //         let newObject ={};
    //         for(let i=0; i<deviceObject.length; i++){
    //             let arrayDeviceKey = Object.keys(deviceObject[i]);
    //             let arrayDeviceValue = Object.values(deviceObject[i]);
    //             if(newObject.hasOwnProperty(arrayDeviceKey[0])){
    //                 newObject[arrayDeviceKey[0]].push(arrayDeviceValue[0]);
    //             }else{
    //                 let arrayObj = [arrayDeviceValue[0]];
    //                 newObject[arrayDeviceKey[0]] = arrayObj;
    //             }
    //         }

    //         return newObject;

    //     } catch (error) {
    //         return null;
    //     }

    // }
    public getdeviceobject = async () => {
        try {
            let devices: any = await customerDeviceModel.find({});
            // let containerstat = await containerStreamStatsModel.find({});
            let deviceObject: any = [];
            let ipcontainer: any = [];

            for (let i = 0; i < devices.length; i++) {
                let devIp: any = devices[i].IP;
                // let deviceIp: any = containerstat[i].deviceip;
                let ipcontainer: any = [];
                if (ipcontainer.length === 0 || ipcontainer.includes(devIp) === false) {
                    ipcontainer.push(devIp);
                    // ipcontainer.push(deviceIp);
                } else {
                    continue;
                }

                let streamStat: any = await containerStreamStatsModel.findOne({ peerIP: new RegExp(devIp) });

                if (streamStat !== null && streamStat !== undefined) {
                    let newobj = {};
                    let deviceIp = streamStat.deviceip;
                    newobj[deviceIp] = devices[i];

                    deviceObject.push(newobj);
                }
                else {
                    let newobj = {};
                    // let deviceIp = streamStat.deviceip;
                    newobj[devIp] = devices[i];

                    deviceObject.push(newobj);
                }


            }

            // for(let i= 0; i<devices.length; i++){
            //     let deviceIPrem ={};
            //     deviceIPrem[devices[i].IP] = {};
            //     if(ipcontainer.includes(devices[i].IP)){
            //         continue;
            //     }else{
            //         deviceObject.push(deviceIPrem);
            //     }
            // }
            let newObject = {};
            for (let i = 0; i < deviceObject.length; i++) {
                let arrayDeviceKey = Object.keys(deviceObject[i]);
                let arrayDeviceValue = Object.values(deviceObject[i]);
                if (newObject.hasOwnProperty(arrayDeviceKey[0])) {
                    newObject[arrayDeviceKey[0]].push(arrayDeviceValue[0]);
                } else {
                    let arrayObj = [arrayDeviceValue[0]];
                    newObject[arrayDeviceKey[0]] = arrayObj;
                }
            }

            return newObject;

        } catch (error) {
            return null;
        }

    }

    public getbackendversion = async () => {
        try {
            let bversion = backendVersion.version;
            return bversion;

        } catch (error) {
            return null;
        }

    }
}

export const globalServicesV1 = new GlobalServices();