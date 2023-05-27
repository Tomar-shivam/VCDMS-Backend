import { secretUtil } from '../../../utils/secretutil';
import request from 'request';
import { ReqEncoderschemas, ReqEncoderStartStop } from '../../../routes/v1/encoder/encoderschema';
import { containerStreamStatsModel } from '../../../models/global/containerstreamstatsmodel';
import { encoderModel } from '../../../models/global/encodermodel';
import { SETTINGSModel } from '../../../models/customer/settingsmodel';
import { customerDeviceModel, CustomerDevice } from '../../../models/ellvis/customerdevice.model';
import fs from 'fs';
import axios from 'axios';
import { commonUtil } from '../../../utils/commonUtil';
import path from 'path';
import logging from "../../../logging";
import { HotbackupIpListModel } from "../../../models/backup/backupIpList";
import { alarmsReportingModel } from "../../../models/reporting/alarmsmodel";
import { SMTPModel } from '../../../models/customer/smtpmodel';
import { customerServicesV1 } from '../customer/customerservicesv1';
import { regionModel } from '../../../models/region/region.model';
import { systemModel } from '../../../models/region/system.model';
import { encoderControllerV1 } from '../../../controllers/v1/encoder/encodercontrollerv1';
import app from '../../../app';
import { exec } from 'child_process';
const fsRead = require('fs/promises');

const FormData = require('form-data')
let EllvisModel = secretUtil.Ellvis;
let statusHitCount: any = {}
class EncoderServicesV1 {
    private sessionId = {

    }
    public GetEncoderProperties = async (req: ReqEncoderschemas) => {
        //Request currently set properties of encoder. 
        const requestResult = await this.GetProperties(req);
        return requestResult;
    };

    public sessionGetterForReq = async (req: ReqEncoderschemas) => {
        let session = ""
        if (req.session) {
            session = req.session
            if (session !== "" && session !== "---") {
                containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { Password: req.password, IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: true, AuthToken: session } }, { new: true }, (err) => {
                    if (err) return;
                })
                encoderModel.updateOne({ peerIP: req.ip }, { $set: { Password: req.password, AuthToken: session, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                    if (err) return;
                })
                customerDeviceModel.updateMany({ IP: req.ip }, { $set: { Password: req.password, AuthToken: session, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                    if (err) return;
                })
            }
        }
        else if (req.password) {
            let data: any = await this.RequestLogin(req.password, req.ip)
            if (data) {
                if (data.status === "success") {
                    if (data.session.id !== "---") {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                    else {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else if (data.IsEncoderNeeded === false) {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: false, IsCorrect: true }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return
                    })
                }
                else {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
            } else {
                containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
            }
        } else {
            let data: any = await this.RequestLoginWithoutPassword(req.ip)
            if (data) {
                if (data.status === "success") {
                    if (data.session.id !== "---") {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                    else {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else if (data.IsEncoderNeeded === false) {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: false, IsCorrect: true }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
                else {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                        //Updated container stream stats
                    })
                    encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                        //Updated encoder model with auth
                    })
                    customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                        //Updated customer device model
                    })
                }
            } else {
                containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
            }
        }
        return session;
    }

    public sessionGetterForDeviceEncoderAdd = async (req: ReqEncoderschemas) => {
        let session = ""
        if (req.session) {
            session = req.session
            containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { Password: req.password, IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: true, AuthToken: session } }, { new: true }, (err) => {
                if (err) return;
            })
            encoderModel.updateOne({ peerIP: req.ip }, { $set: { Password: req.password, AuthToken: session, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                if (err) return;
            })
            customerDeviceModel.updateMany({ IP: req.ip }, { $set: { Password: req.password, AuthToken: session, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                if (err) return;
            })

        }
        else if (req.password) {
            let data: any = await this.RequestLogin(req.password, req.ip)
            if (data) {
                if (data.status === "success") {
                    if (data.session.id !== "---") {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                    else {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return
                        })
                    }
                } else if (data.checkForEllvis === true) {
                    return data;
                }
                else if (data.IsEncoderNeeded === false) {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                        //Updated container stream stats with no encoder
                    })
                    encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: false, IsCorrect: true }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return
                        //Updated encoder model with auth
                    })

                }
                else {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
            } else {
                containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return
                })
                customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return
                })
            }
            return data;
        } else {
            let data: any = await this.RequestLoginWithoutPassword(req.ip)
            if (data) {
                if (data.status === "success") {
                    if (data.session.id !== "---") {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: true, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: true, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: true, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return
                        })
                    }
                    else {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else if (data.checkForEllvis === true) {
                    return data;
                } else if (data.IsEncoderNeeded === false) {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: false, IsCorrect: true }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
                else {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
            } else {
                containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
            }
            return data;
        }
        return session;
    }

    public SessionGetterForDeviceEncoderAddFromDiscoveredStream = async (req: ReqEncoderschemas) => {
        let session = ""
        if (req.session) {
            session = req.session
            containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { Password: req.password, IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: true, AuthToken: session } }, { new: true }, (err) => {
                if (err) return;
            })
            encoderModel.updateMany({ peerIP: req.ip }, { $set: { Password: req.password, AuthToken: session, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                if (err) return;
            })
            customerDeviceModel.updateMany({ IP: req.ip }, { $set: { Password: req.password, AuthToken: session, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                if (err) return;
            })

        }
        else if (req.password) {
            let data: any = await this.RequestLogin(req.password, req.ip)
            if (data) {
                if (data.status === "success") {
                    if (data.session.id !== "---") {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateMany({ peerIP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        data["ispassneeded"] = false;
                    }
                    else {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateMany({ peerIP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        data["ispassneeded"] = false;
                    }
                } else if (data.checkForEllvis === true) {
                    return data;
                }
                else if (data.IsEncoderNeeded === false) {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateMany({ peerIP: req.ip }, { $set: { IsPasswordNeeded: false, IsCorrect: true }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    data["ispassneeded"] = false;
                }
                else {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateMany({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    data["ispassneeded"] = true;
                }
            } else {
                containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                encoderModel.updateMany({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                data["ispassneeded"] = true;
            }
            return data;
        } else {
            let data: any = await this.RequestLoginWithoutPasswordFromDiscoveredStream(req.ip)
            if (data) {
                if (data.status === "success") {
                    if (data.session.id !== "---") {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: false, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateMany({ peerIP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { Password: req.password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        data["ispassneeded"] = false;
                    }
                    else {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateMany({ peerIP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: req.ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        data["ispassneeded"] = false;
                    }
                } else if (data.checkForEllvis === true) {
                    return data;
                } else if (data.IsEncoderNeeded === false) {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                        else console.log("Updated container stream stats with no encoder")
                    })
                    encoderModel.updateMany({ peerIP: req.ip }, { $set: { IsPasswordNeeded: false, IsCorrect: true }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                        else console.log("Updated encoder model with auth")
                    })
                    data["ispassneeded"] = false;
                }
                else {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    if (data.addAsLegacy == false) {
                        encoderModel.updateMany({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                    customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    data["ispassneeded"] = true;
                }
            } else {
                containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                if (data.addAsLegacy == false) {
                    encoderModel.updateMany({ peerIP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
                customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                data["ispassneeded"] = true;
            }
            return data;
        }
        return session;
    }

    public getSessionAfterFailure = async (req: ReqEncoderschemas) => {
        if (req.session) {
            containerStreamStatsModel.updateMany({ peerIP: { $regex: req.ip } }, { $set: { IsPasswordNeeded: false, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                if (err) return;
            })
            encoderModel.updateOne({ peerIP: req.ip }, { $set: { IsPasswordNeeded: false, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                if (err) return;
            })
            customerDeviceModel.updateMany({ IP: req.ip }, { $set: { IsPasswordNeeded: false, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                if (err) return;
            })
        }
    }

    public getSessionAfterFailureEncoder = async (encoder, ip) => {
        if (encoder.AuthToken) {
            containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                if (err) return;
            })
            customerDeviceModel.updateMany({ IP: ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                if (err) return;
            })
            await encoderModel.updateOne({ peerIP: ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                if (err) return;
            })
        }
    }

    public getSessionWithoutReq = async (encoder: any, ip: any) => {
        let session = "";
        if (encoder.IsPasswordNeeded && encoder.AuthToken) {
            session = encoder.AuthToken
        }
        else if (encoder.Password) {
            let data: any = await this.RequestLogin(encoder.Password, ip)
            if (data) {
                if (data.status === "success") {
                    if (data.session.id !== "---") {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { Password: encoder.Password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: ip }, { $set: { Password: encoder.Password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: ip }, { $set: { Password: encoder.Password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                    else {
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else if (data.IsEncoderNeeded === false) {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: ip }, { $set: { IsPasswordNeeded: false, IsCorrect: true }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) console.log(err)
                    })
                    customerDeviceModel.updateMany({ IP: ip }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
                else {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    customerDeviceModel.updateMany({ IP: ip }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
            } else {
                containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                encoderModel.updateOne({ peerIP: ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                customerDeviceModel.updateMany({ IP: ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
            }
        } else {
            let data: any = await this.RequestLoginWithoutPassword(ip)
            if (data) {
                if (data.status === "success") {
                    if (data.session.id !== "---") {
                        session = data.session.id;
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { Password: encoder.Password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: ip }, { $set: { Password: encoder.Password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: ip }, { $set: { Password: encoder.Password, AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                    else {
                        containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true, IsEncoderNeeded: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        encoderModel.updateOne({ peerIP: ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                        customerDeviceModel.updateMany({ IP: ip }, { $set: { AuthToken: data.session.id, IsPasswordNeeded: false, IsCorrect: true } }, { new: true }, (err) => {
                            if (err) return;
                        })
                    }
                } else if (data.IsEncoderNeeded === false) {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: ip }, { $set: { IsPasswordNeeded: false, IsCorrect: true }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    customerDeviceModel.updateMany({ IP: ip }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
                else {
                    containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    encoderModel.updateOne({ peerIP: ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                    customerDeviceModel.updateMany({ IP: ip }, { $set: { IsCorrect: true, IsPasswordNeeded: false, IsEncoderNeeded: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                        if (err) return;
                    })
                }
            } else {
                containerStreamStatsModel.updateMany({ peerIP: { $regex: ip } }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                encoderModel.updateOne({ peerIP: ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
                customerDeviceModel.updateMany({ IP: ip }, { $set: { IsPasswordNeeded: true, IsCorrect: false }, $unset: { AuthToken: 1 } }, { new: true }, (err) => {
                    if (err) return;
                })
            }
        }
        return session;
    }

    private GetProperties = async (req: ReqEncoderschemas) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ENCODER_DEVICE_PROPERTIES_PATH
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `endpoint ${secretUtil.ENCODER_DEVICE_PROPERTIES_PATH} getting properties for ${req.ip}`);
            }
            let session = await this.sessionGetterForReq(req);
            if (session !== "" && session !== "---") {
                _url += `?session=${session}`
            }
            let options = {
                method: 'GET',
                url: _url,
                headers: {
                    "Content-Type": 'application/json'
                },
                strictSSL: false,
                timeout: 5000
            }

            let resData: any = await new Promise((resolve, reject) => {
                try {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        try {
                            return resolve(JSON.parse(res.body));
                        } catch (error) {
                            return resolve(res.body.toString())
                        }
                    });
                } catch (error) {
                    return resolve({
                        ack: "0"
                    })
                }

            });
            if (resData.status === "failure" && req.session) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "failure" }, `for ${req.ip} failure to get properties`);
                }
                this.getSessionAfterFailure(req);
                let newreq: any = new ReqEncoderschemas();
                newreq = req;
                newreq.session = undefined;
                return await this.GetProperties(newreq);
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: "success" }, `for ${req.ip} get properties successfully`);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `for ${req.ip} exception to get properties`);
            }
            return {
                ack: "0"
            }
        }
    };
    public GetPropertiesEncoder = async (req: ReqEncoderschemas) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ENCODER_DEVICE_PROPERTIES_PATH
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `getting encoder properties for ${req.ip}`);
            }
            let session = await this.sessionGetterForReq(req);
            if (session !== "" && session !== "---") {
                _url += `?session=${session}`
            }
            let options = {
                method: 'GET',
                url: _url,
                headers: {
                    "Content-Type": 'application/json'
                },
                strictSSL: false
            }

            let resData: any = await new Promise((resolve, reject) => {
                try {
                    request(options, (err, res) => {
                        if (err) return resolve(null);
                        try {
                            return resolve(JSON.parse(res.body));
                        } catch (error) {
                            return resolve(res.body.toString())
                        }
                    });
                } catch (error) {
                    return resolve({
                        ack: "0"
                    })
                }

            });
            if (resData.status === "failure" && req.session) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "failure" }, { url: _url }, `failure to get encoder properties for ${req.ip}`);
                }

                this.getSessionAfterFailure(req);
                let newreq: any = new ReqEncoderschemas();
                newreq = req;
                newreq.session = undefined;
                return await this.GetProperties(newreq);
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception to get encoder properties for ${req.ip}`);
            }
            return {
                ack: "0"
            }
        }
    };

    public GetEncoderStatus = async (req: ReqEncoderschemas, manual: any) => {

        //Request current status of encoder. 
        try {
            const requestResult = await this.GetStatus(req, manual);

            return requestResult;
        } catch (error) {
            return null;
        }
    };

    private GetStatus = async (req: ReqEncoderschemas, manual: any) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + req.ip + secretUtil.ENCODER_DEVICE_STATUS_PATH
            if (secretUtil.ENABLE_DEBUG_LOG) {
                if (manual === 'manual') {
                    logging.logger.info({ type: 'getting encoder status manually refresh' }, { url: _url }, `getting status for ${req.ip} device`);
                } else {
                    logging.logger.info({ type: 'getting encoder status by crone' }, { url: _url }, `getting status for ${req.ip} device`);
                }
            }

            let session = await this.sessionGetterForReq(req);
            if (session !== "" && session !== "---") {
                _url += `?session=${session}`
            }

            let options = {
                method: 'GET',
                url: _url,
                headers: {
                    "Content-Type": 'application/json'
                },
                strictSSL: false,
                timeout: 5000
            }

            let resData: any = await new Promise((resolve, reject) => {
                try {
                    request(options, (err, res) => {
                        if (res && res.statusCode && (res.statusCode === 503 || res.statusCode === 400)) {
                            resolve({ ack: "503" });
                        }
                        if (err) return resolve(null);
                        try {
                            return resolve(JSON.parse(res.body));
                        } catch (error) {
                            return resolve(res.body.toString())
                        }

                    });
                } catch (err) {
                    return resolve({
                        ack: "0"
                    })
                }

            });
            if (resData.status === "failure" && req.session) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "failure" }, `failure to get status for ${req.ip} encoder`);
                }
                this.getSessionAfterFailure(req);
                let newreq: any = new ReqEncoderschemas();
                newreq = req;
                newreq.session = undefined;
                return await this.GetStatus(newreq, manual);
            }
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ status: "success" }, `get status for ${req.ip} encoder`);
            }
            return resData;
        } catch (err) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: err }, `to get status for ${req.ip} encoder`);
            }
            return {
                ack: "0"
            }
        }
    };

    public StartEncoding = async (req?: ReqEncoderStartStop) => {

        //Request to start encoding. 
        try {
            const requestResult = await this.StartEncoderEncoding(req?.ip, req?.startType);
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    public StartEncoderEncoding = async (ip: any, startType: any) => {
        let endPoint = startType == "" ? secretUtil.ENCODER_DEVICE_START_PATH : secretUtil.ENCODER_DEVICE_RTSP_START_PATH;
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + endPoint
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `${endPoint}, start encoder`);
            }
            let encoder = await encoderModel.findOne({ peerIP: ip })
            if (encoder) {
                let session = await this.getSessionWithoutReq(encoder, ip);
                if (session !== "" && session !== "---") {
                    _url += `?session=${session}`;
                }
            }

            try {
                //let data = ``

                let options = {
                    method: 'POST',
                    url: _url,
                    headers: {
                        "Content-Type": 'application/json'
                    },
                    strictSSL: false
                    //body: data

                }

                let resData: any = await new Promise((resolve, reject) => {
                    try {
                        request(options, (err, res) => {
                            try {
                                if (err) throw err;
                                resolve(JSON.parse(res.body));
                            } catch (error) {
                                return resolve(null)
                            }

                        });
                    } catch (error) {
                        return resolve(null)
                    }

                });

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "failure" }, { url: _url }, `${ip}, failure to start encoder`);
                    }

                    if (encoder) {
                        if (encoder.AuthToken) {
                            await this.getSessionAfterFailureEncoder(encoder, ip);
                            let startTypeData = startType != '' ? startType : '';
                            return await this.StartEncoderEncoding(ip, startTypeData);
                        }
                    }
                    else {
                        return resData
                    }
                }
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "success" }, `${ip}, encoder started`);
                }
                return resData;
            } catch (error) {

                return null
            }
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `${ip},exception in encoder starting`);
            }
            return null;
        }
    }

    public StopEncoding = async (req?: ReqEncoderStartStop, startType?: ReqEncoderStartStop) => {
        //Request to stop encoding. 
        try {
            const requestResult = await this.StopEncoderEncoding(req?.ip, req?.startType);
            return requestResult;
        } catch (error) {
            return null;
        }
    };

    public StopEncoderEncoding = async (ip: any, startType: any) => {
        let stopEndPoint = startType == "" ? secretUtil.ENCODER_DEVICE_STOP_PATH : secretUtil.ENCODER_DEVICE_RTSP_STOP_PATH;
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + stopEndPoint
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `${ip}, stop encoder`);
            }

            let encoder = await encoderModel.findOne({ peerIP: ip })
            if (encoder) {
                let session = await this.getSessionWithoutReq(encoder, ip);
                if (session !== "" && session !== "---") {
                    _url += `?session=${session}`;
                }
            }

            try {
                //let data = ``

                let options = {
                    method: 'POST',
                    url: _url,
                    headers: {
                        "Content-Type": 'application/json'
                    },
                    strictSSL: false
                    //body: data

                }

                let resData: any = await new Promise((resolve, reject) => {
                    try {
                        request(options, (err, res) => {
                            try {
                                if (err) throw err;
                                resolve(JSON.parse(res.body));
                            } catch (error) {
                                resolve(null)
                            }

                        });
                    } catch (error) {
                        return resolve(null)
                    }

                });

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "failure" }, { url: _url }, `${ip}, failure to stop encoder`);
                    }
                    if (encoder) {
                        if (encoder.AuthToken) {
                            await this.getSessionAfterFailureEncoder(encoder, ip);
                            let startTypeData = startType != '' ? startType : '';
                            return await this.StopEncoderEncoding(ip, startTypeData);
                        }
                    }
                    else {
                        return resData
                    }
                }
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "stopped" }, { url: _url }, `${ip}, encoder stopped`);
                }
                return resData;
            } catch (error) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ exception: error }, `${ip}, encoder stopped`);
                }
                return null
            }
        } catch (error) {
            return null;
        }
    }

    public SetName = async (_devicename, ip) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_SET_DEVICENAME_PATH;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `${ip}, set device name`);
            }
            let encoder = await encoderModel.findOne({ peerIP: ip })
            if (encoder) {
                let session = await this.getSessionWithoutReq(encoder, ip);
                if (session !== "" && session !== "---") {
                    _url += `?session=${session}`;
                }
            }

            try {
                let options = {
                    method: 'POST',
                    url: _url,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({ devicename: _devicename })
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(options, (err, res) => {
                        try {
                            if (err) throw err;
                            resolve(JSON.parse(res.body));
                        } catch (error) {
                            return resolve(null)
                        }

                    })
                })

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "failure" }, { url: _url }, `${ip}, failure to set device name`);
                    }
                    if (encoder) {
                        if (encoder.AuthToken) {
                            await this.getSessionAfterFailureEncoder(encoder, ip);
                            return await this.SetName(_devicename, ip);
                        }
                    }
                    else {
                        return resData
                    }
                }
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "success" }, `${ip}, set device name successfully`);
                }
                return resData
            } catch (err) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ exception: err }, `${ip}, set device name successfully`);
                }
                return null
            }
        } catch (error) {
            return null;
        }
    }

    public LoadPreset = async (_current_enc_preset, ip) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_LOAD_PRESET
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `${ip}, load preset`);
            }
            let encoder = await encoderModel.findOne({ peerIP: ip })
            if (encoder) {
                let session = await this.getSessionWithoutReq(encoder, ip);
                if (session !== "" && session !== "---") {
                    _url += `?session=${session}`;
                }
            }

            try {
                let option = {
                    method: "POST",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({ current_enc_preset: _current_enc_preset }),
                    timeout: 5000
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) throw err;
                            resolve(JSON.parse(res.body));
                        } catch (error) {
                            return resolve(err)
                        }
                    })
                })

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "failure" }, { url: _url }, `${ip}, failure load preset`);
                    }
                    if (encoder) {
                        if (encoder.AuthToken) {
                            await this.getSessionAfterFailureEncoder(encoder, ip);
                            return await this.LoadPreset(_current_enc_preset, ip);
                        }
                    }
                    else {
                        return resData
                    }
                }
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "success" }, `${ip}, load preset successfully`);
                }
                return resData
            } catch (err) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ exception: err }, `${ip},exception in load preset`);
                }
                return null
            }
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `${ip},exception in load preset`);
            }
            return null;
        }
    }

    public UpdatePreset = async (_presetlist: Array<String>, ip) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_UPDATE_PRESET
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `${ip}, update prerset`);
            }
            let encoder = await encoderModel.findOne({ peerIP: ip })
            if (encoder) {
                let session = await this.getSessionWithoutReq(encoder, ip);
                if (session !== "" && session !== "---") {
                    _url += `?session=${session}`;
                }
            }

            try {
                let _body = {}
                for (let i = 0; i < _presetlist.length; i++) {
                    let preset = "preset" + (i + 1).toString()
                    _body[preset] = _presetlist[i];
                }
                let option = {
                    method: "POST",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json",
                    },
                    strictSSL: false,
                    body: JSON.stringify(_body),
                    timeout: 5000
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) throw err;
                            resolve(JSON.parse(res.body));
                        } catch (error) {
                            return resolve(null)
                        }

                    })
                })

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info(`${ip}, failure to update prerset`);
                    }
                    if (encoder) {
                        if (encoder.AuthToken) {
                            await this.getSessionAfterFailureEncoder(encoder, ip);
                            return await this.UpdatePreset(_presetlist, ip);
                        }
                    }
                    else {
                        return resData
                    }

                }
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: resData.status }, `${ip}, update prerset successfully`);
                }
                return resData;
            } catch (err) {
                return null
            }
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `${ip}, exception update prerset`);
            }
            return null;
        }
    }

    public RequestLoginHandler = async (ip) => {
        try {
            let requestResult: any = await this.RequestLogin("4ccf8b34", ip);
            if (requestResult) {
                if (requestResult.status === "success") {
                    this.sessionId[ip] = {
                        session: {
                            id: requestResult.session.id
                        }
                    }
                }
            }
            return requestResult
        } catch (error) {
            return null;
        }

    }


    public RequestLogin = async (_password, ip) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_REQUEST_LOGIN;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `${ip}, encoder login request`);
            }
            try {
                let option = {
                    method: "POST",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({ password: _password }),
                    timeout: 5000

                }

                return new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) throw err;
                            var data_val = res.body.replace(/[\n]/g, "");
                            var data_res = data_val.replace(",}", "}");
                            if (res.statusCode === 401 || res.statusCode === 200)
                                resolve(JSON.parse(data_res));
                            else if (res.statusCode === 404) {
                                resolve({ addAsLegacy: true });
                            }
                            else
                                resolve({ checkForEllvis: true });
                        } catch (error) {
                            return resolve({ checkForEllvis: true })
                        }
                    })
                })
            } catch (err) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ url: _url }, `${err}, error in encoder login request`);
                }
                return null
            }
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `error in encoder login request`);
            }
            return null;
        }
    }

    public RequestLoginWithoutPassword = async (ip) => {
        try {
            let _password = "";
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_REQUEST_LOGIN;
            try {
                let option = {
                    method: "POST",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({ password: _password }),
                    timeout: 5000
                }

                return new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) throw err;
                            var data_val = res.body.replace(/[\n]/g, "");
                            var data_res = data_val.replace(",}", "}");
                            if (res.statusCode === 401 || res.statusCode === 200)
                                resolve(JSON.parse(data_res));
                            else if (res.statusCode === 404) {
                                resolve({ addAsLegacy: true });
                            }
                            else
                                resolve({ checkForEllvis: true });
                        } catch (error) {
                            return resolve({ IsEncoderNeeded: false })
                        }
                    })
                })
            } catch (err) {
                return null
            }
        } catch (error) {
            return null;
        }
    }

    public RequestLoginWithoutPasswordFromDiscoveredStream = async (ip) => {
        try {
            let _password = "";
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_REQUEST_LOGIN;
            try {
                let option = {
                    method: "POST",
                    url: _url,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({ password: _password }),
                    timeout: 5000
                }

                return new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) resolve({ checkForEllvis: true });
                            var data_val = res.body.replace(/[\n]/g, "");
                            var data_res = data_val.replace(",}", "}");
                            if (res.statusCode === 401 || res.statusCode === 200)
                                resolve(JSON.parse(data_res));
                            else if (res.statusCode === 404) {
                                resolve({ addAsLegacy: true });
                            }
                            else
                                resolve({ checkForEllvis: true });
                        } catch (error) {
                            return resolve({ checkForEllvis: true })
                        }
                    })
                })
            } catch (err) {
                return null
            }
        } catch (error) {
            return null;
        }
    }

    public SetLoginProperties = async (_username, _password, ip) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_SET_LOGIN_PROPERTIES
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `encoder set login properties for this ip ${ip}`);
            }
            let encoder = await encoderModel.findOne({ peerIP: ip })
            if (encoder) {
                let session = await this.getSessionWithoutReq(encoder, ip);
                if (session !== "" && session !== "---") {
                    _url += `?session=${session}`;
                }
            }

            try {
                let option = {
                    url: _url,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({ username: _username, password: _password }),
                    timeout: 5000
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) throw err;
                            let data = JSON.parse(res.body);
                            resolve(data);
                        } catch (error) {
                            return resolve(null)
                        }
                    })
                })

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "failure" }, `failure for encoder set login properties for this ip ${ip}`);
                    }
                    if (encoder) {
                        if (encoder.AuthToken) {
                            await this.getSessionAfterFailureEncoder(encoder, ip);
                            return await this.SetLoginProperties(_username, _password, ip);
                        }
                    }
                    else {
                        return resData
                    }

                }
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "success" }, `encoder set login properties for this ip ${ip} successfully`);
                }
                return resData;
            } catch (error) {
                return null
            }
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `encoder set login properties for this ip ${ip} successfully`);
            }
            return null;
        }
    }

    public SetLoginPropertiesForSpareIp = async (_username, _password, ip, spareIpSession) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_SET_LOGIN_PROPERTIES
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `encoder set login properties for this ip ${ip}`);
            }
            if (spareIpSession !== "") {
                if (spareIpSession !== "" && spareIpSession !== "---") {
                    _url += `?session=${spareIpSession}`;
                }
            }

            try {
                let option = {
                    url: _url,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({ username: _username, password: _password }),
                    timeout: 5000
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) throw err;
                            let data = JSON.parse(res.body);
                            resolve(data);
                        } catch (error) {
                            return resolve(null)
                        }
                    })
                })

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "failure" }, `failure for encoder set login properties for this ip ${ip}`);
                    }
                } else {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "success" }, `encoder set login properties for this ip ${ip} successfully`);
                    }
                }

                return resData;
            } catch (error) {
                return null
            }
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `encoder set login properties for this ip ${ip} successfully`);
            }
            return null;
        }
    }

    public SetLcdLoginProperties = async (_lcdpassword, ip) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_SET_LCD_LOGIN_PROPERTIES
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `encoder set LCD Login properties for ${ip}`);
            }
            let encoder = await encoderModel.findOne({ peerIP: ip })
            if (encoder) {
                let session = await this.getSessionWithoutReq(encoder, ip);
                if (session !== "" && session !== "---") {
                    _url += `?session=${session}`;
                }
            }

            try {
                let option = {
                    url: _url,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({ lcdpassword: _lcdpassword }),
                    timeout: 5000
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) throw err;
                            resolve(JSON.parse(res.body));
                        } catch (error) {
                            return resolve(null)
                        }
                    })
                })

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "failure" }, `${ip},failure for encoder set LCD Login properties`);
                    }
                    if (encoder) {
                        if (encoder.AuthToken) {
                            await this.getSessionAfterFailureEncoder(encoder, ip);
                            return await this.SetLcdLoginProperties(_lcdpassword, ip);
                        }
                    }
                    else {
                        return resData
                    }
                }
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "success" }, `encoder set LCD Login properties successfully ${ip}`);
                }
                return resData;
            } catch (err) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ exception: err }, `encoder set LCD Login properties successfully ${ip}`);
                }
                return null
            }
        } catch (error) {
            return null;
        }
    }

    public RequestLogout = async (_session, ip) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_REQUEST_LOGOUT;
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `${ip}, encoder logout request`);
            }
            try {
                let option = {
                    url: _url,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({ session: _session }),
                    timeout: 5000
                }

                return new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) return resolve(null);
                            var data_val = res.body.replace(/[\n]/g, "");
                            var data_res = data_val.replace(",}", "}");
                            resolve(JSON.parse(data_res));
                        } catch (error) {
                            return resolve(null)
                        }
                    })
                })
            } catch (err) {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ exception: err }, `${ip},error encoder logout request`);
                }

                return null;
            }
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `${ip}, error encoder logout request ${error}`);
            }
            return null;
        }
    }

    public RebootDevice = async (ip) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_DEVICE_REBOOT
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `reboot encoder for , ${ip}`);
            }
            let encoder = await encoderModel.findOne({ peerIP: ip })
            if (encoder) {
                let session = await this.getSessionWithoutReq(encoder, ip);
                if (session !== "" && session !== "---") {
                    _url += `?session=${session}`;
                }
            }

            try {
                let option = {
                    url: _url,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    timeout: 5000
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) return resolve(null);
                            resolve(JSON.parse(res.body));
                        } catch (error) {
                            return resolve(null)
                        }
                    })
                })

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "failure" }, { url: _url }, `failure to reboot encoder for , ${ip}`);
                    }
                    if (encoder) {
                        if (encoder.AuthToken) {
                            await this.getSessionAfterFailureEncoder(encoder, ip);
                            return await this.RebootDevice(ip);
                        }
                    }
                    else {
                        return resData
                    }
                }
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "success" }, `reboot encoder successfully for , ${ip}`, { responseData: resData.status });
                }
                return resData
            } catch (err) {
                return null;
            }
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in reboot encoder for , ${ip}`);
            }
            return null;
        }
    }

    public SaveSession = async (req, ip: any) => {
        let reqData = {}
        if (!req.body.data) {
            reqData = req.body;
        } else {
            reqData = req.body.data;
        }

        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_SAVESESSION
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ url: _url }, `save session for, ${ip}`);
            }
            let encoder = await encoderModel.findOne({ peerIP: ip })
            if (encoder) {
                let session = await this.getSessionWithoutReq(encoder, ip);
                if (session !== "" && session !== "---") {
                    _url += `?session=${session}`;
                }
            }


            try {
                let option = {
                    url: _url,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify(reqData),
                    timeout: 5000
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) return resolve(null)
                            var data_val = res.body.replace(/[\n]/g, "");
                            var data_res = data_val.replace(",}", "}");
                            resolve(JSON.parse(data_res));
                        } catch (error) {
                            return resolve(null)
                        }
                    })
                })

                if (resData.status === "failure") {
                    if (secretUtil.ENABLE_DEBUG_LOG) {
                        logging.logger.info({ status: "failure" }, { url: _url }, `failure in save session for, ${ip}`);
                    }
                    if (encoder) {
                        if (encoder.AuthToken) {
                            await this.getSessionAfterFailureEncoder(encoder, ip);
                            return await this.SaveSession(req, ip);
                        }
                    }
                    else {
                        return resData
                    }
                }
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info({ status: "success" }, `save properties successfully for, ${ip}`);
                }
                return resData
            } catch (error) {
                return null
            }
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `save properties successfully for, ${ip}`);
            }
            return null;
        }
    }

    public checkPort = async (req, ip: any) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_SAVESESSION
            let encoder = await encoderModel.findOne({ peerIP: ip })
            let session;
            if (encoder) {
                session = await this.getSessionWithoutReq(encoder, ip);
            }
            let _urlSwitchPort = ssl + "://" + ip + secretUtil.ENCODER_SWITCHPORT;

            try {
                let option = {
                    url: _urlSwitchPort,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({
                        session: session,
                        inputport: req.body["inputport"]
                    }),
                    timeout: 5000
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) return resolve(null)
                            var data_val = res.body.replace(/[\n]/g, "");
                            var data_res = data_val.replace(",}", "}");
                            resolve(JSON.parse(data_res));
                        } catch (error) {
                            return resolve(null)
                        }
                    })
                })

                if (resData.status === "failure") {
                    if (encoder) {
                        if (encoder.AuthToken) {
                            // await this.getSessionAfterFailureEncoder(encoder, ip);
                            // return await this.SaveSession(req, ip);
                        }
                    }
                    else {
                        return resData
                    }
                }
                return resData
            } catch (error) {
                return null
            }
        } catch (error) {
            return null;
        }
    }

    public checkIRcode = async (req, ip: any) => {
        try {
            let ssl: any = await SETTINGSModel.find({})
            if (ssl.length > 0) {
                ssl = ssl[0].HttpHttps
            }
            else {
                ssl = "http"
            }
            let _url = ssl + "://" + ip + secretUtil.ENCODER_SAVESESSION
            let encoder = await encoderModel.findOne({ peerIP: ip })
            let session;
            if (encoder) {
                session = await this.getSessionWithoutReq(encoder, ip);
            }
            let _urlircode = ssl + "://" + ip + secretUtil.ENCODER_SEND_IRCODE;
            try {
                let option = {
                    url: _urlircode,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    strictSSL: false,
                    body: JSON.stringify({
                        session: session,
                        ircode: req.body["ircode"],
                        remotetype: req.body["remotetype"],
                    }),
                    timeout: 5000
                }

                let resData: any = await new Promise((resolve, reject) => {
                    request(option, (err, res) => {
                        try {
                            if (err) return resolve(null)
                            var data_val = res.body.replace(/[\n]/g, "");
                            var data_res = data_val.replace(",}", "}");
                            resolve(JSON.parse(data_res));
                        } catch (error) {
                            return resolve(null)
                        }
                    })
                })

                if (resData.status === "failure") {
                    if (encoder) {
                        if (encoder.AuthToken) {
                            // await this.getSessionAfterFailureEncoder(encoder, ip);
                            // return await this.SaveSession(req, ip);
                        }
                    }
                    else {
                        return resData
                    }

                }

                return resData
            } catch (error) {
                return null
            }
        } catch (error) {
            return null;
        }
    }

    public UpdateFirmware = async (req: any) => {
        let ips = req.body.ipArray.split(",");
        if (req.body.ipArray === "") {
            return { ack: '2', msg: "Please Select Devices" }
        }
        if (!req.files) {
            return { ack: "2", msg: "Please Select a File" };
        }
        if (!fs.existsSync(process.cwd() + "/upload")) {
            fs.mkdirSync(process.cwd() + "/upload", { recursive: true })
        }

        const file = req.files.file;
        let x = await new Promise((resolve, reject) => {
            file.mv(process.cwd() + "/upload/" + file.name, (err) => {
                if (err) {
                    resolve(false);
                }
                else {
                    resolve(true);
                }
            })
        });
        if (!x) {
            return { ack: '2', msg: "Unexpected error occured! Please try again" }
        }
        let stream = fs.createReadStream(process.cwd() + "/upload/" + file.name)
        try {
            let ack = "1";
            let notSucceed: any = [];
            const promises = ips.map(async (ips) => {
                let ip = ips;
                try {
                    let ssl: any = await SETTINGSModel.find({})
                    if (ssl.length > 0) {
                        ssl = ssl[0].HttpHttps
                    }
                    else {
                        ssl = "http"
                    }
                    let _url = ssl + "://" + ip + secretUtil.ENCODER_UPDATEFIRMWARE
                    let encoder = await encoderModel.findOne({ peerIP: ip })
                    if (encoder) {
                        let session = await this.getSessionWithoutReq(encoder, ip);
                        if (session !== "" && session !== "---") {
                            _url += `?session=${session}`;
                        }
                    }
                    let isStop = await this.StopEncoderEncoding(ip, '');
                    if (isStop) {
                        if (isStop.status !== "success") {
                            notSucceed.push(ip);
                            // continue;
                        }
                    }
                    else {
                        notSucceed.push(ip);
                        // continue;
                    }
                    let data = new FormData();
                    data.append("", stream);
                    let config: any = {
                        method: "post",
                        url: _url,
                        headers: {
                            ...data.getHeaders()
                        },
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        data: data,
                        timeout: 600000
                    }
                    let requestResponse: any = await new Promise((resolve, reject) => {
                        axios(config).then((response) => {
                            resolve(response.data);
                        }).catch((error) => {
                            resolve(null);
                        })
                    })
                    if (requestResponse) {
                        if (requestResponse.status !== 'success') {
                            ack = "0"
                            notSucceed.push(ip);
                            // continue;
                        }
                        else {
                            let resData = await this.RebootDevice(ip)
                        }
                    } else {
                        ack = "0"
                        notSucceed.push(ip);
                        // continue;
                    }

                } catch (error) {
                    ack = "0"
                    notSucceed.push(ip);
                    // continue;
                }
            })
            await Promise.all(promises);

            // for (let i = 0; i < ips.length; i++) {

            //     let ip = ips[i];
            //     try {

            //         let ssl: any = await SETTINGSModel.find({})
            //         if (ssl.length > 0) {
            //             ssl = ssl[0].HttpHttps
            //         }
            //         else {
            //             ssl = "http"
            //         }
            //         let _url = ssl + "://" + ip + secretUtil.ENCODER_UPDATEFIRMWARE
            //         let encoder = await encoderModel.findOne({ peerIP: ip })
            //         if (encoder) {
            //             let session = await this.getSessionWithoutReq(encoder, ip);
            //             if (session !== "" && session !== "---") {
            //                 _url += `?session=${session}`;
            //             }
            //         }
            //         let isStop = await this.StopEncoderEncoding(ip, '');
            //         if (isStop) {
            //             if (isStop.status !== "success") {
            //                 notSucceed.push(ip);
            //                 continue;
            //             }
            //         }
            //         else {
            //             notSucceed.push(ip);
            //             continue;
            //         }
            //         let data = new FormData();
            //         data.append("", stream);
            //         let config: any = {
            //             method: "post",
            //             url: _url,
            //             headers: {
            //                 ...data.getHeaders()
            //             },
            //             maxContentLength: Infinity,
            //             maxBodyLength: Infinity,
            //             data: data,

            //         }
            //         let requestResponse: any = await new Promise((resolve, reject) => {
            //             axios(config).then((response) => {
            //                 resolve(response.data);
            //             }).catch((error) => {
            //                 resolve(null);
            //             })
            //         })
            //         if (requestResponse) {
            //             if (requestResponse.status !== 'success') {
            //                 ack = "0"
            //                 notSucceed.push(ip);
            //                 continue;
            //             }
            //             else {
            //              let resData = await this.RebootDevice(ip)
            //              if(resData){
            //                 continue;     
            //              }
            //             }
            //         } else {
            //             ack = "0"
            //             notSucceed.push(ip);
            //             continue;
            //         }

            //     } catch (error) {
            //         ack = "0"
            //         notSucceed.push(ip);
            //         continue;
            //     }

            // }
            if (fs.existsSync(process.cwd() + "/upload/" + file.name)) {
                fs.unlinkSync(process.cwd() + "/upload/" + file.name)
            }
            return { ack: ack, ips: notSucceed }

        } catch (error) {
            return { ack: "0", ips: ips };
        }
    }

    public updatePresetFileOnDeviceIP = async (req: any) => {
        try {
            let deviceIP = req.body.deviceIP;
            let deviceType = req.body.deviceType;
            if (deviceIP === "" || deviceType === "") {
                return { ack: '2', msg: "Please Select Devices" }
            }
            if (!req.files) {
                return { ack: "2", msg: "Please Select a File" };
            }
            let saveFileInFolder: any = await this.SavePresetFile(req);
            if (saveFileInFolder && saveFileInFolder.ack !== '2') {
                let res = await this.UpdateJsonAsPresetByUploadedFile(req.body);

            } else {
                return { ack: "2", msg: "File not updated" };
            }
            return { ack: '1', msg: "File updated successfully" };
        } catch (error) {
            return { ack: "0", deviceIP: req.body.deviceIP };
        }
    }

    public SaveFirmwareFile = async (req: any) => {

        if (!req.files) {
            return { ack: "2", msg: "Please Select a File" };
        }
        if (!fs.existsSync(process.cwd() + "/upload/" + req.body.devicetype)) {
            fs.mkdirSync(process.cwd() + "/upload/" + req.body.devicetype, { recursive: true })
        }
        const file = req.files.file;
        if (fs.existsSync(process.cwd() + "/upload/" + req.body.devicetype + "/" + file.name)) {
            return { ack: "2", msg: "File is already uploaded" }
        }
        let x = await new Promise((resolve, reject) => {
            file.mv(process.cwd() + "/upload/" + req.body.devicetype + "/" + file.name, (err) => {
                if (err) {
                    resolve({ ack: '2', msg: err });
                }
                else {
                    resolve({ ack: "1" });
                }
            })
        });
        if (!x) {
            return { ack: '2', msg: "Unexpected error occured! Please try again" }
        }
        return x;
    }

    public SavePresetFile = async (req: any) => {
        try {
            if (!req.files) {
                return { ack: "2", msg: "Please Select a File" };
            }
            if (!fs.existsSync(process.cwd() + "/upload/Preset/" + req.body.devicetype)) {
                fs.mkdirSync(process.cwd() + "/upload/Preset/" + req.body.devicetype, { recursive: true })
            }
            const file = req.files.file;
            if (fs.existsSync(process.cwd() + "/upload/Preset/" + req.body.devicetype + "/" + file.name)) {
                return { ack: "2", msg: "File is already uploaded" }
            }
            let x = await new Promise((resolve, reject) => {
                file.mv(process.cwd() + "/upload/Preset/" + req.body.devicetype + "/" + file.name, (err: any) => {
                    if (err) {
                        resolve({ ack: '2', msg: err });
                    }
                    else {
                        resolve({ ack: "1" });
                    }
                })
            });
            if (!x) {
                return { ack: '2', msg: "Unexpected error occured! Please try again" }
            }
            return x;
        } catch (error) {
            return ({ ack: '2', msg: error });
        }

    }

    public UpdateSingleDeviceByIp = async (req: any) => {
        let ip = req.body.ip
        if (!req.files) {
            return { ack: "2", msg: "Please Select a File" };
        }
        if (!fs.existsSync(process.cwd() + "/upload")) {
            fs.mkdirSync(process.cwd() + "/upload", { recursive: true })
        }

        const file = req.files.file;
        let x = await new Promise((resolve, reject) => {
            file.mv(process.cwd() + "/upload/" + file.name, (err) => {
                if (err) {
                    resolve(false);
                }
                else {
                    resolve(true);
                }
            })
        });
        if (!x) {
            return { ack: '2', msg: "Unexpected error occured! Please try again" }
        }
        let stream = fs.createReadStream(process.cwd() + "/upload/" + file.name)
        try {
            let ack = "1";
            let notSucceed: any = null;
            try {
                let ssl: any = await SETTINGSModel.find({})
                if (ssl.length > 0) {
                    ssl = ssl[0].HttpHttps
                }
                else {
                    ssl = "http"
                }
                let _url = ssl + "://" + ip + secretUtil.ENCODER_UPDATEFIRMWARE
                let encoder = await encoderModel.findOne({ peerIP: ip })
                if (encoder) {
                    let session = await this.getSessionWithoutReq(encoder, ip);
                    if (session !== "" && session !== "---") {
                        _url += `?session=${session}`;
                    }
                }
                let data = new FormData();
                data.append("", stream);
                let config: any = {
                    method: "post",
                    url: _url,
                    headers: {
                        ...data.getHeaders()
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    data: data
                }
                let requestResponse: any = await new Promise((resolve, reject) => {
                    axios(config).then((response) => {
                        resolve(response.data);
                    }).catch((error) => {
                        resolve(null);
                    })
                })
                if (requestResponse) {
                    if (requestResponse.status !== 'success') {
                        ack = "0"

                    }
                    else {
                        await this.RebootDevice(ip)
                    }
                } else {
                    ack = "0"
                }
            } catch (error) {
                ack = "0"
            }
            if (fs.existsSync(process.cwd() + "/upload/" + file.name)) {
                fs.unlinkSync(process.cwd() + "/upload/" + file.name)
            }
            return { ack: ack }

        } catch (error) {
            return { ack: "0" };
        }
    }

    public GetFirmwareFilesByDeviceType = (req: CustomerDevice) => {
        var firmwareFiles: any = [];
        if (fs.existsSync(process.cwd() + "/upload/" + req.DeviceType)) {
            fs.readdirSync(process.cwd() + "/upload/" + req.DeviceType).forEach(file => {
                firmwareFiles.push(file);
            });
        }
        return firmwareFiles;
    }

    public GetPresetFilesByDeviceType = (req: CustomerDevice) => {
        var firmwareFiles: any = [];
        if (fs.existsSync(process.cwd() + "/upload/Preset/" + req.DeviceType)) {
            fs.readdirSync(process.cwd() + "/upload/Preset/" + req.DeviceType).forEach(file => {
                firmwareFiles.push(file);
            });
        }
        return firmwareFiles;
    }

    public GetFirmwareFilesByDeviceName = async (req: any) => {
        let devicename = req.body.deviceName;
        let DeviceType = commonUtil.GetDeviceTypeByModel(devicename);
        var firmwareFiles: any = [];
        if (req.body.ip) {
            let device: any = await customerDeviceModel.findOne({ IP: req.body.ip });
            DeviceType = device?.DeviceType;
        }
        if (fs.existsSync(process.cwd() + "/upload/" + DeviceType)) {
            fs.readdirSync(process.cwd() + "/upload/" + DeviceType).forEach(file => {
                firmwareFiles.push(file);
            });
        }
        return firmwareFiles;
    }

    // public updatefirmwareforsingledevice = async (req: any) => {
    //     let ip = req.body.ip;
    //     const file = req.body.file;
    //     let DeviceType;
    //     if (ip) {
    //         let device: any = await customerDeviceModel.findOne({ IP: req.body.ip });
    //         DeviceType = device?.DeviceType;
    //     }
    //     if (fs.existsSync(process.cwd() + "/upload/" + req.DeviceType + "/" + req.file)) {
    //         return { ack: "2", msg: "File not Found" };
    //     }
    //     let stream = fs.createReadStream(process.cwd() + "/upload/" + DeviceType + "/" + file)

    //     try {
    //         let ack = "1";
    //         try {
    //             let ssl: any = await SETTINGSModel.find({})
    //             if (ssl.length > 0) {
    //                 ssl = ssl[0].HttpHttps
    //             }
    //             else {
    //                 ssl = "http"
    //             }
    //             let _url = ssl + "://" + ip + secretUtil.ENCODER_UPDATEFIRMWARE
    //             let encoder = await encoderModel.findOne({ peerIP: ip })
    //             if (encoder) {
    //                 let session = await this.getSessionWithoutReq(encoder, ip);
    //                 if (session !== "" && session !== "---") {
    //                     _url += `?session=${session}`;
    //                 }
    //             }
    //             let data = new FormData();
    //             data.append("", stream);
    //             let config: any = {
    //                 method: "post",
    //                 url: _url,
    //                 headers: {
    //                     ...data.getHeaders()
    //                 },
    //                 maxContentLength: Infinity,
    //                 maxBodyLength: Infinity,
    //                 data: data
    //             }
    //             let requestResponse: any = await new Promise((resolve, reject) => {
    //                 axios(config).then((response) => {
    //                     resolve(response.data);
    //                 }).catch((error) => {
    //                     resolve(null);
    //                 })
    //             })
    //             if (requestResponse) {
    //                 if (requestResponse.status !== 'success') {
    //                     ack = "0"

    //                 }
    //                 else {
    //                     await this.RebootDevice(ip)
    //                 }
    //             } else {
    //                 ack = "0"

    //             }

    //         } catch (error) {
    //             ack = "0"

    //         }
    //         return { ack: ack }

    //     } catch (error) {
    //         return { ack: "0" };
    //     }
    // }

    public updatefirmwareforsingledevice = async (req: any) => {
        let ip = req.body.ip;
        const file = req.body.file;
        let DeviceType;
        if (ip) {
            let device: any = await customerDeviceModel.findOne({ IP: req.body.ip });
            DeviceType = device?.DeviceType;
        }
        // if (fs.existsSync(process.cwd() + "/upload/" + req.DeviceType + "/" + req.file)) {
        //     return { ack: "2", msg: "File not Found" };
        // }
        // let stream = fs.createReadStream(process.cwd() + "/upload/" + DeviceType + "/" + file)
        try {
            let ack = "1";
            try {
                let ssl: any = await SETTINGSModel.find({})
                if (ssl.length > 0) {
                    ssl = ssl[0].HttpHttps
                }
                else {
                    ssl = "http"
                }
                let _url = ssl + "://" + ip + secretUtil.ENCODER_FIRMWAREAVAILABLE
                let encoder = await encoderModel.findOne({ peerIP: ip })
                if (encoder) {
                    let session = await this.getSessionWithoutReq(encoder, ip);
                    if (session !== "" && session !== "---") {
                        _url += `?session=${session}`;
                    }
                }
                let data = {
                    "firmware_url": `${req.protocol + '://' + req.get('host') + '' + req.baseUrl}/filelocation/${DeviceType}+${file}`,
                    "firmware_session_id": "1",
                    "upgrade_status_path": `${req.protocol + '://' + req.get('host') + '' + req.baseUrl}/upgrade_status/${ip}`
                }
                let config: any = {
                    method: "post",
                    url: _url,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    data: data
                }
                let requestResponse: any = await new Promise((resolve, reject) => {
                    axios(config).then((response) => {
                        resolve(response.data);
                    }).catch((error) => {
                        resolve(null);
                    })
                })
                if (requestResponse) {
                    if (requestResponse.status !== 'success') {
                        ack = "0"
                    }
                } else {
                    ack = "0"
                }

            } catch (error) {
                ack = "0"
            }
            return { ack: ack }
        } catch (error) {
            return { ack: "0" };
        }
    }

    // public UpdateFirmwareByUploadedFile = async (req: any) => {
    //     if (req.ipArray === "") {
    //         return { ack: '2', msg: "Please Select Devices" }
    //     }
    //     if (secretUtil.ENABLE_DEBUG_LOG) {
    //         logging.logger.info("upload firmware for selected ip");
    //     }
    //     // console.log(fs.existsSync(process.cwd() + "/upload"))
    //     let filePath = path.join(process.cwd(), "upload", req.DeviceType, req.file);
    //     if (!fs.existsSync(filePath)) {
    //         return { ack: "2", msg: "File not Found" };
    //     }
    //     const file = req.file;
    //     let stream = fs.createReadStream(process.cwd() + "/upload/" + req.DeviceType + "/" + file)
    //     try {
    //         let ack = "1";
    //         let notSucceed: any = [];
    //         for (let i = 0; i < req.ipArray.length; i++) {
    //             let ip = req.ipArray[i];
    //             try {

    //                 let ssl: any = await SETTINGSModel.find({})
    //                 if (ssl.length > 0) {
    //                     ssl = ssl[0].HttpHttps
    //                 }
    //                 else {
    //                     ssl = "http"
    //                 }
    //                 let _url = ssl + "://" + ip + secretUtil.ENCODER_UPDATEFIRMWARE
    //                 let encoder = await encoderModel.findOne({ peerIP: ip })
    //                 if (encoder) {
    //                     let session = await this.getSessionWithoutReq(encoder, ip);
    //                     if (session !== "" && session !== "---") {
    //                         _url += `?session=${session}`;
    //                     }
    //                 }
    //                 if (secretUtil.ENABLE_DEBUG_LOG) {
    //                     logging.logger.info(`stop encoder for , ${ip}`);
    //                 }
    //                 let isStop = await this.StopEncoderEncoding(ip, '');
    //                 if (isStop) {

    //                     if (isStop.status !== "success") {
    //                         notSucceed.push(ip);
    //                         continue;
    //                     }
    //                 }
    //                 else {
    //                     notSucceed.push(ip);
    //                     continue;
    //                 }
    //                 let data = new FormData();
    //                 data.append("", stream);
    //                 let config: any = {
    //                     method: "post",
    //                     url: _url,
    //                     headers: {
    //                         ...data.getHeaders()
    //                     },
    //                     maxContentLength: Infinity,
    //                     maxBodyLength: Infinity,
    //                     data: data
    //                 }
    //                 if (secretUtil.ENABLE_DEBUG_LOG) {
    //                     logging.logger.info({ url: _url }, { option: config }, `for update firmware , ${ip}`);
    //                 }
    //                 let requestResponse: any = await new Promise((resolve, reject) => {
    //                     axios(config).then((response) => {
    //                         resolve(response.data);
    //                         if (secretUtil.ENABLE_DEBUG_LOG) {
    //                             logging.logger.info({ response: response.data });
    //                         }
    //                     }).catch((error) => {
    //                         resolve(null);
    //                         if (secretUtil.ENABLE_DEBUG_LOG) {
    //                             logging.logger.info({ exception: error }, { IP: ip });
    //                         }
    //                     })
    //                 })
    //                 if (requestResponse) {
    //                     if (requestResponse.status !== 'success') {
    //                         ack = "0"
    //                         notSucceed.push(ip);
    //                         continue;
    //                     }
    //                     else {
    //                         if (secretUtil.ENABLE_DEBUG_LOG) {
    //                             logging.logger.info(`reboot device , ${ip}`);
    //                         }
    //                         await this.RebootDevice(ip)
    //                     }
    //                 } else {
    //                     ack = "0"
    //                     notSucceed.push(ip);
    //                     continue;
    //                 }

    //             } catch (error) {
    //                 ack = "0"
    //                 notSucceed.push(ip);
    //                 continue;
    //             }
    //         }
    //         return { ack: ack, ips: notSucceed }

    //     } catch (error) {
    //         return { ack: "0", ips: req.ipArray };
    //     }
    // }

    public UpdateFirmwareByUploadedFile = async (req: any) => {
        if (req.body.ipArray === "") {
            return { ack: '2', msg: "Please Select Devices" }
        }
        if (secretUtil.ENABLE_DEBUG_LOG) {
            logging.logger.info("upload firmware for selected ip");
        }
        let filePath = path.join(process.cwd(), "upload", req.body.DeviceType, req.body.file);
        if (!fs.existsSync(filePath)) {
            return { ack: "2", msg: "File not Found" };
        }
        const file = req.body.file;
        let promiseArray: any = []
        try {
            let ack = "1";
            let notSucceed: any = [];
            statusHitCount = {};
            for (let i = 0; i < req.body.ipArray.length; i++) {
                let ip = req.body.ipArray[i];
                try {
                    ack = "1";
                    // try {
                    let ssl: any = await SETTINGSModel.find({})
                    if (ssl.length > 0) {
                        ssl = ssl[0].HttpHttps
                    }
                    else {
                        ssl = "http"
                    }
                    let _url = ssl + "://" + ip + secretUtil.ENCODER_FIRMWAREAVAILABLE
                    let encoder = await encoderModel.findOne({ peerIP: ip })
                    if (encoder) {
                        let session = await this.getSessionWithoutReq(encoder, ip);
                        if (session !== "" && session !== "---") {
                            _url += `?session=${session}`;
                        }
                    }
                    let data = {
                        "firmware_url": `${req.protocol + '://' + req.get('host') + '' + req.baseUrl}/filelocation/${req.body.DeviceType}+${file}`,
                        "firmware_session_id": "1",
                        "upgrade_status_path": `${req.protocol + '://' + req.get('host') + '' + req.baseUrl}/upgrade_status/${ip}`
                    }
                    console.log(i + 1, '. Payload :- ', data)
                    let config: any = {
                        method: "post",
                        url: _url,
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        data: data
                    }
                    statusHitCount[ip] = 0;
                    let requestResponse: any = new Promise(async (resolve, reject) => {
                        if (secretUtil.ENABLE_DEBUG_LOG) {
                            logging.logger.info(`stop encoder for , ${ip}`);
                        }
                        let isStop = await this.StopEncoderEncoding(ip, '');
                        if (isStop) {
                            if (isStop.status !== "success") {
                                resolve(ip);
                            }
                        }
                        else {
                            resolve(ip);
                        }
                        axios(config).then((response) => {
                            console.log('Response from ', _url, response.data)
                            resolve('1');
                        }).catch((error) => {
                            console.log(' request error')
                            resolve(ip);
                        })
                    })
                    promiseArray.push(requestResponse);
                    // if (requestResponse) {
                    //     if (requestResponse.status !== 'success') {
                    //         ack = "0"
                    //         notSucceed.push(ip);
                    //         console.log('if ', requestResponse)
                    //     }
                    //     console.log('if - else ', requestResponse)
                    // } else {
                    //     ack = "0"
                    //     notSucceed.push(ip);
                    //     console.log('else ', requestResponse)
                    // }

                    // } catch (error) {
                    //     console.log('1st catch')
                    //     ack = "0"
                    //     notSucceed.push(ip);
                    //     continue;
                    // }
                    // return { ack: ack, ips: notSucceed }
                } catch (error) {
                    ack = "0"
                    notSucceed.push(ip);
                    continue;
                }
            }
            notSucceed = [];
            await Promise.all(promiseArray).then((itm: any) => {
                itm.map((item: any) => {
                    if (item !== '1') notSucceed.push(item);
                })
            })
            return notSucceed.length ? { ack: '0', ips: notSucceed } : { ack: '1', ips: notSucceed }

        } catch (error) {
            return { ack: "0", ips: req.ipArray };
        }
    }

    public firmwareFileLocation = async (req, res) => {
        try {
            let pathurl = req.path;
            let paramData = req.params.id.split('+');
            if (pathurl !== '/') {
                const response = res.download(process.cwd() + "/upload/" + paramData[0] + '/' + paramData[1], err => {
                    if (err) return err;
                    console.log('Firmware file downloaded !!!');
                })
                return response;
            }
        } catch (error) {
            return { err: error };
        }
    }

    public FirmwareUpgradeStatus = async (req: any) => {
        console.log('Received status by Encoder - ', req.body)
        if (secretUtil.ENABLE_DEBUG_LOG) {
            logging.logger.info(req.body.mac_address);
        }
        try {
            if (req.body.mac_address === 'firmware_upgrade_success') {
                if (secretUtil.ENABLE_DEBUG_LOG) {
                    logging.logger.info("reboot the device" + req.params.id);
                }
                console.log(req.params.id, ' is started to reboot !^')
                statusHitCount[req.params.id] = 3;
                this.RebootDevice(req.params.id)
            }
            else
                if (req.body.mac_address === 'firmware_download_starting') {
                    statusHitCount[req.params.id] = 1;
                }
                else if (req.body.mac_address === 'firmware_download_success') {
                    if (statusHitCount[req.params.id] == 1) {
                        statusHitCount[req.params.id] = 2;
                    }
                    else {
                        statusHitCount[req.params.id] = 3;
                        console.log(req.params.id, ' is started to reboot !')
                        this.RebootDevice(req.params.id)
                    }
                }
                else {
                    statusHitCount[req.params.id] = 4;
                    console.log(req.params.id, ' upgrade failure !')
                }
            return;
        }
        catch (err) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info("faild to upgrade firmware");
            }
            return;
        }
    }

    public UpdateJsonAsPresetByUploadedFile = async (req: any) => {
        try {
            if (req.deviceIP === "") {
                return { ack: '2', msg: "Please Select Devices" }
            }
            const file = req.file;
            let fileForUpdate = require("../../../.." + "/upload/Preset/" + req.DeviceType + "/" + file);
            let encoderProperties: any = await encoderModel.findOne({ peerIP: req.deviceIP });
            let res, next;

            let resultProperties = Object.assign(encoderProperties.properties, fileForUpdate.properties);
            await encoderModel.updateOne({ peerIP: req.deviceIP }, { $set: { properties: resultProperties } });
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
                                    ip: req.req.deviceIP
                                }
                            }

                            let res, next;
                            await encoderControllerV1.UpdatePreset(data, res, next);
                            let data1: any = {
                                body: {
                                    current_enc_presets: presetArr[i],
                                    ip: req.deviceIP
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
                            ip: req.deviceIP
                        }
                    }
                    await encoderControllerV1.LoadPreset(data1, res, next);

                    let req1: any = {
                        body: {
                            ip: req.deviceIP,
                            data: resultProperties
                        }
                    }
                    await encoderControllerV1.SaveSession(req1, res, next);

                } else {
                    let req1: any = {
                        body: {
                            ip: req.deviceIP,
                            data: resultProperties
                        }
                    }
                    await encoderControllerV1.SaveSession(req1, res, next);
                }
            } else {
                let req1: any = {
                    body: {
                        ip: req.deviceIP,
                        data: resultProperties
                    }
                }
                await encoderControllerV1.SaveSession(req1, res, next);
            }

            return { ack: "1" }
        } catch (error) {
            return { ack: "0", deviceIP: req.deviceIP };
        }
    }

    public deleteFirmwareFileBydeviceType = async (req: any) => {
        let file = req.body.file;
        let deviceType = req.body.devicetype;
        if (!fs.existsSync(process.cwd() + "/upload/" + deviceType)) return { ack: '2', msg: "File not found" }
        try {
            let ack = "1";
            if (fs.existsSync(process.cwd() + "/upload/" + deviceType + "/" + file)) {
                fs.unlinkSync(process.cwd() + "/upload/" + deviceType + "/" + file)
            }
            else {
                ack = '2'
            }
            return { ack: ack, msg: "File has been deleted" };
        } catch (error) {
            return { ack: '0', msg: "Something went wrong" }
        }
    }

    public deletePresetfilebydevicetype = async (req: any) => {
        let file = req.body.file;
        let deviceType = req.body.devicetype;
        if (!fs.existsSync(process.cwd() + "/upload/Preset/" + deviceType)) return { ack: '2', msg: "File not found" }
        try {
            let ack = "1";
            if (fs.existsSync(process.cwd() + "/upload/Preset/" + deviceType + "/" + file)) {
                fs.unlinkSync(process.cwd() + "/upload/Preset/" + deviceType + "/" + file)
            }
            else {
                ack = '2'
            }
            return { ack: ack, msg: "File has been deleted" };
        } catch (error) {
            return { ack: '0', msg: "Something went wrong" }
        }
    }

    public setautomatedworkflow = async (req: any) => {
        let peerIP = req.body.ip;
        let srtOptimization = req.body.srtOptimization;
        var presetOptimization = req.body.presetOptimization;
        try {
            await encoderModel.updateOne({ peerIP: peerIP }, { $set: { srtOptimization: srtOptimization, presetOptimization: presetOptimization } })
            await customerDeviceModel.updateOne({ IP: peerIP }, { $set: { srtOptimization: srtOptimization, presetOptimization: presetOptimization } })
            return { ack: '1', msg: "updated" };
        } catch (error) {
            return { ack: '0', msg: "Something went wrong" }
        }
    }

    public setHotBackupValue = async (req: any) => {
        let peerIP = req.body.ip;
        let hotBackup = req.body.isChecked;
        let allDelete = req.body.allDelete ? true : false;

        try {
            if (allDelete) {
                await encoderModel.updateOne({ peerIP: peerIP }, { $set: { hotBackup: hotBackup } });
                return { ack: '1', msg: "updated" };
            }
            if (!hotBackup) {
                let allIps: any = await encoderModel.findOne({ peerIP: peerIP })
                let deviceType: any = await customerDeviceModel.findOne({ IP: peerIP });
                if (deviceType) {
                    deviceType = deviceType.DeviceType;
                }
                if (allIps.spareIp) {
                    await encoderModel.updateOne({ peerIP: peerIP }, { $set: { spareIp: '' } })
                    await HotbackupIpListModel.updateOne({ SpareIp: allIps.spareIp }, { inUse: false });
                }
            }
            await encoderModel.updateOne({ peerIP: peerIP }, { $set: { hotBackup: hotBackup } })
            await customerDeviceModel.updateOne({ IP: peerIP }, { hotBackup: hotBackup });
            return { ack: '1', msg: "updated" };
        } catch (error) {
            return { ack: '0', msg: "Something went wrong" }
        }
    }

    public SaveSpareUnitIp = async (req: any) => {
        let peerIP = req.ip;
        let spareIp = req.spareIP;
        try {
            let isExist: any = await HotbackupIpListModel.findOne({ SpareIp: spareIp });
            if (isExist) {
                await HotbackupIpListModel.updateOne({ SpareIp: spareIp }, { $set: { inUse: true } });
            }
            await encoderModel.updateOne({ peerIP: peerIP }, { spareIp: spareIp, spareIpPassword: isExist.Password, spareIpAuthToken: isExist.Session });
            await customerDeviceModel.updateOne({ IP: peerIP }, { spareIp: spareIp, spareIpPassword: isExist.Password, spareIpUsername: isExist.Username });
            return { ack: '1', msg: "updated" };
        } catch (error) {
            return { ack: '0', msg: "Something went wrong" }
        }
    }

    public editSpareIpForEnc = async (req: any) => {
        let spareIp = req.spareIp;
        let password = req.password;
        let peerIP = req.peerIP;
        let session: any = '';
        try {
            let checkIsExsitDevice: any = await customerDeviceModel.findOne({ IP: spareIp });
            let checkIsExsitEncoder: any = await encoderModel.findOne({ peerIP: peerIP });
            if (checkIsExsitDevice) {
                return { ack: '0', msg: 'Spare IP is already exist' };
            }
            if (req.password) {
                let res: any = await encoderServicesV1.RequestLogin(password, spareIp);
                if (res.status !== "success") {
                    return { ack: '0', msg: "please check ip or password" }
                }
                session = res.session.id;
            } else {
                let res: any = await encoderServicesV1.RequestLoginWithoutPassword(spareIp);
                if (res.status !== "success") {
                    return { ack: '0', msg: "please check ip or password" }
                }
                session = res.session.id;
            }
            let isExist: any = await HotbackupIpListModel.findOne({ SpareIp: spareIp });
            if (isExist) {
                await HotbackupIpListModel.updateOne({ SpareIp: spareIp }, { $set: { inUse: true, Session: session, Password: req.password } });
                await HotbackupIpListModel.updateOne({ SpareIp: checkIsExsitEncoder.spareIp }, { $set: { inUse: false } });
            } else {
                let device: any = await customerDeviceModel.findOne({ IP: peerIP });
                let model = new HotbackupIpListModel();
                model.SpareIp = spareIp;
                model.DeviceType = device.DeviceType;
                model.Password = password;
                model.Session = session;
                model.inUse = true;
                model.save();
                await HotbackupIpListModel.deleteOne({ SpareIp: spareIp });
            }
            await encoderModel.updateOne({ peerIP: peerIP }, { spareIp: spareIp, spareIpPassword: password })
            await customerDeviceModel.updateOne({ IP: peerIP }, { spareIp: spareIp, spareIpPassword: password, spareIpUsername: '' });
            return { ack: '1', msg: "updated" };
        } catch (error) {
            return { ack: '0', msg: "Something went wrong" }
        }
    }

    public DeleteSpareUnitIp = async (req: any) => {
        let peerIP = req.ip;
        let SpareIp = req.spareIP;
        try {
            await HotbackupIpListModel.updateOne({ SpareIp: SpareIp }, { $set: { inUse: false } });
            let device: any = await HotbackupIpListModel.findOne({ SpareIp: SpareIp });
            let deviceType = device.DeviceType;
            if (deviceType === EllvisModel) {
                let blob: any = {
                    $unset: {
                        spareIp: 1,
                        spareIpUsername: 1,
                        spareIpPassword: 1
                    },
                    multi: true,
                }
                await customerDeviceModel.updateOne({ IP: peerIP }, blob);
                return { ack: '1', msg: "deleted successfulley" };
            }

            await encoderModel.updateOne({ peerIP: peerIP }, { $set: { spareIp: '' } });
            await customerDeviceModel.updateOne({ IP: peerIP }, { spareIp: '', spareIpPassword: '', spareIpUsername: '' });

            // all critical mails are cleared here, for no device available
            let allCriticalReports: any = await alarmsReportingModel.find({ StreamID: "No Device Available For Hot Backup", TimeCleared: undefined });
            for (let i = 0; i < allCriticalReports.length; i++) {
                let created: any = allCriticalReports[i]?.TimeCreated;
                let cleared = new Date();
                let diff = cleared.getTime() - created.getTime();
                let timeinterval = commonUtil.msToTime(diff);
                let blob = {
                    TimeInterval: timeinterval,
                    TimeCleared: cleared
                }
                await alarmsReportingModel.updateOne({ _id: allCriticalReports[i]?._id }, { $set: blob }, { new: true }, (err) => { if (err) return; });
            } //end

            // sending mail for (Cleared : No device available for hot backup)
            let timezone2: any = await customerServicesV1.gettimezone();
            let timezone = timezone2.offset;
            let str = new Date(new Date().getTime() + timezone * 3600000).toUTCString();
            let date = str.substring(0, 16)
            let time = str.substring(16, 25)
            let smtp: any = await SMTPModel.find({});
            let subject: any = [];
            let criticalMailarray: any = [];
            let getAllSystems: any = await systemModel.find({});
            let getAllRegions: any = await regionModel.find({});


            for (let i = 0; i < getAllRegions.length; i++) {
                let regionmails = getAllRegions[i].Email.split(",")
                for (let j = 0; j < regionmails.length; j++) {
                    criticalMailarray.push(regionmails[j]);
                    subject.push("Critical Alert: Device available for Hot Backup");
                }
            }
            for (let i = 0; i < getAllSystems.length; i++) {
                let systemCriticalMails = getAllSystems[i].Contact.split(",");
                for (let j = 0; j < systemCriticalMails.length; j++) {
                    criticalMailarray.push(systemCriticalMails[j])
                    subject.push("Critical Alert: Device available for Hot Backup");
                }
            }
            let content = `
                        <h3 style="color:green;">Critical Mail Cleared</h3><br>
                        <p>Device available for hot backup</p><br>
                        Time : ${time}<br>
                        Date: ${date}<br>
                        `
            if (smtp.length !== 0) {
                commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, criticalMailarray, smtp[0].Sendername, smtp[0].isSecure)
            }

            return { ack: '1', msg: "deleted successfulley" };
        } catch (error) {
            return { ack: '0', msg: "Something went wrong" }
        }
    }

    public Ellvis_logout_for_Hotbackup = async (req) => {
        try {
            let currEllvis = await HotbackupIpListModel.findOne({ SpareIp: req?.ip });
            let authToken = currEllvis ? currEllvis.Session : '';
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
                    Authorization: "Bearer " + authToken
                },
                strictSSL: false,
                body: JSON.stringify(req)
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
                    logging.logger.info({ status: 'success' }, `Ellvis Deleted Successfully, ${req.ip}`);
                }
            }
            return resData;
        } catch (error) {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info({ exception: error }, `exception in logout ellviss for, ${req.ip}`);
            }
            return;
        }
    }

    public DeleteSpareUnitIpForSettings = async (req: any) => {
        let deviceType = req.deviceType;
        let spareIp = req.spareIP;
        try {
            if (deviceType === EllvisModel) {
                let ellvis: any = await HotbackupIpListModel.findOne({ SpareIp: spareIp });
                let data = {
                    ip: spareIp,
                    username: ellvis.Username,
                    password: ellvis.Password
                }
                let res: any = await this.Ellvis_logout_for_Hotbackup(data);
                if (res === 'success') {
                    await HotbackupIpListModel.deleteOne({ $and: [{ SpareIp: spareIp }, { DeviceType: deviceType }] })
                    return { ack: '1', msg: "deleted successfulley" };
                }
                else {
                    return { ack: '0', msg: "Ip is not deleted" }
                }
            }
            await HotbackupIpListModel.deleteOne({ $and: [{ SpareIp: spareIp }, { DeviceType: deviceType }] })
            return { ack: '1', msg: "deleted successfulley" };
        } catch (error) {
            return { ack: '0', msg: "Something went wrong" }
        }
    }

    public deleteWarningMessage = async (req: any) => {
        let peerIP = req.body.ip;
        let updatedMessages = req.body.messages;
        try {
            await encoderModel.updateOne({ peerIP: peerIP }, { warningMessagesArray: updatedMessages }, { new: true })
            await customerDeviceModel.updateOne({ peerIP: peerIP }, { warningMessagesArray: updatedMessages }, { new: true })
            return { ack: '1', msg: "updated" };
        } catch (error) {
            return { ack: '0', msg: "Something went wrong" }
        }
    }
    public GetFirmwareUpgradeStatus = () => {
        return statusHitCount;
    }

    public saveLicenseFile = async (req: any) => {
        try {
            let UserPaths = `/home/${await app.getCurrentUser()}/radiantlicense`
            const file = req.files.file;
            const filePath = UserPaths + "/" + req.files.file.name;
            // Decrypt the encrypted data
            const decryptedData = await app.DecryptingID(req.files.file.data.toString().split("\n")[0]);
            // Split the decrypted data into start time and expiry time
            const parts = decryptedData.split('_');
            // Extract the start date and end date
            let vmUniqueId = await fsRead.readFile("/etc/machine-id", { encoding: 'utf8' });
            let cmd = 'echo $(cat /sys/class/net/et*/address) | head -1'
            let checkFile = await this.CheckFile(cmd, parts, vmUniqueId)
            if (checkFile == 'mac/IdNotMatch') {
                return { ack: "2", msg: "Your MacAddress/Machine ID not match with license file, Please contact your vendor." };
            } else if (checkFile == 'licenseExpire') {
                return { ack: "2", msg: "License Expired, Please contact your vendor to renew it." };
            }
            // find the and know the localtion of the file
            this.saveLicense(UserPaths, filePath, file);
            this.UbuntuCmD(cmd, parts, vmUniqueId);
            return { ack: "1", startDate: parts[2], expiryTime: parts[3], totalLicense: parts[1] };
        } catch (error) {
            return { ack: '2', msg: error };
        }
    }

    public UbuntuCmD = (cmd: string, parts: string[], vmUniqueId: any) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                app.checkMacAddress('', parts, vmUniqueId.split('\n')[0]);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                app.checkMacAddress('', parts, vmUniqueId.split('\n')[0]);
                return;
            }
            app.checkMacAddress(stdout.slice(0, 17), parts, vmUniqueId.split('\n')[0]);
        });
    }

    public CheckFile = async (cmd: string, parts: string[], vmUniqueId: any) => {
        let response = new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    resolve("notValid")
                }
                let macAddress = stdout.slice(0, 17)
                if (macAddress.trim() == parts[0].trim() || parts[0].trim() == vmUniqueId.trim()) {
                    const currentDate = new Date().toISOString().slice(0, 10)
                    if (currentDate > parts[3]) {
                        resolve('licenseExpire')
                    } else {
                        resolve('success')
                    }
                }
                resolve("mac/IdNotMatch")

            });
        })
        return await response.then(data => data).catch(err => false)
    }

    public saveLicense = (UserPaths: string, filePath: string, file: any) => {
        try {
            if (!fs.existsSync(UserPaths)) {
                fs.mkdirSync(UserPaths, { recursive: true });
            }
            // remove the file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            // update the file 
            fs.writeFileSync(filePath, file.data);
            fs.chmodSync(filePath, 0o777);
        } catch (error) {
            return
        }
    }

}

export const encoderServicesV1 = new EncoderServicesV1();




