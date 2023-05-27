import { NextFunction, Response } from 'express';
import { BaseController } from '../../basecontroller';
import { ellvisServicesV1 } from '../../../services/v1/ellvis/ellvisservicesv1';
import { ReqEllvisschemas } from '../../../routes/v1/ellvis/ellvisschema';
import { IFilteredRequest } from "../../../interfaces";
import { CustomerDevice } from "../../../models/ellvis/customerdevice.model";
import { ConnectedDevice } from "../../../models/ellvis/connecteddevices.model";
import { ChangePassword } from "../../../models/ellvis/changepassword.model";
import ImportPresets from "../../../models/ellvis/importpresets.model"
import SystemAction from "../../../models/ellvis/systemaction.model";
import Login from "../../../models/ellvis/login.model";
import Container from "../../../models/ellvis/container.model";
import SSH from "../../../models/ellvis/ssh.model";
import { AlarmList } from '../../../models/ellvis/alarm.model';
import { ApiPath, SwaggerDefinitionConstant, ApiOperationPost } from "swagger-express-ts"
import { NetworkSettings } from '../../../routes/v1/networksettings/networksettings';
@ApiPath({
    path: "/api/v1",
    name: "Ellvis API Calls",
    security: { apiKeyHeader: [] },
})

class EllvisControllerV1 extends BaseController {

    /**
     * @description Get all connected devices.
     */

    // @ApiOperationPost({
    //     description: "Api to get connected devices",
    //     path: '/getactiveconnections',
    //     summary: "Api to get connected devices",
    //     parameters: {
    //         body: {
    //             description: "Enter IP",
    //             required: true,
    //         }
    //     },
    //     responses: {
    //         200: {
    //             description: "Success",
    //             type: SwaggerDefinitionConstant.Response.Type.OBJECT,
    //         },
    //         404: {
    //             description: "Fail",
    //             type: SwaggerDefinitionConstant.Response.Type.OBJECT,
    //         }
    //     },
    // })

    // public async GetConnectedDevices(req: IFilteredRequest<ConnectedDevice>, res: Response, next: NextFunction) {
    //     try {
    //         const requestResult = await ellvisServicesV1.GetConnectedDevices(req.body);
    //         return res.send(requestResult);
    //     } catch (error) {
    //         return res.send(null);
    //     }
    // }

    /**
     * @description Get Bearer Token.
     */

    @ApiOperationPost({
        description: "Api to get bearer token",
        path: '/login',
        summary: "Api to get bearer  token",
        parameters: {
            body: {
                description: "Enter username and password",
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

    public async Login(req: IFilteredRequest<Login>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.Login(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
    * @description Reset password of ellvis.
    */

    @ApiOperationPost({
        description: "Api to reset password of ellvis",
        path: '/changepassword',
        summary: "Api to reset password of ellvis",
        parameters: {
            body: {
                description: "Enter Current and New Passsword",
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

    /**
     * @description Get Version and Licensing info.
     */

    @ApiOperationPost({
        description: "Api to get Version and Licensing info",
        path: '/getversionlicensing',
        summary: "Api to get Version and Licensing info",
        parameters: {
            body: {
                description: "Enter IP",
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

    public async GetVersionLicensingInfo(req: IFilteredRequest<ConnectedDevice>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.GetVersionLicensingInfo(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
     * @description Get network IPs, Adapter, anagement port.
     */

    @ApiOperationPost({
        description: "Api to get network settings",
        path: '/getnetworksettings',
        summary: "Api to get network settings",
        parameters: {
            body: {
                description: "Enter IP",
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

    public async GetNetworkSettings(req: IFilteredRequest<ConnectedDevice>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.GetNetworkSettings(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }


    public async EllvisChangePassword(req: IFilteredRequest<ChangePassword>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.EllvisChangePassword(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
     * @description Get the list of all containers.
     */

    @ApiOperationPost({
        description: "Api to get all containers",
        path: '/getallcontainers',
        summary: "Api to get all containers",
        parameters: {
            body: {
                description: "Enter IP",
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

    public async GetAllContainers(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.GetAllContainers(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
     * @description Create Container.
     */

    @ApiOperationPost({
        description: "Api to create container",
        path: '/createcontainer',
        summary: "Api to get create container",
        parameters: {
            body: {
                description: "Enter all the required fields",
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

    public async CreateContainer(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            let requestResult: any = await ellvisServicesV1.CreateContainer(req.body);
            if (!requestResult.message) {
                requestResult = { message: requestResult }
            }
            return res.send(requestResult.message);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
  * @description To delete Container.
    */

    @ApiOperationPost({
        description: "Api to delete container",
        path: '/deletecontainer',
        summary: "Api to delete container",
        parameters: {
            body: {
                description: "Enter all the required fields",
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

    public async DeleteContainer(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.DeleteContainer(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
    * @description To start Container.
    */

    @ApiOperationPost({
        description: "Api to start container",
        path: '/startcontainer',
        summary: "Api to start container",
        parameters: {
            body: {
                description: "Enter all the required fields",
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

    public async StartContainer(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.StartContainer(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
    * @description To stop Container.
    */

    @ApiOperationPost({
        description: "Api to stop container",
        path: '/stopcontainer',
        summary: "Api to stop container",
        parameters: {
            body: {
                description: "Enter all the required fields",
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

    public async StopContainer(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.StopContainer(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
     * @description Export Presets in json file.
     */

    @ApiOperationPost({
        description: "Api to export presets in json file",
        path: '/exportpresets',
        summary: "Api to export presets in json file",
        parameters: {
            body: {
                description: "Enter IP",
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


    public async ExportPresets(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.ExportPresets(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }



    /**
     * @description Import Presets from json file.
     */

    @ApiOperationPost({
        description: "Api to import presets from json file",
        path: '/importpresets',
        summary: "Api to import presets from json file",
        parameters: {
            body: {
                description: "Enter IP and JSON file name",
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


    public async ImportPresets(req: IFilteredRequest<ImportPresets>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.ImportPresets(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }


    /**
    * @description To Upload Presets TBD.
    */

    @ApiOperationPost({
        description: "Api to Upload Presets TBD",
        path: '/uploadpresetstbd',
        summary: "Api to Upload Presets TBD",
        parameters: {
            body: {
                description: "Enter all the required fields",
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

    public async UploadPresetsTBD(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.UploadPresetsTBD(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }
    //============== Download Presets TBD
    /**
    * @description To Download Presets TBD.
    */

    @ApiOperationPost({
        description: "Api to Download Presets TBD",
        path: '/downloadpresetstbd',
        summary: "Api to Download Presets TBD",
        parameters: {
            body: {
                description: "Enter all the required fields",
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

    public async DownloadPresetsTBD(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.DownloadPresetsTBD(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
     * @description Clear Presets TBD.
     */

    @ApiOperationPost({
        description: "Api to clear presets TBD",
        path: '/clearpresetstbd',
        summary: "Api to clear presets TBD",
        parameters: {
            body: {
                description: "Enter IP",
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


    public async ClearPresetsTBD(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.ClearPresetsTBD(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }


    /**
     * @description API to shutdown system.
     */

    @ApiOperationPost({
        description: "Api to shutdown system",
        path: '/shutdownsystem',
        summary: "Api to shutdown system",
        parameters: {
            body: {
                description: "Enter valid username and password with action",
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


    public async ShutdownSystem(req: IFilteredRequest<SystemAction>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.ShutdownSystem(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }



    /**
    * @description API to reboot system.
    */

    @ApiOperationPost({
        description: "Api to reboot system",
        path: '/rebootsystem',
        summary: "Api to reboot system",
        parameters: {
            body: {
                description: "Enter valid username and password with action",
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


    public async RebootSystem(req: IFilteredRequest<SystemAction>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.RebootSystem(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }


    /**
* @description API to update system TBD.
*/

    @ApiOperationPost({
        description: "Api to update system TBD",
        path: '/updatesystemtbd',
        summary: "Api to update system TBD",
        parameters: {
            body: {
                description: "Enter valid username and password with action",
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


    public async UpdateSystemTBD(req: IFilteredRequest<SystemAction>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.UpdateSystemTBD(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }


    /**
* @description API to update SSL TBD.
*/

    @ApiOperationPost({
        description: "Api to update SSL TBD",
        path: '/updatessltbd',
        summary: "Api to update SSL TBD",
        parameters: {
            body: {
                description: "Enter valid username and password with action",
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


    public async UpdateSSLTBD(req: IFilteredRequest<SystemAction>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.UpdateSSLTBD(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }



    /**
* @description API to reset System.
*/

    @ApiOperationPost({
        description: "Api to reset System",
        path: '/resetsystem',
        summary: "Api to reset System",
        parameters: {
            body: {
                description: "Enter valid username and password with action",
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


    public async ResetSystem(req: IFilteredRequest<SystemAction>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.ResetSystem(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    /**
    * @description To Upload Presets TBD.
    */

    @ApiOperationPost({
        description: "Api to enable/disable SSH",
        path: '/enabledisablessh',
        summary: "Api to enable/disable SSH",
        parameters: {
            body: {
                description: "Enter all the required fields",
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

    public async EnableDisableSSH(req: IFilteredRequest<SSH>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.EnableDisableSSH(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }


    /**
     * @description Get all devices by customerid.
     */

    // @ApiOperationPost({
    //     description: "Api to get all devices by customerid",
    //     path: '/getdevicesbysystem',
    //     summary: "Api to get all devices by customerid",
    //     parameters: {
    //         body: {
    //             description: "Enter IP",
    //             required: true,
    //         }
    //     },
    //     responses: {
    //         200: {
    //             description: "Success",
    //             type: SwaggerDefinitionConstant.Response.Type.OBJECT,
    //         },
    //         404: {
    //             description: "Fail",
    //             type: SwaggerDefinitionConstant.Response.Type.OBJECT,
    //         }
    //     },
    // })

    // public async GetDevicesByCustomerID(req: IFilteredRequest<ReqEllvisschemas>, res: Response, next: NextFunction) {
    //     try {
    //         const requestResult = await ellvisServicesV1.GetAllDevices(req.body);
    //         return res.send(requestResult);
    //     } catch (error) {
    //         return res.send(null);
    //     }
    // }
    @ApiOperationPost({
        description: "Api to get all devices by customerid",
        path: '/getdevicesbysystem',
        summary: "Api to get all devices by customerid",
        parameters: {
            body: {
                description: "Enter IP",
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
    public async GetDevicesByCustomerIDV2(req: IFilteredRequest<ReqEllvisschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.GetAllDevicesV2(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }


    /**
     * @description Get all devices by customerid.
     */

    @ApiOperationPost({
        description: "Api to get device stream stats",
        path: '/getdevicestreamstats',
        summary: "Api to get device stream stats",
        parameters: {
            body: {
                description: "Enter IP and connected IP",
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

    public async GetConnectedDeviceStreamStats(req: IFilteredRequest<ReqEllvisschemas>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.GetConnectedDeviceStreamStats(req.body);
            res.setHeader('Cache-Control', "no-store")
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }


    /**
    * @description Api to get all alarms.
    */

    @ApiOperationPost({
        description: "Api to get all alarms",
        path: '/getalarmlist',
        summary: "Api to get all alarms",
        parameters: {
            body: {
                description: "Enter AlarmID",
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
    public async GetAlarmList(req: IFilteredRequest<AlarmList>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.GetAlarmList(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to change ip addresses",
        path: '/changeipaddresses',
        summary: "Api to change ip addresses",
        parameters: {
            body: {
                description: "Enter ETH",
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
    public async ChangeIpAddresses(req: IFilteredRequest<NetworkSettings>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.ChangeIpAddresses(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to change ip addresses",
        path: '/refreshstreambyid',
        summary: "Api to change ip addresses",
        parameters: {
            body: {
                description: "Refresh Stream by Id",
                required: false,
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
    public async GetStreamStatsbyId(req: IFilteredRequest<NetworkSettings>, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.GetStreamStatsbyId1(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null);
        }
    }


    public async getLicenses(req: any, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.getLicenses(req);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    public async chekKeylok(req: any, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.chekKeylok(req);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);

        }
    }

    public async SetHotBackupForEllvis(req: any, res: Response, next: NextFunction) {
        try {
            const requestResult = await ellvisServicesV1.SetHotBackupForEllvis(req?.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

}

export const ellvisControllerV1 = new EllvisControllerV1();