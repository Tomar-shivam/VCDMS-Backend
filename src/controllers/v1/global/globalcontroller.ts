import { NextFunction, response, Response } from 'express';
import { BaseController } from '../../basecontroller';
import { ReqEncoderschemas } from '../../../routes/v1/encoder/encoderschema';
import { globalServicesV1 } from '../../../services/v1/global/globalservices'
import { IFilteredRequest } from "../../../interfaces";
import { secretUtil } from "../../../utils/secretutil";
import { ApiPath, SwaggerDefinitionConstant, ApiOperationGet } from "swagger-express-ts"
import { ReqEllvisschemas } from '../../../routes/v1/ellvis/ellvisschema';
import Container from "../../../models/ellvis/container.model";
import { ConnectedDevice } from '../../../models/ellvis/connecteddevices.model';
import { ContainersStreamStats } from '../../../models/global/containerstreamstatsmodel';
import { SaveHistory } from '../../../models/global/savehistorymodel';
import { globalServicesForAutomatedWorkFlow } from "../../../services/v1/global/automatedworkflowservices"
import { AutomatedWorkFlowForOnBoardingDevice } from "../../../services/v1/global/automatedWorkflowForOnboardingDevice"
import fs from 'fs'

import logging from "../../../logging";

@ApiPath({
    path: "/api/v1",
    name: "Global Api Calls",
    security: { apiKeyHeader: [] },
})
class GlobalController extends BaseController {

    @ApiOperationGet({
        description: "Api to run process",
        path: '/runprocess',
        summary: "Api to run process",
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
    public async RunProcess(req: IFilteredRequest<null>, res: Response, next: NextFunction) {
        try {
            await globalServicesV1.SaveContainersAndStats();
        } catch (error) {
            return res.send(null)
        }
    }

    public async RefreshLegacy(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.RefreshLegacy(req.body.IP)
            return res.send(requestResult)
        } catch (error) {

        }
    }

    public async RunProcessCron() {
        try {
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info(`crone started`);
            }
            await globalServicesV1.SaveContainersAndStats();
            await globalServicesV1.SaveEncoder();
            await globalServicesV1.PingDevices();
            await globalServicesV1.checkDevicePrecentageForHotBackupDevices();
            await globalServicesForAutomatedWorkFlow.CheckAutomatedWorkFlow('');
            await AutomatedWorkFlowForOnBoardingDevice.checkAutomatedWorkflowForAutoUploadJSON();
            if (secretUtil.ENABLE_DEBUG_LOG) {
                logging.logger.info(`crone completed`);
            }
        } catch (error) {
            return null
        }
    }

    public async SetEllvisPassword(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.SetEllvisPassword(req.body)
            return res.send(requestResult);
        } catch (error) {
            return res.send(null)
        }
    }

    public async SetEncoderPassword(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.SetEncoderPassword(req.body)
            return res.send(requestResult);
        } catch (error) {
            return res.send(null)
        }
    }

    public async SetStreamPassword(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.SetStreamPassword(req.body)
            return res.send(requestResult);
        } catch (error) {
            return res.send(null)
        }
    }

    public async SendMailToAll(req: IFilteredRequest<null>, res: Response, next: NextFunction) {
        try {
            globalServicesV1.SendMailToAll()
            res.send("Function Called")
        } catch (error) {
            return res.send(null)
        }
    }

    public async SavePropertiesAndStatus(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.SavePropertiesAndStatus(req.body.ip, "manual")
            return res.send(requestResult)
        } catch (err) {
            return res.send(null)
        }
    }

    public async SaveContainersAndStatsByDeviceIP(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.SaveContainersAndStatsByDeviceIP(req.body.ip, 'manual');
            return res.send(requestResult);
        } catch (err) {
            return res.send(null)
        }
    }

    public async GetAllContainers(req: IFilteredRequest<Container>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.GetAllContainers(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }

    public async GetDevicesBySystem(req: IFilteredRequest<ReqEllvisschemas>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.GetDeviceBySystem(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }

    public async GetNetworkSettings(req: IFilteredRequest<ConnectedDevice>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.GetNetworkSettings(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }

    public async GetVersionLicensingInfo(req: IFilteredRequest<ConnectedDevice>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.GetVersionLicensingInfo(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }

    public async GetEncoderProperties(req: IFilteredRequest<ReqEncoderschemas>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.GetEncoderProperties(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }

    public async GetDevicesByCustomerID(req: IFilteredRequest<ReqEllvisschemas>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.GetDevicesByCustomerID(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }

    public async SaveHistory(req: IFilteredRequest<ContainersStreamStats>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.SaveHistory(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }

    public async SaveHistoryCron(req: IFilteredRequest<null>, res: Response, next: NextFunction) {
        try {
            globalServicesV1.SaveHistoryCron()
            return res.send("Work Started")
        } catch (error) {
            return res.send(null)
        }
    }

    public async GetGraphData(req: IFilteredRequest<SaveHistory>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.GetGraphData(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }
    public async getdeviceobject(req: IFilteredRequest<SaveHistory>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.getdeviceobject();
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }
    public async getbackendversion(req: IFilteredRequest<SaveHistory>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.getbackendversion();
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }

    public async GetLinkEfficiencyAndDropPercentage(req: IFilteredRequest<ContainersStreamStats>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.GetLinkEfficiencyAndDropPercentage(req.body)
            return res.send(requestResult)
        } catch (error) {
            return res.send(null)
        }
    }

    public async GetCron(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.GetCron();
            return res.send(requestResult)
        } catch (error) {
            return res.send({ ack: "0", message: "Something went wrong" })
        }
    }
    public async SaveCron(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.SaveCron(req.body);
            return res.send(requestResult)
        } catch (error) {
            return res.send({ ack: "0", message: "Something went wrong" })
        }
    }
    public async getSnmpDetails(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.getSnmpDetails();
            return res.send(requestResult)
        } catch (error) {
            return res.send({ ack: "0", message: "Something went wrong" })
        }
    }
    public async saveSnmpDetails(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.saveSnmpDetails(req.body);
            return res.send(requestResult)
        } catch (error) {
            return res.send({ ack: "0", message: "Something went wrong" })
        }
    }
    public async sendDefaultSNMPTrap(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await globalServicesV1.SendSnmpTrapCriticalRecieved('');
            return res.send(requestResult)
        } catch (error) {
            return res.send({ ack: "0", message: "Something went wrong" })
        }
    }
    public async downloadMIBFile(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let checkMibFile = fs.existsSync('/usr/share/snmp/mibs/RADIANT-VCDMS-MIB.txt')
            if(checkMibFile){
                return await globalServicesV1.downloadMIBFile(req, res);

            }else{
                return res.send(null);
            }
        } catch (error) {
            return res.send(null);
        }
    }

}

export const globalControllerV1 = new GlobalController();