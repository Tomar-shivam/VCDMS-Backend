import { secretUtil } from '../../../utils/secretutil';
import request from 'request';
import { ReqEllvisschemas } from '../../../routes/v1/ellvis/ellvisschema';
import { customerDeviceModel, CustomerDevice } from '../../../models/ellvis/customerdevice.model';
import { ConnectedDevice } from '../../../models/ellvis/connecteddevices.model';
import { ChangePassword } from '../../../models/ellvis/changepassword.model';
import { ReqEncoderschemas } from '../../../routes/v1/encoder/encoderschema';
import { encoderServicesV1 } from '../../../services/v1/encoder/encoderservicesv1';
import Login from "../../../models/ellvis/login.model";
import Container from "../../../models/ellvis/container.model";
import { AlarmList, AlarmListModel } from '../../../models/ellvis/alarm.model';
import ImportPresets from "../../../models/ellvis/importpresets.model";
import 'process';
import axios from 'axios'
import { globalServicesV1 } from '../global/globalservices';
import { globalControllerV1 } from '../../../controllers/v1/global/globalcontroller';
import { regionModel } from '../../../models/region/region.model';
import { System, systemModel } from '../../../models/region/system.model';
import SystemAction from "../../../models/ellvis/systemaction.model";
import _ from 'underscore'
import { Types } from 'mongoose'

import { liceseInfoModel } from '../../../models/global/licenseinfomodel';
import { containerStreamStatsModel, ContainersStreamStats } from '../../../models/global/containerstreamstatsmodel';
import { networkSettingsModel } from '../../../models/global/networksettingsmodel';

import { NetworkSettings } from '../../../routes/v1/networksettings/networksettings';
import { SETTINGSModel } from '../../../models/customer/settingsmodel';
import { commonUtil } from '../../../utils/commonUtil';
import { validateLicense } from '../../../utils/responsehandlerutil';
import { licenseCheckModel } from '../../../models/licensemodel';
import logging from "../../../logging";



class EllvisServicesV1 {
    private bearerTokens = {}
    public GetAllDevicesV2 = async (req?: ReqEllvisschemas) => {

        //get connected devices by customerid.

        try {
            var customerDevices = await customerDeviceModel.find({ CustomerID: req?.customerid, RegionID: req?.RegionID, SystemID: req?.SystemID });
            let customerDevicesArray = new Array();

            for (let k = 0; k < customerDevices.length; k++) {
                let connectedDevicesArray = new Array();
                var customerDevicesObj = {};
                let connectedDeviceObj = new Container();
                connectedDeviceObj.ip = customerDevices[k].IP as string;
                // var connectedDevices = await this.GetAllContainers(connectedDeviceObj);
                // connectedDevices.sort((a,b) => {
                //     return a.Id.slice(0, 12).localeCompare(b.Id.slice(0,12))
                // })
                let connectedDeviceObjStat = new ConnectedDevice();
                connectedDeviceObjStat.IP = customerDevices[k].IP as string;
                var connectedDevicesStat = await this.GetEllvisStreamStats(connectedDeviceObjStat);
                // connectedDevicesStat.sort((a, b) => {
                //     return a.Id.slice(0, 12).localeCompare(b.Id.slice(0, 12))
                // })
                customerDevicesObj['DeviceName'] = customerDevices[k].DeviceName;
                customerDevicesObj['IP'] = customerDevices[k].IP;
                // customerDevicesObj['ConnectedDevice'] = connectedDevices;
                customerDevicesObj['ConnectedDeviceStats'] = connectedDevicesStat
                customerDevicesObj['DeviceType'] = customerDevices[k].DeviceType;
                customerDevicesArray.push(customerDevicesObj);
            }


            return customerDevicesArray;
        } catch (error) {
            return null;
        }
    };


    // public GetAllDevices = async (req?: ReqEllvisschemas) => {

    //     //get connected devices by customerid.

    //     var customerDevices = await customerDeviceModel.find({ CustomerID: req?.customerid });
    //     let customerDevicesArray = new Array();

    //     for (let k = 0; k < customerDevices.length; k++) {
    //         let connectedDevicesArray = new Array();
    //         var customerDevicesObj = {};
    //         let connectedDeviceObj = new ConnectedDevice();
    //         connectedDeviceObj.IP = customerDevices[k].IP;
    //         var connectedDevices = await this.GetConnectedDevices(connectedDeviceObj);
    //         if (connectedDevices != null) {
    //             for (let j = 0; j < connectedDevices.length; j++) {
    //                 var connectedDevicesObj = {};
    //                 var encoderobj = new ReqEncoderschemas();
    //                 encoderobj.ip = connectedDevices[j].peerIP;
    //                 var devicename = '';
    //                 try {
    //                     var deviceProperties = await encoderServicesV1.GetEncoderProperties(encoderobj);
    //                     devicename = deviceProperties['device']['devicename'];
    //                 }
    //                 catch {
    //                     var a = 0;
    //                 }

    //                 connectedDevicesObj['DeviceName'] = devicename;
    //                 connectedDevicesObj['PeerIP'] = connectedDevices[j].peerIP;
    //                 connectedDevicesObj['input'] = connectedDevices[j].input;
    //                 connectedDevicesObj['Status'] = connectedDevices[j].status;
    //                 connectedDevicesObj['inputStats'] = connectedDevices[j].inputStats;
    //                 connectedDevicesObj['outputStats'] = connectedDevices[j].outputStats;
    //                 connectedDevicesArray.push(connectedDevicesObj);
    //             }
    //         }

    //         customerDevicesObj['IP'] = customerDevices[k].IP;
    //         customerDevicesObj['DeviceName'] = customerDevices[k].DeviceName;
    //         customerDevicesObj['DeviceType'] = customerDevices[k].DeviceType;
    //         customerDevicesObj['CustomerID'] = customerDevices[k].CustomerID;
    //         customerDevicesObj['ConnectedDevice'] = connectedDevicesArray;
    //         customerDevicesArray.push(customerDevicesObj);
    //     }


    //     return customerDevicesArray;
    // };

    public GetConnectedDeviceStreamStats = async (req: ReqEllvisschemas) => {

        //get connected device stream stats.
        try {
            let connectedDeviceObj = new ConnectedDevice();
            connectedDeviceObj.IP = req?.ip;
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.ip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id.toString()
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            var connectedDevices = await this.GetStreamStatsbyId(req, data, req?.Id);
            // await containerStreamStatsModel.updateOne({_id:req._id}, {$set:{inputStats:connectedDevices[0].inputStats}})
            return connectedDevices;
        } catch (error) {
            return null;
        }
    };


    public GetAlarmList = async (req?: AlarmList) => {
        try {
            var alarmList = await AlarmListModel.find({});
            return alarmList;
        }
        catch (ex) {
            return null;
        }
    };



    //-------------------------------------------------


    public EllvisChangePassword = async (req?: ChangePassword) => {

        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }

            let _url = ssl + "://" + req?.ip + secretUtil.ELLVIS_CHANGE_PASSWORD;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `change ellviss password for this , ${req?.ip}`);
            }
            let options = {
                method: 'POST',
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req)
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: "success" }, `change ellviss password successfully for, ${req?.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception for change ellviss password for, ${req?.ip}`);
            }
            return null;
        }
    };

    public GetEllvisStreamStats = async (req: ConnectedDevice) => {

        //get connected devices. 
        try {
            const requestResult = await this.GetEllvisStreamStatsByIP(req);
            requestResult.sort((a, b) => {
                return a.Id.slice(0, 12).localeCompare(b.Id.slice(0, 12))
            })
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private GetEllvisStreamStatsByIP = async (req: ConnectedDevice) => {
        try {
            let data: any
            if (!req.AuthToken) {
                let device = await customerDeviceModel.findOne({ IP: req.IP })
                if (device?.AuthToken) {
                    req.AuthToken = device.AuthToken
                }
                if (device?.Password) {
                    req.Password = device.Password
                }
                if (device?._id) {
                    req._id = device._id.toString()
                }
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.IP })
                if (data) {
                    if (data.accessToken) {
                        await customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    await customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.IP + secretUtil.ELLVIS_ACTIVE_CONNECTIONS;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `check ellvis active connection for, ${req.IP}`);
            }
            let options = {
                method: 'GET',
                url: _url,
                headers: {
                    "Content-Type": 'application/json',
                    Authorization: "Bearer " + data.accessToken,
                },
                strictSSL: false,
                timeout: 9000
            }

            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) {
                        return resolve(null);
                    }
                    try {
                        return resolve(JSON.parse(res.body));
                    }
                    catch (ex) {
                        return resolve(null);
                    }
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info(`if fail to check ellvis active connection then logoin again for, ${req.IP}`);
                }
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.IP, error: resData.error })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }

                let _url = ssl + "://" + req.IP + secretUtil.ELLVIS_ACTIVE_CONNECTIONS;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `check ellvis active connection again for, ${req.IP}`);
                }
                options = {
                    method: 'GET',
                    url: _url,
                    headers: {
                        "Content-Type": 'application/json',
                        Authorization: "Bearer " + data.accessToken,
                    },
                    strictSSL: false,
                    timeout: 5000
                }

                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) {
                            return resolve(null);
                        }
                        try {
                            return resolve(JSON.parse(res.body));
                        }
                        catch (ex) {
                            return resolve(null);
                        }
                    });
                });
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `check ellvis active connection successfully, ${req.IP}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception to check ellvis active connection, ${req.IP}`);
            }
            return null;
        }
    };

    public GetVersionLicensingInfo = async (req: ConnectedDevice) => {

        //Get Version and Licensing info. 
        try {
            const requestResult = await this.GetVersionLicensingInfoByIP(req);

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private GetVersionLicensingInfoByIP = async (req: ConnectedDevice) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.IP })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id.toString()
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.IP })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.IP + secretUtil.ELLVIS_VERSION_LICENSING;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `ellviss version Licence, ${req.IP}`);
            }

            let options = {
                method: 'GET',
                url: _url,
                headers: {
                    Authorization: "Bearer " + data.accessToken,
                    "Content-Type": 'application/json'
                },
                strictSSL: false
            }

            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    try {
                        resolve(JSON.parse(res.body));
                    }
                    catch (ex) {
                        return resolve(null);
                    }
                });
            });

            if ((resData === null || resData.error) && req.AuthToken) {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.IP })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.IP + secretUtil.ELLVIS_VERSION_LICENSING;
                options = {
                    method: 'GET',
                    url: _url,
                    headers: {
                        Authorization: "Bearer " + data.accessToken,
                        "Content-Type": 'application/json'
                    },
                    strictSSL: false
                }

                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        try {
                            resolve(JSON.parse(res.body));
                        }
                        catch (ex) {
                            return resolve(null);
                        }
                    });
                });
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `respinse of ellviss version Licence, ${req.IP}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in ellviss version Licence, ${req.IP}`);
            }
            return null;
        }

    };

    public GetNetworkSettings = async (req: ConnectedDevice) => {

        //Get network IPs, Adapter, anagement port. 
        try {
            const requestResult = await this.GetNetworkSettingsIP(req);

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private GetNetworkSettingsIP = async (req: ConnectedDevice) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.IP })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id.toString()
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.IP })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken } }, { new: true }, (err) => {
                            if (err) return
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.IP + secretUtil.ELLVIS_NETWORK_SETTINGS;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `ellviss network settings for, ${req.IP}`);
            }
            let options = {
                method: 'GET',
                url: _url,
                headers: {
                    Authorization: "Bearer " + data.accessToken,
                    "Content-Type": 'application/json'
                },
                strictSSL: false
            }

            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    try {
                        return resolve(JSON.parse(res.body));
                    }
                    catch (ex) {
                        return resolve(null);
                    }
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                _url = ssl + "://" + req.IP + secretUtil.ELLVIS_NETWORK_SETTINGS;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info(`hit again ellviss network settings for, ${req.IP}`);
                }
                options = {
                    method: 'GET',
                    url: _url,
                    headers: {
                        Authorization: "Bearer " + data.accessToken,
                        "Content-Type": 'application/json'
                    },
                    strictSSL: false
                }

                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        try {
                            return resolve(JSON.parse(res.body));
                        }
                        catch (ex) {
                            return resolve(null);
                        }
                    });
                });
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `response of ellviss network settings endpoint, ${req.IP}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in ellviss network settings endpoint, ${req.IP}`);
            }
            return null;
        }
    };

    public GetAllContainers = async (req: Container) => {

        //get the list of all containers. 
        try {
            const requestResult = await this.GetAllContainersIP(req);
            if (requestResult) {
                requestResult.sort((a, b) => {
                    return a.Id.slice(0, 12).localeCompare(b.Id.slice(0, 12))
                })
            }
            return requestResult;
        } catch (error) {
            return null;
        }
    };



    private GetAllContainersIP = async (req: Container) => {
        try {
            let data: any
            if (!req.AuthToken) {
                let device = await customerDeviceModel.findOne({ IP: req.ip })
                if (device?.AuthToken) {
                    req.AuthToken = device.AuthToken
                }
                if (device?.Password) {
                    req.Password = device.Password
                }
                if (device?._id) {
                    req._id = device._id.toString()
                }
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        await customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    await customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_ALL_CONTAINERS;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `get all container Ip, ${req.ip}`);
            }

            if (req.state == "running") {
                _url = ssl + "://" + req.ip + secretUtil.ELLVIS_ALL_CONTAINERS_RUNNING;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `get all container Ip if status is running, ${req.ip}`);
                }
            }
            let options = {
                method: 'GET',
                url: _url,
                headers: {
                    Authorization: "Bearer " + data.accessToken,
                    "Content-Type": 'application/json'
                },
                strictSSL: false,
                timeout: 10000
            }

            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) {
                        return resolve(null);
                    }
                    try {
                        resolve(JSON.parse(res.body));
                    }
                    catch (ex) {
                        return resolve(null);
                    }
                });
            });

            if ((resData === null || resData.error) && req.AuthToken) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info(`getting response for ${req.ip}`);
                }
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip, error: resData ? resData.error : resData })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }

                _url = ssl + "://" + req.ip + secretUtil.ELLVIS_ALL_CONTAINERS;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `get all container Ip after getting null response, ${req.ip}`);
                }

                if (req.state == "running") {
                    _url = ssl + "://" + req.ip + secretUtil.ELLVIS_ALL_CONTAINERS_RUNNING;
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ url: _url }, `get all container Ip if status is running, ${req.ip}`);
                    }
                }
                options = {
                    method: 'GET',
                    url: _url,
                    headers: {
                        Authorization: "Bearer " + data.accessToken,
                        "Content-Type": 'application/json'
                    },
                    strictSSL: false,
                    timeout: 10000
                }

                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) {
                            return resolve(null);
                        }
                        try {
                            resolve(JSON.parse(res.body));
                        }
                        catch (ex) {
                            return resolve(null);
                        }
                    });
                });
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `response of get all container Ip, ${req.ip}`, { responseData: "get container data successfully" });
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in get all container Ip endpoint, ${req.ip}`);
            }
            return null;
        }
    };

    public checkRemoteDeviceAdd = async (req: any) => {
        try {
            req['username'] = "apiuser";
            req['password'] = "";
            const requestResult = await this.getBearerTokenbyUsernamePasswordRemote(req);
            return requestResult
        } catch (error) {

        }
    }

    public Login = async (req: any) => {
        //get bearer token. 
        try {
            let res = { accessToken: '' }
            let requestResult;
            if (req && req.error) {
                // logout ellvis and login again 
                if (req.ip) {
                    this.EllvisLogout({ ip: req.ip });
                    requestResult = await this.getBearerTokenbyUsernamePassword(req);
                }
            }

            else if (req) {
                let ellvis_isExist = await customerDeviceModel.findOne({ IP: req?.ip });
                let authToken = ellvis_isExist ? ellvis_isExist.AuthToken : "";
                res.accessToken = authToken ? authToken : '';
                requestResult = res ? res : await this.getBearerTokenbyUsernamePassword(req);
            }
            this.bearerTokens[req?.ip as string] = { accessToken: requestResult ? requestResult.accessToken : requestResult }
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    public EllvisLogout = async (req) => {
        try {
            let currEllvis = await customerDeviceModel.findOne({ IP: req.ip });
            let authToken = currEllvis ? currEllvis.AuthToken : '';
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_LOGOUT;

            let options = {
                method: "POST",
                url: _url,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + authToken
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 7000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    try {
                        resolve(JSON.parse(res.body));
                    } catch (err) {
                        resolve({ message: "Internal Server Error" });
                    }
                });
            });
            if (resData == 'success') {
                return;
            }
            return;
        } catch (error) {
            return;
        }

    }
    public LoginIndividual = async (req?: Login) => {

        //get bearer token. 
        try {
            const requestResult = await this.getBearerTokenbyUsernamePasswordIndividual(req);
            this.bearerTokens[req?.ip as string] = { accessToken: requestResult.accessToken }
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private getBearerTokenbyUsernamePasswordRemote = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_LOGIN;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `try to login ellvis for, ${req.ip}`);
            }
            let options = {
                method: "POST",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve({ addAsLegacy: true });
                    try {
                        if (res.statusCode === 200 || res.statusCode === 401) {
                            resolve({ addAsEllvis: true })
                        }
                        if (res.statusCode === 404 || res.statusCode === 405) {
                            resolve({ addAsLegacy: true })
                        }
                        else {
                            resolve({ addAsLegacy: true })
                        }
                    } catch (err) {
                        resolve({ addAsLegacy: true });
                    }
                });
            });
            if (resData.Password == false) {
                // checkLogoutCount = true;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info(`try to login ellvis again after password getting false, ${req.ip}`);
                }
                let currEllvis = await customerDeviceModel.findOne({ IP: req.ip });
                let authToken = currEllvis ? currEllvis.AuthToken : '';
                let ssl: any = await SETTINGSModel.find({})
                if (ssl.length > 0) {
                    ssl = ssl[0].HttpHttps
                }
                else {
                    ssl = "http"
                }
                let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_LOGOUT;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `try to logout ellvis with old token, ${req.ip}`);
                }

                let options = {
                    method: "POST",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + authToken
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                let resData: any = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        try {
                            resolve(JSON.parse(res.body));
                        } catch (err) {
                            resolve({ message: "Internal Server Error" });
                        }
                    });
                });
                if (resData == 'success') {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "success" }, { url: _url }, `try to login ellviss individualey, ${req.ip}`);
                    }
                    this.LoginIndividual(req);
                }
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `ellviss response, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `ellviss response, ${req.ip}`);
            }
            return null;
        }
    }

    private getBearerTokenbyUsernamePasswordIndividual = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_LOGIN;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `login for ellviss individual by token,user name and password, ${req.ip}`);
            }
            let options = {
                method: "POST",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve({ DonotAdd: true });
                    try {
                        if (res.statusCode === 200) {
                            resolve({ Password: true, ...JSON.parse(res.body) })
                        }
                        else if (res.statusCode === 401) {
                            resolve({ Password: false })
                        }
                        else if (res.statusCode === 405) {
                            resolve({ IsLegacy: true })
                        }
                        else {
                            resolve({ DonotAdd: true })
                        }
                    } catch (err) {
                        resolve({ message: "Internal Server Error" });
                    }
                });
            });

            if (resData.Password == false) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info(`login again agter getting password false, ${req.ip}`);
                }
                // checkLogoutCount = true;    
                let currEllvis = await customerDeviceModel.findOne({ IP: req.ip });
                let authToken = currEllvis ? currEllvis.AuthToken : '';
                let ssl: any = await SETTINGSModel.find({})
                if (ssl.length > 0) {
                    ssl = ssl[0].HttpHttps
                }
                else {
                    ssl = "http"
                }
                let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_LOGOUT;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `logout ellviss, ${req.ip}`);
                }
                let options = {
                    method: "POST",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + authToken,
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                let resData: any = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        try {
                            resolve(JSON.parse(res.body));
                        } catch (err) {
                            resolve({ message: "Internal Server Error" });
                        }
                    });
                });
                if (resData == 'success') {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ responseData: "success" }, `if ressData success then login ellviss individual, ${req.ip}`);
                    }
                    this.LoginIndividual(req);
                }
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `successfulley login ellviss, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            return null;
        }
    }

    private getBearerTokenbyUsernamePassword = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_LOGIN;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `login ellviss, ${req.ip}`);
            }
            let options = {
                method: "POST",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    try {
                        resolve(JSON.parse(res.body));
                    } catch (err) {
                        resolve({ message: "Internal Server Error" });
                    }
                });
            });

            if (resData.Password == false) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info(`login ellviss again after getting password false, ${req.ip}`);
                }
                // checkLogoutCount = false; 
                let currEllvis = await customerDeviceModel.findOne({ IP: req.ip });
                let authToken = currEllvis ? currEllvis.AuthToken : '';
                let ssl: any = await SETTINGSModel.find({})
                if (ssl.length > 0) {
                    ssl = ssl[0].HttpHttps
                }
                else {
                    ssl = "http"
                }
                let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_LOGOUT;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `logout ellviss, ${req.ip}`);
                }

                let options = {
                    method: "POST",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + authToken,
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                let resdata: any = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        try {
                            resolve(JSON.parse(res.body));
                        } catch (err) {
                            resolve({ message: "Internal Server Error" });
                        }
                    });
                });
                if (resdata == 'success') {
                    this.LoginIndividual(req);

                }
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: "success" }, `logout ellviss successfully, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in ellviss login, ${req.ip}`);
            }
            return null;
        }
    }


    public CreateContainer = async (req: any) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.ip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let containers: ContainersStreamStats[] = await containerStreamStatsModel.find({ deviceip: req.ip })
            //  let networksettings : any = await networkSettingsModel.findOne({deviceip:req.ip})
            if (req.sourcePort !== "" && req.sourcePort !== undefined && req.sourcePort !== null) {
                for (let i = 0; i < containers.length; i++) {
                    if (containers[i].sourceAdapter === req.sourceAdapter) {
                        for (let j = 0; j < i; j++) {
                            if (containers[i].Id === req.Id)
                                continue
                            if (containers[i].sourcePort === req.sourcePort) {
                                return { message: "This adapter with the given Source port is already in use" };
                            }
                        }
                    }
                    if (containers[i].sourceAdapter === req.destAdapter) {
                        for (let j = 0; j < i; j++) {
                            if (containers[i].Id === req.Id)
                                continue
                            if (containers[i].sourcePort === req.destPort) {
                                return { message: "This adapter with the given Destination port is already in use" };
                            }
                        }
                    }
                }
            }
            if (req.destPort !== "" && req.destPort !== undefined && req.destPort !== null) {
                for (let i = 0; i < containers.length; i++) {
                    if (containers[i].destAdapter === req.sourceAdapter) {
                        for (let j = 0; j < i; j++) {

                            if (containers[i].destPort === req.sourcePort) {
                                return { message: "The interface with the given Source Port is already in use" };
                            }
                        }
                    }
                    if (containers[i].destAdapter === req.destAdapter) {
                        for (let j = 0; j < i; j++) {
                            if (containers[i].sourcePort === req.destPort) {
                                return { message: "The interface with the given Destination Port is already in use" };
                            }
                        }
                    }
                }
            }
            const licenceinfos: any = await liceseInfoModel.findOne({ deviceip: req.ip })
            if (licenceinfos === null || licenceinfos === undefined) {
                return { message: "Please enter the data required to make a stream" }
            }

            let sourceCount = 0;
            let destCount = 0;
            for (let i = 0; i < containers.length; i++) {
                if (containers[i].sourceProtocol === req.sourceProtocol) {
                    sourceCount++;
                }
                if (containers[i].destProtocol === req.destProtocol) {
                    destCount++;
                }
            }
            if (req.sourceProtocol === "SRT") {
                if (licenceinfos.licenses["inputSRT"] <= sourceCount) {
                    return { message: "Cant create a container as input SRT is maxed out" }
                }
            }
            if (req.sourceProtocol === "UDP") {
                if (licenceinfos.licenses["inputUDP"] <= sourceCount) {
                    return { message: "Cant create a container as input UDP is maxed out" }
                }
            }
            if (req.destProtocol === "SRT") {
                if (licenceinfos.licenses["outputSRT"] <= destCount) {
                    return { message: "Cant create a container as output SRT is maxed out" }
                }
            }
            if (req.destProtocol === "UDP") {
                if (licenceinfos.licenses["outputUDP"] <= destCount) {
                    return { message: "Cant create a container as output UDP is maxed out" }
                }
            }
            if (req.destProtocol === "HLS" || req.destProtocol === "DASH") {
                if (licenceinfos.licenses["outputHLSandDASH"] <= destCount) {
                    return { message: "Cant create a container" }
                }
            }
            if (req.sourceProtocol === "RTMP") {
                if (licenceinfos.licenses["outputRTMP"] <= destCount) {
                    return { message: "Cant create a container as output RTMP is maxed out" }
                }
            }

            //create container. 
            const requestResult = await this.createContainerbydata(req, data);
            if (requestResult.containerId) {
                try {
                    commonUtil.updateUserReport(req, '')
                    // get created container by id
                    const container = await this.GetContainerbyId(req, data, requestResult.containerId);
                    let streamStats: any = null;
                    try {
                        // get created stream stats by id
                        streamStats = await this.GetStreamStatsbyId(req, data, requestResult.containerId);
                    } catch (err) {
                        // console.log("Stream stats failed")
                        return;
                    }

                    // get device by ip
                    const device: any = await customerDeviceModel.findOne({ IP: req.ip });

                    // prepare model and save
                    await this.SaveContainerStreamStats(container, streamStats ? streamStats[0] : {}, device);

                    if (req?.Id != 0) {
                        // Delete old container by old id
                        await containerStreamStatsModel.deleteOne({ _id: req?.Id })
                    }
                } catch (error) {
                    // console.log(error)
                    return;
                }
            }
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private SaveContainerStreamStats = async (container: any, stats: any, device: any) => {
        try {
            let obj = new containerStreamStatsModel()
            obj.DeviceName = device.DeviceName
            obj.deviceip = device.IP
            obj.Id = container.Id
            obj.CustomerID = device.CustomerID
            obj.RegionID = device.RegionID
            obj.SystemID = device.SystemID
            obj.state = container.state
            obj.comment = container.comment
            obj.qamConfig = container.qamConfig
            obj.interval = container.interval
            obj.ps = container.ps
            obj.contimeo = container.contimeo
            obj.tlpktdrop = container.tlpktdrop
            obj.pbkeylen = container.pbkeylen
            obj.passphrase = container.passphrase
            obj.sourceLatency = container.sourceLatency
            obj.sourceProtocol = container.sourceProtocol
            obj.sourceEncryption = container.sourceEncryption
            obj.sourceTimeout = container.sourceTimeout
            obj.sourceIP = container.sourceIP
            obj.sourcePort = container.sourcePort
            obj.sourceSSMIP = container.sourceSSMIP
            obj.sourceOutgoingPort = container.sourceOutgoingPort
            obj.sourceAdapter = container.sourceAdapter
            obj.sourceTtl = container.sourceTtl
            obj.sourceSrtMode = container.sourceSrtMode
            obj.sourceDropPackets = container.sourceDropPackets
            obj.destProtocol = container.destProtocol
            obj.destIP = container.destIP
            obj.destTtl = container.destTtl
            obj.destPort = container.destPort
            obj.destOutgoingPort = container.destOutgoingPort
            obj.destSrtMode = container.destSrtMode
            obj.destAdapter = container.destAdapter
            obj.destLatency = container.destLatency
            obj.destTimeout = container.destTimeout
            obj.destEncryption = container.destEncryption
            obj.destDropPackets = container.destDropPackets
            obj.destDashSegmentDuration = container.destDashSegmentDuration
            obj.destDashMinUpdatePeriod = container.destDashMinUpdatePeriod
            obj.destDashMinBufferTime = container.destDashMinBufferTime
            obj.destDashSuggestedPresentationDelay = container.destDashSuggestedPresentationDelay
            obj.destDashTimeShiftBufferDepth = container.destDashTimeShiftBufferDepth
            obj.destDashPreservedSegmentsOutsideOfLiveWindow = container.destDashPreservedSegmentsOutsideOfLiveWindow
            obj.destDashSegmentTemplateConstantDuration = container.destDashSegmentTemplateConstantDuration
            obj.destDashDir = container.destDashDir
            obj.destHlsSegmentDuration = container.destHlsSegmentDuration
            obj.destHlsFragmentDuration = container.destHlsFragmentDuration
            obj.destHlsTimeShiftBufferDepth = container.destHlsTimeShiftBufferDepth
            obj.destHlsPreservedSegmentsOutsideOfLiveWindow = container.destHlsPreservedSegmentsOutsideOfLiveWindow
            obj.destHlsEnableIframe = container.destHlsEnableIframe
            obj.destRtmpLocation = container.destRtmpLocation
            obj.inputStream = container.inputStream
            obj.outputStream = container.outputStream
            obj.streamId = stats.Id
            obj.dir = stats.dir
            obj.input = stats.input
            obj.output = stats.output
            obj.streamcomment = stats.streamcomment
            obj.peerIP = container.peerIP
            obj.status = stats.status
            obj.inputStats = stats.inputStats
            obj.outputStats = stats.outputStats
            obj._id = container.Id
            obj.Password = container.Password
            obj.save();
        } catch (error) {
            return;
        }
    }

    private GetContainerbyId = async (req, data, Id: any) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + "/api/stream/" + Id;

            let options = {
                method: "Get",
                url: _url,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + data.accessToken
                },
                strictSSL: false,
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.ip + "/api/stream/" + Id;

                options = {
                    method: "Get",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + data.accessToken
                    },
                    strictSSL: false,
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    });
                });
            }
            return resData;
        } catch (error) {
            return null
        }
    }

    public GetStreamStatsbyId1 = async (req) => {
        try {
            let data: any
            // let stream = await containerStreamStatsModel.findOne({ Id: req.Id })
            let streamEllvis = await customerDeviceModel.findOne({ IP: req.ip })
            if (streamEllvis) {
                data = {
                    accessToken: streamEllvis.AuthToken
                }
            }
            let requestResult = await this.GetStreamStatsbyId(req, data, req.Id)
            if (requestResult) {
                containerStreamStatsModel.updateOne({ Id: req.Id }, { inputStats: requestResult[0].inputStats })
                return {
                    status: "success",
                    message: "Successfully updated stream"
                }
            }
            return {
                status: "failure",
                message: "Unable to refresh Stream"
            }
        } catch (error) {
            return null;
        }
    }

    private GetStreamStatsbyId = async (req, data, Id: any) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + "/api/stream/stats/" + Id;

            let config: any = {
                method: "get",
                url: _url,
                headers: {
                    Authorization: "Bearer " + data.accessToken
                },
                timeout: 15000
            }
            let resData: any = await new Promise((resolve, reject) => {
                axios(config).then((response) => {
                    resolve(response.data)
                }).catch((err) => {
                    resolve(null)
                })
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsCorrect: true, IsPasswordNeeded: false } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.ip + "/api/stream/stats/" + Id;

                config = {
                    method: "get",
                    url: _url,
                    headers: {
                        Authorization: "Bearer " + data.accessToken
                    },
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    axios(config).then((response) => {
                        resolve(response.data)
                    }).catch((err) => {
                        resolve(null)
                    })
                });
            }
            return resData;
        } catch (error) {
            return null;
        }
    }

    private createContainerbydata = async (req, data) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_CREATE_CONTAINER;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `ellvis create container endpoint, ${req.ip}`);
            }

            let options = {
                method: "POST",
                url: _url,
                headers: {
                    Authorization: "Bearer " + data.accessToken,
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    try {
                        return resolve(JSON.parse(res.body));
                    } catch (error) {
                        return resolve(res.body.toString())
                    }
                });
            });
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: "success" }, `ellvis create container successfully, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, ` error occured in ellvis create container, ${req.ip}`);
            }
            return { ack: "0", message: "error occured!!!" }
        }
    }


    public ExportPresets = async (req?: Container) => {

        try {
            const requestResult = await this.ExportPresetsbyIp(req);

            return requestResult;
        } catch (error) {
            return null
        }
    };

    private ExportPresetsbyIp = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_EXPORT_PRESET;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `ellviss export preset, ${req.ip}`);
            }

            let options = {
                method: "GET",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: "success" }, `ellviss export preset success, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in ellviss export preset success, ${req.ip}`);
            }
            return null;
        }
    }

    public ImportPresets = async (req?: ImportPresets) => {
        try {
            var requestResult;
            if (req?.jsonfile) {
                requestResult = await this.ImportPresetsbyFileName(req);
            } else {
                requestResult = await this.ImportPresetsbyIP(req);
            }

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private ImportPresetsbyFileName = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_IMPORT_PRESET + "/" + req.jsonfile;
            let options = {
                method: "GET",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            return resData;
        } catch (error) {
            return null;
        }
    }

    private ImportPresetsbyIP = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_IMPORT_PRESET;
            let options = {
                method: "GET",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            return resData;
        } catch (error) {
            return null;
        }
    }


    public ClearPresetsTBD = async (req?: Container) => {

        try {
            const requestResult = await this.ClearPresetsTBDbyIp(req);
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private ClearPresetsTBDbyIp = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_CLEAR_PRESET;
            let options = {
                method: "GET",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            return resData;
        } catch (error) {
            return null;
        }
    }


    public ShutdownSystem = async (req?: SystemAction) => {

        try {
            const requestResult = await this.ShutdownSystembyAction(req);

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private ShutdownSystembyAction = async (req) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.ip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_SYSTEM_ACTION;
            let options = {
                method: "POST",
                url: _url,
                headers: {
                    Authorization: "Bearer " + data.accessToken,
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    try {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    } catch (error) {
                        resolve(res)
                    }

                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                let ssl: any = await SETTINGSModel.find({})
                if (ssl.length > 0) {
                    ssl = ssl[0].HttpHttps
                }
                else {
                    ssl = "http"
                }
                _url = ssl + "://" + req.ip + secretUtil.ELLVIS_SYSTEM_ACTION;
                options = {
                    method: "POST",
                    url: _url,
                    headers: {
                        Authorization: "Bearer " + data.accessToken,
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        try {
                            if (err) return resolve(null);
                            resolve(JSON.parse(res.body));
                        } catch (error) {
                            resolve(res)
                        }

                    });
                });
            }
            return resData;
        } catch (error) {
            return null;
        }
    }


    public RebootSystem = async (req?: SystemAction) => {

        try {
            const requestResult = await this.RebootSystembyAction(req);

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private RebootSystembyAction = async (req) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.ip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {

                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_SYSTEM_ACTION;
            let options = {
                method: "POST",
                url: _url,
                headers: {
                    Authorization: "Bearer " + data.accessToken,
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    try {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    } catch (error) {
                        resolve(res)
                    }
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.ip + secretUtil.ELLVIS_SYSTEM_ACTION;
                options = {
                    method: "POST",
                    url: _url,
                    headers: {
                        Authorization: "Bearer " + data.accessToken,
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        try {
                            if (err) return resolve(null);
                            resolve(JSON.parse(res.body));
                        } catch (error) {
                            resolve(res)
                        }
                    });
                });
            }
            return resData;
        } catch (error) {
            return null;
        }
    }

    public UpdateSystemTBD = async (req?: SystemAction) => {

        try {
            const requestResult = await this.UpdateSysTBDbyAction(req);

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private UpdateSysTBDbyAction = async (req) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.ip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_SYSTEM_ACTION;
            let options = {
                method: "POST",
                url: _url,
                headers: {
                    Authorization: "Bearer " + data.accessToken,
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    try {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    } catch (error) {
                        resolve(res)
                    }
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.ip + secretUtil.ELLVIS_SYSTEM_ACTION;
                options = {
                    method: "POST",
                    url: _url,
                    headers: {
                        Authorization: "Bearer " + data.accessToken,
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        try {
                            if (err) return resolve(null);
                            resolve(JSON.parse(res.body));
                        } catch (error) {
                            resolve(res)
                        }
                    });
                });
            }
            return resData;
        } catch (error) {
            return null;
        }
    }

    public UpdateSSLTBD = async (req?: Container) => {

        try {
            const requestResult = await this.UpdateSSLTBDbyAction(req);
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private UpdateSSLTBDbyAction = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_SYSTEM_ACTION;
            let options = {
                method: "POST",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            return resData;
        } catch (error) {
            return null;
        }
    }

    public ResetSystem = async (req?: SystemAction) => {

        try {
            const requestResult = await this.ResetSystembyAction(req);
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private ResetSystembyAction = async (req) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.ip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_SYSTEM_ACTION;
            let options = {
                method: "POST",
                url: _url,
                headers: {
                    Authorization: "Bearer " + data.accessToken,
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    try {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    } catch (error) {
                        resolve(res)
                    }
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ responData: resData }, `if token is invalid login again and fetch the new token, ${req.ip}`);
                }
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.ip + secretUtil.ELLVIS_SYSTEM_ACTION;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `ellvis system action, ${req.ip}`);
                }
                options = {
                    method: "POST",
                    url: _url,
                    headers: {
                        Authorization: "Bearer " + data.accessToken,
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        try {
                            if (err) return resolve(null);
                            resolve(JSON.parse(res.body));
                        } catch (error) {
                            resolve(res)
                        }
                    });
                });
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `success, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception, ${req.ip}`);
            }
            return null;
        }
    }
    //-------------------------DeleteContainer

    public DeleteContainer = async (req: Container) => {

        //create container.
        try {
            const requestResult = await this.DeleteContainerbyId(req);
            if (requestResult !== null) {
                commonUtil.updateUserReport(req, '')
                await containerStreamStatsModel.deleteOne({ _id: req?.Id })
            }

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private DeleteContainerbyId = async (req) => {

        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.ip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }

            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }

            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_DELETE_CONTAINER + req.Id;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `ellviss delete container with id, ${req.ip}`);
            }

            let options = {
                method: "DELETE",
                url: _url,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + data.accessToken
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.ip + secretUtil.ELLVIS_DELETE_CONTAINER + req.Id;

                options = {
                    method: "DELETE",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + data.accessToken
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    });
                });
            }
            return resData;
        } catch (error) {
            return null;
        }
    }


    //-------------------------StartContainer

    public StartContainer = async (req?: Container) => {

        //create container.
        try {
            const requestResult = await this.StartContainerbyId(req);
            if (requestResult === "Stream successfully created!") {
                await containerStreamStatsModel.updateOne({ _id: req?.Id }, { $set: { state: "running", status: "connected", MailStatus: "connected" } }, {
                    new: true
                }, (err) => {
                    if (err) return;
                })
            }
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private StartContainerbyId = async (req) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.ip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_START_CONTAINER + req.Id;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `start ellvis container wit Id, ${req.ip}`);
            }

            let options = {
                method: "GET",
                url: _url,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + data.accessToken,
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: resData.status }, { url: _url }, `login again if getting error from endPoint, ${req.ip}`);
                }
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.ip + secretUtil.ELLVIS_START_CONTAINER + req.Id;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `start ellvis container again after getting authToken, ${req.ip}`);
                }

                options = {
                    method: "GET",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + data.accessToken,
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    });
                });
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `successfully start container with id, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in start container with id, ${req.ip}`);
            }
            return null;
        }
    }
    //-------------------------Stop Contaioner

    public StopContainer = async (req?: Container) => {

        //create container.
        try {
            const requestResult = await this.StopContainerbyId(req);
            if (requestResult === req?.Id) {
                await containerStreamStatsModel.updateOne({ _id: req?.Id }, { $set: { state: "exited", status: "not running", MailStatus: "not running" } }, {
                    new: true
                }, (err) => {
                    if (err) return;
                })
            }
            return requestResult;
        } catch (error) {
            return null;
        }
    };


    private StopContainerbyId = async (req) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.ip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }

            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_STOP_CONTAINER + req.Id;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `stop ellvis container by id, ${req.ip}`);
            }

            let options = {
                method: "GET",
                url: _url,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + data.accessToken,
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: resData }, `login ellvis for auth token if not, ${req.ip}`);
                }

                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.ip + secretUtil.ELLVIS_STOP_CONTAINER + req.Id;
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `stop ellvis container again by id, ${req.ip}`);
                }

                options = {
                    method: "GET",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + data.accessToken,
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    });
                });
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, { url: _url }, `stop ellvis container by id successfully, ${req.ip}`);
            }

            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in stop ellvis container by id, ${req.ip}`);
            }
            return null;
        }
    }

    //------------------------- upload presets

    public UploadPresetsTBD = async (req?: Container) => {

        //create container.
        try {
            const requestResult = await this.UploadPresetsTbdbyIp(req);

            return requestResult;
        } catch (error) {
            return null;
        }
    };
    private UploadPresetsTbdbyIp = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_UPLOAD_TBD;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `upload preset tbd by ip, ${req.ip}`);
            }

            let options = {
                method: "GET",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `upload preset tbd by ip, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `upload preset tbd by ip, ${req.ip}`);
            }
            return null;
        }
    }

    public DownloadPresetsTBD = async (req?: Container) => {

        //create container.
        try {
            const requestResult = await this.DownloadPresetsTbdbyIp(req);

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private DownloadPresetsTbdbyIp = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_DOWNLOAD_TBD;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `ellviss download tbd, ${req.ip}`);
            }

            let options = {
                method: "GET",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `ellviss download tbd with response, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in ellviss download tbd, ${req.ip}`);
            }
            return null;
        }
    }

    public EnableDisableSSH = async (req?: Container) => {

        //create container.
        try {
            const requestResult = await this.EnableDisableSshByIp(req);

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private EnableDisableSshByIp = async (req) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_DOWNLOAD_TBD;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `ellviss download tbd enable disable ssh by ip, ${req.ip}`);
            }

            let options = {
                method: "POST",
                url: _url,
                headers: {
                    "Content-Type": "application/json"
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    try {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    } catch (error) {
                        return resolve(null)
                    }
                });
            });
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: resData.status }, `ellviss download tbd enable disable ssh by ip with response, ${req.ip}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in ellviss download tbd enable disable ssh by ip, ${req.ip}`);
            }
            return null;
        }
    }

    public ChangeIpAddresses = async (req: NetworkSettings) => {
        try {
            let requestResult = await this.ChangeIpByData(req)
            return requestResult
        } catch (error) {
            return null;
        }
    }

    private ChangeIpByData = async (req: any) => {
        try {
            let data: any
            let device = await customerDeviceModel.findOne({ IP: req.deviceip })
            if (device?.AuthToken) {
                req.AuthToken = device.AuthToken
            }
            if (device?.Password) {
                req.Password = device.Password
            }
            if (device?._id) {
                req._id = device._id
            }
            if (req.AuthToken) {
                data = {
                    accessToken: req.AuthToken
                }
            }
            else {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
            }

            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }

            let _url = ssl + "://" + req.deviceip + secretUtil.ELLVIS_NETWORK_SETTINGS;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `change ip by data, ${req.IP}`);
            }

            let options = {
                method: "GET",
                url: _url,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + data.accessToken,
                },
                strictSSL: false,
                body: JSON.stringify(req),
                timeout: 5000
            }
            let resData: any = await new Promise((resolve, reject) => {
                request(options, (err, res) => {
                    if (err) return resolve(null);
                    resolve(JSON.parse(res.body));
                });
            });
            if ((resData === null || resData.error) && req.AuthToken) {
                data = await this.Login({ "username": secretUtil.ELLVIS_USERNAME, "password": req.Password, "ip": req.ip })
                if (data) {
                    if (data.accessToken) {
                        customerDeviceModel.updateOne({ _id: req._id }, { $set: { AuthToken: data.accessToken, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else {
                    customerDeviceModel.updateOne({ _id: req._id }, { $set: { IsCorrect: false, IsPasswordNeeded: true }, $unset: { Password: 1, AuthToken: 1 } })
                }
                _url = ssl + "://" + req.deviceip + secretUtil.ELLVIS_NETWORK_SETTINGS;

                options = {
                    method: "GET",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + data.accessToken,
                    },
                    strictSSL: false,
                    body: JSON.stringify(req),
                    timeout: 5000
                }
                resData = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        resolve(JSON.parse(res.body));
                    });
                });
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: "success" }, `change ip by data response, ${req.IP}`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in change ip by data, ${req.IP}`);
            }
            return null
        }
    }

    public VerifyPassword = async (ip, password) => {
        try {
            let requestResult = await this.LoginIndividual({ ip: ip, username: secretUtil.ELLVIS_USERNAME, password: password })
            return requestResult;
        } catch (error) {
            return null;
        }
    }
    public getLicenses = async (req) => {
        try {
            let requestResult: any = await licenseCheckModel.find({}).catch((err) => console.log(err));
            if (requestResult.length >= 1) {
                requestResult = requestResult[0]["SlugStatus"];
            } else { requestResult = '' }

            return { output: requestResult };
        } catch (error) {
            return { output: '' };
        }
    }
    public chekKeylok = async (req) => {
        try {
            let requestResult = await licenseCheckModel.findOne({}).catch((err) => console.log(err));
            return { output: requestResult };
        } catch (error) {
            return null;
        }
    }
    public SetHotBackupForEllvis = async (req) => {
        try {
            await customerDeviceModel.updateOne({ IP: req.ip }, { hotBackup: req.isChecked });
        } catch (error) {
            return error;
        }
    }
}

export const ellvisServicesV1 = new EllvisServicesV1();