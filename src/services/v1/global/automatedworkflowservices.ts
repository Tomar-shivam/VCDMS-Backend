import { Encoder, encoderModel } from '../../../models/global/encodermodel';
import { containerStreamStatsModel } from '../../../models/global/containerstreamstatsmodel';
import { encoderServicesV1 } from "../encoder/encoderservicesv1";
import { encoderControllerV1 } from '../../../controllers/v1/encoder/encodercontrollerv1';
import { customerDeviceModel } from '../../../models/ellvis/customerdevice.model';
let arr_encoders_ips: any = [];
let msg: any = [];
let streamData1: any;
let checkPropertiesChanges = false;
let bitrate = ['video1_bitrate', 'video2_bitrate', 'video3_bitrate', 'video4_bitrate']
let resolution = ['video1_output_resolution', 'video2_output_resolution', 'video3_output_resolution', 'video4_output_resolution']
let rateControl = ['video1_ratecontrol', 'video2_ratecontrol', 'video3_ratecontrol', 'video4_ratecontrol'];
let videoType = ['Video1', 'Video2', 'Video3', 'Video4'];
let audioType = ['Audio1', 'Audio2', 'Audio3', 'Audio4'];
let encoderNumber = ['<1>', '<2>', '<3>', '<4>'];
let videoEncoder = ['video1_encoder', 'video2_encoder', 'video3_encoder', 'video4_encoder']
let audioEncoder = ['audio1_encoder', 'audio2_encoder', 'audio3_encoder', 'audio4_encoder'];
let audioGain = ['audio1_gain', 'audio2_gain', 'audio3_gain', 'audio4_gain']
let videoIframeInterva = ['video1_iframe_interval', 'video2_iframe_interval', 'video3_iframe_interval', 'video4_iframe_interval'];
let videoBframeCount = ['video1_bframe_count', 'video2_bframe_count', 'video3_bframe_count', 'video4_bframe_count']
let videoFieldorder = ['video1_fieldorder', 'video2_fieldorder', 'video3_fieldorder', 'video4_fieldorder'];
let aspectRatio = ['video1_aspectratio', 'video2_aspectratio', 'video3_aspectratio', 'video4_aspectratio']
let HRDbuffersize = ['video1_h264_hrd_buffersize', 'video2_h264_hrd_buffersize', 'video3_h264_hrd_buffersize', 'video4_h264_hrd_buffersize']
let videoEncodingMode = ['video1_h264_encodingmode', 'video2_h264_encodingmode', 'video3_h264_encodingmode', 'video4_h264_encodingmode']
let audioSource = ['audio1_source', 'audio2_source', 'audio3_source', 'audio4_source'];
let videoSource = ['video1_source', 'video2_source', 'video3_source', 'video4_source'];
let videoInputResolution = ['video1_input_resolution', 'video2_input_resolution', 'video3_input_resolution', 'video4_input_resolution']
let videoInputResolution_VL = ['input1_resolution', 'input2_resolution', 'input3_resolution', 'input4_resolution']
let videoOutputResolution = ['video1_output_resolution', 'video2_output_resolution', 'video3_output_resolution', 'video4_output_resolution']
let videoInputSource = ['video1_in', 'video2_in', 'video3_in', 'video4_in'];
let audioInputSource = ['audio1_in', 'audio2_in', 'audio3_in', 'audio4_in'];
let videoInputSourceRm = ['video1_source', 'video2_source', 'video3_source', 'video4_source'];
let correctVideoBitRate = ['video1_bitrate', 'video2_bitrate', 'video3_bitrate', 'video4_bitrate'];
let audioInputSourceRm = ['audio1_source', 'audio2_source', 'audio3_source', 'audio4_source'];
class AutomatedWorkFlowServices {
    public CheckAutomatedWorkFlow = async (ip: any) => {
        streamData1 = await containerStreamStatsModel.find({});
        // here check which encoder have automated workflow properties enable

        // check OnBoardingRegion Devices and encoders
        let allOnBoardingDevices: any = await customerDeviceModel.find({ Region: "OnBoardingRegion" });
        let ipArrOfAllOnBoardinDevices: any = [];
        for (let i = 0; i < allOnBoardingDevices.length; i++) {
            ipArrOfAllOnBoardinDevices.push(allOnBoardingDevices[i].IP);
        }//end


        let encoders: any = ip ? await encoderModel.find({ peerIP: ip }) : await encoderModel.find({ peerIP: { $nin: ipArrOfAllOnBoardinDevices } });
        if (encoders.length > 0) {
            arr_encoders_ips = [];
            const promises = encoders.map((encoder) => {
                msg = [];
                if (encoder.status && encoder.status.status == 'error') {
                    this.ErrorModeEncoder(encoder);
                }
                else if (encoder.properties && (encoder.presetOptimization || encoder.srtOptimization)) {
                    checkPropertiesChanges = false;
                    if (encoder.presetOptimization) {
                        this.checkMulticastIp(encoder);
                        // this.correctVideoOutputResolution(encoder);
                        this.dashoutpuresolutionchange(encoder);
                        this.videoqbaSelect(encoder);
                        this.correctAspectRatioValue(encoder);
                        this.correctFieldOrder(encoder);
                        this.correctEncodingMode(encoder);
                        this.Vl4522SourceMatching(encoder);
                        this.CorrectVideo1IFrameIntervalAndBframeCount(encoder);
                        this.AutoSetAudioCodec(encoder);
                        this.correctVideoInputPerEncode(encoder);
                        this.correctHrdBufferValue(encoder);

                        this.correctVideoBitRate(encoder);
                        this.warningMessage(encoder);
                        this.warningMessageVideoEncoding(encoder);
                        this.warningMessageForAudioParms(encoder);
                        this.warningMessageInputIsEncodedTwice(encoder);

                        this.checkTimeToLive(encoder);
                        this.checkPassphraseForSrt(encoder);
                        this.checkPassPhrase(encoder)
                        this.checkPropgramPIDS(encoder);
                        // this.checkDestIpAndPort(encoder);
                        this.checkSourcePortForSRT(encoder);

                        this.check_TS_Type_For_QAM(encoder);
                        this.check_TS1_Bitrate_For_QAM64(encoder);
                        this.check_TS1_Bitrate_For_QAM256(encoder);

                        this.CheckEncoderIsSetToRun(encoder)
                    }
                    if (encoder.srtOptimization) {
                        this.optimizeSRT(encoder);
                    }
                    if (checkPropertiesChanges && encoder.properties.opstate !== 'Idle') {
                        arr_encoders_ips.push(encoder.peerIP)
                    }
                    try {
                        if (encoder.properties && checkPropertiesChanges) {
                            let req: any = {
                                body: {
                                    ip: encoder.peerIP,
                                    data: encoder.properties
                                }
                            }
                            let res, next;
                            const requestResult: any = encoderControllerV1.SaveSession(req, res, next);
                            // let updatedProperties={body:encoder.properties};       
                            // const requestResult: any = encoderServicesV1.SaveSession(updatedProperties, encoder.peerIP);  
                        }
                        // save message videoEncoder in modal
                        this.saveMessages(encoder);
                    } catch (error) {
                        return;
                    }
                }
            })
            await Promise.all(promises);
            if (arr_encoders_ips.length > 0) {
                let req: any = {
                    body: {
                        ipArray: arr_encoders_ips
                    }
                }
                let res, next;
                encoderControllerV1.StartEncodingMultiple(req, res, next);
            }
        }
    }

    ErrorModeEncoder = async (encoder) => {
        if (encoder.properties) {
            this.checkMulticastIp(encoder);
            arr_encoders_ips.push(encoder.peerIP)
            //  this.correctVideoOutputResolution(encoder);
            this.dashoutpuresolutionchange(encoder);
            this.videoqbaSelect(encoder);
            this.correctAspectRatioValue(encoder);
            this.correctFieldOrder(encoder);
            this.correctEncodingMode(encoder);
            this.Vl4522SourceMatching(encoder);
            this.CorrectVideo1IFrameIntervalAndBframeCount(encoder);
            this.AutoSetAudioCodec(encoder);
            this.correctVideoInputPerEncode(encoder);
            this.correctHrdBufferValue(encoder);

            this.correctVideoBitRate(encoder);
            this.warningMessage(encoder);
            this.warningMessageVideoEncoding(encoder);
            this.warningMessageForAudioParms(encoder);
            this.warningMessageInputIsEncodedTwice(encoder);

            //ts
            this.checkTimeToLive(encoder);
            this.checkPassphraseForSrt(encoder);
            this.checkPassPhrase(encoder)
            this.checkPropgramPIDS(encoder);
            //  this.checkDestIpAndPort(encoder);
            this.checkSourcePortForSRT(encoder);
            this.checkSourcePortForSRT(encoder);

            this.check_TS_Type_For_QAM(encoder);
            this.check_TS1_Bitrate_For_QAM64(encoder);
            this.check_TS1_Bitrate_For_QAM256(encoder);

            try {
                let updatedProperties = { body: encoder.properties };
                const requestResult: any = encoderServicesV1.SaveSession(updatedProperties, encoder.peerIP);
                if (requestResult && requestResult.status === "success") {
                    let device: any = customerDeviceModel.findOne({ IP: encoder.peerIP });
                    let reqq: any = {
                        body: {
                            ip: encoder.peerIP,
                            RegionID: device?.RegionID,
                            SystemID: device?.SystemID,
                            deviceip: encoder.peerIP
                        }
                    }
                    let res, next;
                    let requestResult1: any = await encoderControllerV1.StartEncoding(reqq, res, next);
                    if (requestResult1 && requestResult1.status !== "success" && requestResult1.device.opstate != "Running") {
                        encoderServicesV1.RebootDevice(encoder.peerIP);
                        return;
                    }
                }
            } catch (error) {
                return;
            }
        }
    }

    saveMessages = async (encoder) => {
        const msg1 = msg;
        if (encoder.properties && (encoder.srtOptimization || encoder.presetOptimization)) {
            encoderModel.updateOne({ peerIP: encoder.peerIP }, { warningMessagesArray: msg1 }, { new: true }, (err) => {
                if (err) return;
            })
            customerDeviceModel.updateOne({ IP: encoder.peerIP }, { warningMessagesArray: msg1 }, { new: true }, (err) => {
                if (err) return;
            })
        }
    }

    private isHd = (value) => {
        if (value) {
            let HdValueArr = ['1280_720P', '1920_1080I', '1920_1080P', '1280x720P', '1920x1080I', '1920x1080P']
            for (let i = 0; i < HdValueArr.length; i++) {
                if (value === HdValueArr[i]) {
                    return true;
                }
            }
            return false;
        }
    }

    private isSd = (value) => {
        if (value) {
            let SdValueArr = ['320_256P', '320_256I', "480_320P", "480_320I", '640_480P', '640_480I', '720_480P', '720_480I', '320x256P', '320x256I', '480x320P', '480x320I', '640x480P', '640x480I', '720x480P', '720x480I'];
            for (let i = 0; i < SdValueArr.length; i++) {
                if (value === SdValueArr[i]) {
                    return true;
                }
            }
            return false;
        }
    }

    optimizeSRT = async (encoder) => {
        if (encoder.properties) {
            let streamData: any = [];
            for (let i = 0; i < streamData1.length; i++) {
                let data = streamData1[i].peerIP.split(':')[0];
                if (data == encoder.properties.ts_ip.split(':')[0])
                    streamData.push(streamData1[i]);
            }
            if (streamData.length == 0) {
                msg.push("Encoders Stream not under ELLVIS9000V3");
                return;
            }
            // ts_type
            if (encoder.properties.ts_type == 'SPTS') {
                for (let i = 0; i < parseInt(encoder.properties.encoder_count); i++) {
                    for (let j = 0; j < streamData.length; j++) {
                        if (encoder.properties[`ts${i + 1}_port`] == streamData[j].sourcePort &&
                            (encoder.properties[`ts${i + 1}_delivery`] == 'SRT' &&
                                streamData[j].sourceProtocol == 'SRT') &&
                            (parseFloat(streamData[j].inputStats.recv.mbitRate) > 1.5 && streamData[j].inputStats
                                && parseFloat(streamData[j].inputStats.link.bandwidth) < parseFloat(streamData[j].inputStats.recv.mbitRate))) {
                            let bitrate = (parseFloat(streamData[j].inputStats.recv.mbitRate) - parseFloat(streamData[j].inputStats.link.bandwidth)) * 1024;
                            let calculated_value = (bitrate * 100) / (parseFloat(streamData[j].inputStats.recv.mbitRate) * 1024);
                            let encoderBitrate = (parseInt(encoder.properties[`video${i + 1}_bitrate`]) * calculated_value) / 100;
                            if (encoder.properties.output_bitrate_mode == "AUTO") {
                                checkPropertiesChanges = true;
                                if ((parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoderBitrate) < 500) {
                                    encoder.properties[`video${i + 1}_bitrate`] = 500;
                                } else { encoder.properties[`video${i + 1}_bitrate`] = parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoderBitrate }
                            }
                            else if (encoder.properties.output_bitrate_mode == "MANUAl") {
                                checkPropertiesChanges = true;
                                if ((parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoderBitrate) < 500) {
                                    encoder.properties[`video${i + 1}_bitrate`] = 500;
                                    encoder.properties[`ts${i + 1}_bitrate`] = 500;
                                } else {
                                    encoder.properties[`video${i + 1}_bitrate`] = parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoderBitrate;
                                    encoder.properties[`ts${i + 1}_bitrate`] = parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoderBitrate;
                                }

                            }
                        }
                    }
                }
            } else if (encoder.properties.ts_type == 'MPTS') {
                for (let j = 0; j < streamData.length; j++) {
                    if (encoder.properties[`ts1_port`] == streamData[j].sourcePort &&
                        (encoder.properties[`ts1_delivery`] == 'SRT' && streamData[j].sourceProtocol == 'SRT')
                        && parseFloat(streamData[j].inputStats.recv.mbitRate) > 1.5 && streamData[j].inputStats &&
                        parseFloat(streamData[j].inputStats.link.bandwidth) < parseFloat(streamData[j].inputStats.recv.mbitRate)
                        && (parseFloat(streamData[j].inputStats.recv.mbitRate) > 1.5 && streamData[j].inputStats &&
                            parseFloat(streamData[j].inputStats.link.bandwidth) < parseFloat(streamData[j].inputStats.recv.mbitRate))) {

                        let bitrate = (parseFloat(streamData[j].inputStats.recv.mbitRate) - parseFloat(streamData[j].inputStats.link.bandwidth)) * 1024;
                        let calculated_value = (bitrate * 100) / (parseFloat(streamData[j].inputStats.recv.mbitRate) * 1024);

                        for (let i = 0; i < parseInt(encoder.properties.encoder_count); i++) {
                            let encoder_bitrate = (parseInt(encoder.properties[`video${i + 1}_bitrate`]) * calculated_value) / 100;

                            if (encoder.properties.output_bitrate_mode == "AUTO") {
                                checkPropertiesChanges = true;
                                if ((parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoder_bitrate) < 500) {
                                    encoder.properties[`video${i + 1}_bitrate`] = 500;
                                } else { encoder.properties[`video${i + 1}_bitrate`] = parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoder_bitrate; }
                            }
                            else if (encoder.properties.output_bitrate_mode == "MANUAl") {
                                checkPropertiesChanges = true;
                                if ((parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoder_bitrate) < 500) {
                                    encoder.properties[`video${i + 1}_bitrate`] = 500;
                                    encoder.properties[`ts${i + 1}_bitrate`] = 500;
                                } else {
                                    encoder.properties[`video${i + 1}_bitrate`] = parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoder_bitrate;
                                    encoder.properties[`ts${i + 1}_bitrate`] = parseInt(encoder.properties[`video${i + 1}_bitrate`]) - encoder_bitrate;
                                }
                            }
                        }
                    }
                }
            }

            for (let i = 0; i < parseInt(encoder.properties.encoder_count); i++) {
                let setResolution;
                if (encoder.properties.model.includes("RM11") && encoder.properties[resolution[i]] == 'input') {
                    setResolution = encoder.properties.input_resolution;
                } else { setResolution = encoder.properties[resolution[i]]; }
                if (encoder.properties.model.includes("VL45") && encoder.properties[resolution[i]] == 'input') {
                    setResolution = encoder.properties[`input${i + 1}_resolution`];
                } else { setResolution = encoder.properties[resolution[i]]; }

                if (encoder.properties[`video${i + 1}_encoder`] == "MPEG2" && parseFloat(encoder.properties[`video${i + 1}_bitrate`]) < 7000) {
                    if (this.isHd(setResolution)) {
                        // checkPropertiesChanges = true;
                        encoder.properties[`video${i + 1}_output_resolution`] = "720_480P";
                        // encoder.properties[`video${i + 1}_bitrate`] = "500";
                        // if gose to less then < 500
                    }
                } else if (encoder.properties[`video${i + 1}_encoder`] == "H264" && parseFloat(encoder.properties[`video${i + 1}_bitrate`]) < 2048) {
                    if (this.isHd(setResolution)) {
                        // checkPropertiesChanges = true;
                        encoder.properties[`video${i + 1}_output_resolution`] = "720_480P";
                        // encoder.properties[`video${i + 1}_bitrate`] = "1000";
                    }
                }
            }

            for (let i = 0; i < parseInt(encoder.properties.encoder_count); i++) {
                if (encoder.properties[`ts${i + 1}_delivery`] == 'SRT' && encoder.properties[`ts${i + 1}_enableadaptivebitrate`] != 'Y') {
                    checkPropertiesChanges = true;
                    encoder.properties[`ts${i + 1}_enableadaptivebitrate`] = 'Y';
                }
            }
        }
    }

    dashoutpuresolutionchange = async (req) => {
        if (req.properties) {
            for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                if (req.properties.output_mode == "TCP") {
                    if (req.properties[`video${i + 1}_output_resolution`] != 'input' && req.properties[`video${i + 1}_output_resolution`].includes('I')) {
                        req.properties[`video${i + 1}_output_resolution`] = req.properties[`video${i + 1}_output_resolution`].replace('I', 'P');
                        checkPropertiesChanges = true;
                    }
                }
            }
        }
    }

    videoqbaSelect = async (req) => {
        if (req.properties) {
            for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                if (req.properties.model == "VL4510" || req.properties.model == "VL4510C" || req.properties.model == "VL4522") {
                    if (req.properties.legacy_stb_support == 1) {
                        if (req.properties[`video${i + 1}_qba`] != 'Y') {
                            checkPropertiesChanges = true;
                            req.properties[`video${i + 1}_qba`] = 'Y';
                        }
                    }
                }
                if (req.properties.model.substring(0, 4) == "VL45") {
                    if (Number.parseInt(req.properties[`ts${i + 1}_noemptyaf`]) != 1) {
                        checkPropertiesChanges = true;
                        req.properties[`ts${i + 1}_noemptyaf`] = '1';
                    }
                }
            }
        }
    }

    correctAspectRatioValue = async (req) => {
        try {
            if (req.properties) {
                let setResolution = '';
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties.model.includes("RM11")) {
                        if (req.properties[resolution[i]] == 'input') {
                            setResolution = req.properties.input_resolution;
                        } else {
                            setResolution = req.properties[resolution[i]];
                        }
                    }
                    else if (req.properties.model.includes("VL45")) {
                        if (req.properties[resolution[i]] == 'input') {
                            setResolution = req.properties[`input${i + 1}_resolution`];
                        } else {
                            setResolution = req.properties[resolution[i]];
                        }
                    }
                    if (setResolution) {
                        if (setResolution == '1280_720P' || setResolution == '1920_1080I' || setResolution == '1920_1080P' || setResolution == '1280x720P' || setResolution == '1920x1080I' || setResolution == '1920x1080P') {
                            if (req.properties[aspectRatio[i]] !== '16_9') {
                                checkPropertiesChanges = true;
                                req.properties[aspectRatio[i]] = '16_9';
                            }
                        }
                    }
                }
            }
            return;
        } catch (error) {
            return;
        }
    }

    correctFieldOrder = async (req) => {
        try {
            if (req.properties) {
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[videoEncoder[i]]) {
                        if (req.properties[videoEncoder[i]] == "MPEG2") {
                            if (req.properties[videoFieldorder[i]] && req.properties[videoFieldorder[i]] != "TFF") {
                                checkPropertiesChanges = true;
                                req.properties[videoFieldorder[i]] = "TFF";
                            }
                        }
                        if (req.properties[videoFieldorder[i]] && req.properties[videoEncoder[i]] == "H264") {
                            if (req.properties[resolution[i]] == '320_256I' || req.properties[resolution[i]] == '480_320I' || req.properties[resolution[i]] == '640_480I' || req.properties[resolution[i]] == '720_480I' || req.properties[resolution[i]] == '1920_1080I') {
                                if (req.properties[videoFieldorder[i]] != "TFF") {
                                    checkPropertiesChanges = true;
                                    req.properties[videoFieldorder[i]] = "TFF";
                                }
                            }
                        }
                    }
                }
            }
            return;
        } catch (error) {
            return;
        }
    }

    correctEncodingMode = async (req) => {
        try {
            if (req.properties) {
                let setResolution = '';
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[videoEncoder[i]]) {
                        if (req.properties[videoEncoder[i]] == "H264") {
                            if (req.properties.model.includes("RM11")) {
                                if (req.properties[resolution[i]] == 'input') {
                                    // checkPropertiesChanges=true;
                                    setResolution = req.properties.input_resolution;
                                } else {
                                    // checkPropertiesChanges=true;
                                    setResolution = req.properties[resolution[i]];
                                }
                            }
                            else if (req.properties.model.includes("VL45")) {
                                if (req.properties[resolution[i]] == 'input') {
                                    setResolution = req.properties[`input${i + 1}_resolution`];
                                } else {
                                    setResolution = req.properties[resolution[i]];
                                }
                            }
                            const video_HD = this.isHd(setResolution);
                            const video_SD = this.isSd(setResolution);
                            if (req.properties[videoEncodingMode[i]] == "MBAFF") {
                                if (video_HD) {
                                    //video4_bitrate/1000!<5
                                    if (Number.parseInt(req.properties[bitrate[i]]) / 1024 < 5) {
                                        checkPropertiesChanges = true;
                                        req.properties[videoEncodingMode[i]] = "ARF";
                                    }
                                }
                                if (video_SD) {
                                    // video4_bitrate/1000!<1.2
                                    if (Number.parseInt(req.properties[bitrate[i]]) / 1024 < 1.2) {
                                        checkPropertiesChanges = true;
                                        req.properties[videoEncodingMode[i]] = "ARF";
                                    }
                                }
                            }
                            //bitrate is below 5M for HD and 1.2M for SD 
                        }
                    }
                }
            }
            return;
        } catch (error) {
            return;
        }
    }

    Vl4522SourceMatching = async (req) => {
        try {
            if (req.properties && req.properties.model.includes("VL4522")) {
                // video1_source
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[audioSource[i]]) {
                        if (req.properties[audioSource[i]] != req.properties[videoSource[i]] && req.properties[audioSource[i]]) {
                            checkPropertiesChanges = true;
                            req.properties[audioSource[i]] = req.properties[videoSource[i]];
                        }
                    }
                }
            }
            return;
        } catch (error) {
            return
        }
    }

    AutoSetAudioCodec = async (req) => {
        try {
            if (req.properties) {
                if (req.properties.output_mode == "TCP") {
                    for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                        if (req.properties.model.includes("VL45")) {
                            if (req.properties[`audio${i + 1}_enc`]) {
                                if (req.properties[`audio${i + 1}_enc`] != "AAC_LC") {
                                    checkPropertiesChanges = true;
                                    req.properties[`audio${i + 1}_enc`] = "AAC_LC";
                                }
                            }
                        }
                        else if (req.properties[audioEncoder[i]]) {
                            if (req.properties[audioEncoder[i]] != "AAC_LC") {
                                checkPropertiesChanges = true;
                                req.properties[audioEncoder[i]] = "AAC_LC";
                            }
                        }
                    }
                }
            }
            return;
        } catch (error) {

        }
    }

    correctVideoInputPerEncode = async (req) => {
        try {
            if (req.properties) {
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[videoInputSource[i]]) {
                        if (req.properties[videoInputSource[i]] != req.properties[audioInputSource[i]]) {
                            checkPropertiesChanges = true;
                            req.properties[audioInputSource[i]] = req.properties[videoInputSource[i]];
                        }
                    }
                }
            }
            return;
        } catch (error) {
        }
    }

    CorrectVideo1IFrameIntervalAndBframeCount = async (req) => {
        try {
            if (req.properties) {
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[videoEncoder[i]]) {
                        if (req.properties[videoEncoder[i]] == "MPEG2") {
                            if (req.properties[videoBframeCount[i]] != 2) {
                                checkPropertiesChanges = true;
                                req.properties[videoBframeCount[i]] = '2';
                            }
                            if (Number.parseInt(req.properties[videoIframeInterva[i]]) < 12 || Number.parseInt(req.properties[videoIframeInterva[i]]) > 15) {
                                if (Number.parseInt(req.properties[videoIframeInterva[i]]) < 12) {
                                    checkPropertiesChanges = true;
                                    req.properties[videoIframeInterva[i]] = '12';
                                }
                                if (Number.parseInt(req.properties[videoIframeInterva[i]]) > 15) {
                                    checkPropertiesChanges = true;
                                    req.properties[videoIframeInterva[i]] = '15';
                                }
                            }
                            if (Number.parseInt(req.properties[videoIframeInterva[i]]) > 12 && Number.parseInt(req.properties[videoIframeInterva[i]]) < 15) {
                                if (Number.parseInt(req.properties[videoIframeInterva[i]]) <= 13) {
                                    checkPropertiesChanges = true;
                                    req.properties[videoIframeInterva[i]] = '12';
                                } else {
                                    checkPropertiesChanges = true;
                                    req.properties[videoIframeInterva[i]] = '15';
                                }
                            }
                            //for video1_bframe_count -for  MPEG2 value is 2
                        }

                        if (req.properties[videoEncoder[i]] == "H264") {
                            // for bFrame_count
                            if (Number.parseInt(req.properties[videoBframeCount[i]]) < 0) {
                                checkPropertiesChanges = true;
                                req.properties[videoIframeInterva[i]] = '0';
                            }
                            if (Number.parseInt(req.properties[videoBframeCount[i]]) > 4) {
                                checkPropertiesChanges = true;
                                req.properties[videoBframeCount[i]] = '4';
                            }
                            // for iFrame_Count
                            if (Number.parseInt(req.properties[videoIframeInterva[i]]) < 10 || Number.parseInt(req.properties[videoIframeInterva[i]]) > 240) {
                                if (Number.parseInt(req.properties[videoIframeInterva[i]]) < 10) {
                                    req.properties[videoIframeInterva[i]] = '10';
                                    if (Number.parseInt(req.properties[videoIframeInterva[i]]) % (Number.parseInt(req.properties[videoBframeCount[i]]) + 1) > 0) {
                                        for (let j = 10; j < 125; j++) {
                                            if (j % (Number.parseInt(req.properties[videoBframeCount[i]]) + 1) == 0) {
                                                checkPropertiesChanges = true;
                                                req.properties[videoIframeInterva[i]] = String(j);
                                                break;
                                            }
                                        }
                                    }
                                }
                                if (Number.parseInt(req.properties[videoIframeInterva[i]]) > 240) {
                                    req.properties[videoIframeInterva[i]] = '240';
                                    if (Number.parseInt(req.properties[videoIframeInterva[i]]) % (Number.parseInt(req.properties[videoBframeCount[i]]) + 1) > 0) {
                                        for (let j = 240; j > 125; j--) {
                                            if (j % (Number.parseInt(req.properties[videoBframeCount[i]]) + 1) == 0) {
                                                checkPropertiesChanges = true;
                                                req.properties[videoIframeInterva[i]] = String(j);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            else {
                                if (Number.parseInt(req.properties[videoIframeInterva[i]]) > 125) {
                                    if (Number.parseInt(req.properties[videoIframeInterva[i]]) % (Number.parseInt(req.properties[videoBframeCount[i]]) + 1) > 0) {
                                        let iFrameValue = Number.parseInt(req.properties[videoIframeInterva[i]]);
                                        for (let j = iFrameValue; j <= 240; j++) {
                                            if (j % (Number.parseInt(req.properties[videoBframeCount[i]]) + 1) == 0) {
                                                checkPropertiesChanges = true;
                                                req.properties[videoIframeInterva[i]] = String(j);
                                                break;
                                            }
                                        }
                                    }
                                } else {
                                    if (Number.parseInt(req.properties[videoIframeInterva[i]]) % (Number.parseInt(req.properties[videoBframeCount[i]]) + 1) > 0) {
                                        let iFrameValue = Number.parseInt(req.properties[videoIframeInterva[i]]);
                                        for (let j = iFrameValue; j >= 10; j--) {
                                            if (j % (Number.parseInt(req.properties[videoBframeCount[i]]) + 1) == 0) {
                                                checkPropertiesChanges = true;
                                                req.properties[videoIframeInterva[i]] = String(j);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return;
        } catch (error) {
            return;
        }
    }

    public correctHrdBufferValue = async (req) => {
        //HRDmax=1718750.8/video bitrate (bps)
        try {
            for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                if (req.properties[HRDbuffersize[i]]) {
                    if (req.properties[HRDbuffersize[i]] != 'auto') {
                        const ranges = [250, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000]
                        const videoBitrate = req.properties[bitrate[i]] * 1000; //1024*8 // convert into kbs bps
                        let HrdBuffer = Math.round((1718750 * 8 / videoBitrate) * 1000);
                        if (HrdBuffer <= 250) {
                            checkPropertiesChanges = true;
                            HrdBuffer = 250;

                        }
                        else if (HrdBuffer >= 2000) {
                            checkPropertiesChanges = true;
                            HrdBuffer = 2000;
                        }
                        else {
                            for (let r = 1; r < ranges.length; r++) {
                                if (HrdBuffer < ranges[r]) {
                                    let high = ranges[r] - 50;
                                    let low = ranges[r - 1]
                                    if (HrdBuffer > high) {
                                        checkPropertiesChanges = true;
                                        HrdBuffer = ranges[r];
                                    }
                                    else {
                                        checkPropertiesChanges = true;
                                        HrdBuffer = low;
                                    }
                                }
                            }
                        }
                        if (req.properties[HRDbuffersize[i]] > HrdBuffer) {
                            checkPropertiesChanges = true;
                            req.properties[HRDbuffersize[i]] = HrdBuffer.toString();
                        }
                    }
                }
            }
            return;
        } catch (error) {
            return;
        }
    }

    //Options are input – sets output resolution same as on the input
    public correctVideoOutputResolution = async (req) => {
        if (req.properties) {
            try {
                if (req.properties.model.includes("VL45")) {
                    for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                        if (req.properties[videoOutputResolution[i]] == 'input') {
                            checkPropertiesChanges = true;
                            req.properties[videoOutputResolution[i]] = req.properties[videoInputResolution_VL[i]];
                        }
                    }
                    return;
                }
                else {
                    for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                        if (req.properties[videoOutputResolution[i]] == 'input') {
                            checkPropertiesChanges = true;
                            req.properties[videoOutputResolution[i]] = req.properties[videoInputResolution[i]];
                        }
                    }
                    return;
                }
            } catch (error) {
                return
            }
        }
    }

    public correctVideoBitRate = async (req) => {
        if (req.properties) {
            try {
                let setResolution = '';
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[videoEncoder[i]]) {
                        if (req.properties.model.includes("RM11")) {
                            if (req.properties[resolution[i]] == 'input') {
                                setResolution = req.properties.input_resolution;
                            } else {
                                setResolution = req.properties[resolution[i]];
                            }
                        }
                        else if (req.properties.model.includes("VL45")) {
                            if (req.properties[resolution[i]] == 'input') {
                                setResolution = req.properties[`input${i + 1}_resolution`];
                            } else {
                                setResolution = req.properties[resolution[i]];
                            }
                        }
                        let checkSd = this.isSd(setResolution);
                        let checkHD = this.isHd(setResolution);
                        if (req.properties[videoEncoder[i]] == "MPEG2") {
                            if (checkSd) {
                                if (Number.parseInt(req.properties[correctVideoBitRate[i]]) < 1024) {
                                    checkPropertiesChanges = true;
                                    req.properties[correctVideoBitRate[i]] = '1024';
                                } else if (Number.parseInt(req.properties[correctVideoBitRate[i]]) > 15 * 1024) {
                                    checkPropertiesChanges = true;
                                    req.properties[correctVideoBitRate[i]] = '15360';
                                }
                            }
                            if (checkHD) {
                                if (Number.parseInt(req.properties[correctVideoBitRate[i]]) < 7 * 1024) {
                                    checkPropertiesChanges = true;
                                    req.properties[correctVideoBitRate[i]] = '7168';
                                } else if (Number.parseInt(req.properties[correctVideoBitRate[i]]) > 24 * 1024) {
                                    checkPropertiesChanges = true;
                                    req.properties[correctVideoBitRate[i]] = '24576';
                                }
                            }
                        }
                        if (req.properties[videoEncoder[i]] == "H264") {
                            if (checkSd) {
                                if (Number.parseInt(req.properties[correctVideoBitRate[i]]) < 500) {
                                    checkPropertiesChanges = true;
                                    req.properties[correctVideoBitRate[i]] = '500';
                                } else if (Number.parseInt(req.properties[correctVideoBitRate[i]]) > 8 * 1024) {
                                    checkPropertiesChanges = true;
                                    req.properties[correctVideoBitRate[i]] = '8192';
                                }
                            }
                            if (checkHD) {
                                if (Number.parseInt(req.properties[correctVideoBitRate[i]]) < 2 * 1024) {
                                    checkPropertiesChanges = true;
                                    req.properties[correctVideoBitRate[i]] = '2048';
                                } else if (Number.parseInt(req.properties[correctVideoBitRate[i]]) > 24 * 1024) {
                                    checkPropertiesChanges = true;
                                    req.properties[correctVideoBitRate[i]] = '24576';
                                }
                            }
                        }
                    }
                }
                return;
            } catch {
                return
            }
        }
    }

    public warningMessage = async (req) => {
        try {
            if (req.properties) {
                let msg1 = "Possible Bandwidth Recovery for Encoder:";
                let msg2 = "Possible Reduced Video Quality for Encoder:";
                let setResolution = '';
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[videoEncoder[i]]) {
                        if (req.properties.model.includes("RM11")) {
                            if (req.properties[resolution[i]] == 'input') {
                                setResolution = req.properties.input_resolution;
                            } else {
                                setResolution = req.properties[resolution[i]];
                            }
                        }
                        else if (req.properties.model.includes("VL45")) {
                            if (req.properties[resolution[i]] == 'input') {
                                setResolution = req.properties[`input${i + 1}_resolution`];
                            } else {
                                setResolution = req.properties[resolution[i]];
                            }
                        }
                        let checkSd = this.isSd(setResolution);
                        let checkHD = this.isHd(setResolution);
                        if (req.properties[videoEncoder[i]] == "MPEG2") {
                            if (checkSd) {
                                //if MPEG2 SD video is encoded at >6M bitrate*1000
                                if (Number.parseInt(req.properties[bitrate[i]]) > (6 * 1024)) {
                                    msg.push(`${msg1} ${encoderNumber[i]}`);
                                }
                            }
                            if (checkHD) {
                                //MPEG2 HD video is set to <9M
                                if (Number.parseInt(req.properties[bitrate[i]]) < (9 * 1024)) {
                                    msg.push(`${msg2} ${encoderNumber[i]}`);
                                }
                            }
                        }
                        if (req.properties[videoEncoder[i]] == "H264") {
                            if (checkSd) {
                                //h.264 SD video is encoded at >2M bitrate 
                                if (Number.parseInt(req.properties[bitrate[i]]) > (2 * 1024)) {
                                    msg.push(`${msg1} ${encoderNumber[i]}`);
                                }
                            }
                            if (checkHD) {
                                //h.264 HD is set to <3M 
                                if (Number.parseInt(req.properties[bitrate[i]]) < (3 * 1024)) {
                                    msg.push(`${msg2} ${encoderNumber[i]}`);
                                }
                            }
                        }
                    }

                }
            }
            return;
        } catch (error) {
            return;
        }
    }

    public warningMessageVideoEncoding = async (req) => {
        // "video1_ratecontrol": "CBR",
        try {
            const message = "Video Encoding is not CBR";
            if (req.properties) {
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[rateControl[i]]) {
                        if (req.properties[rateControl[i]] != "CBR" && req.properties[rateControl[i]] !== undefined) {
                            msg.push(`${videoType[i]}: ${message}`);
                        }
                    }
                }
            }
            return;
        } catch (error) {
            return;
        }
    }

    public warningMessageForAudioParms = async (req) => {
        try {
            if (req.properties) {
                const message = "AC3 bitrate is not 192k";
                const message1 = "Check Audio Gain for Encoder";

                //Show message “AC3 bitrate is not 192k” when audio codec is set AC3 and bitrate is different than 192k  
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties.model.includes("VL45")) {
                        if (req.properties[`audio${i + 1}_enc`]) {
                            if (req.properties[`audio${i + 1}_enc`] == "AC3" && req.properties[`audio${i + 1}_enc`]) {
                                if (req.properties[`audio${i + 1}_bitrate`] != "192000") {
                                    msg.push(`${audioType[i]}: ${message}`);
                                }
                            }
                        }
                    }
                    else if (req.properties[audioEncoder[i]]) {
                        if (req.properties[audioEncoder[i]] == "AC3" && req.properties[audioEncoder[i]]) {
                            if (req.properties[`audio${i + 1}_bitrate`] != "192000") {
                                msg.push(`${audioType[i]}: ${message}`);
                            }
                        }
                    }
                    if (req.properties[audioGain[i]]) {
                        //Show warning message “Check Audio Gain for Encoder: <enc number>” when audio gain is outside of -6db to 6db
                        if (Number.parseInt(req.properties[audioGain[i]])) {
                            if (Number.parseInt(req.properties[audioGain[i]]) < -6 || Number.parseInt(req.properties[audioGain[i]]) > 6) {
                                msg.push(`${message1} : ${encoderNumber[i]}`);
                            }
                        }
                    }
                }
            }
            return
        } catch (error) {
            return;
        }
    }

    warningMessageInputIsEncodedTwice = async (req) => {
        //Possible Bandwidth Recovery
        const message = "Possible Bandwidth Recovery";
        if (req.properties) {
            if (req.properties.video_mode != '1xHD' && req.properties.model.includes("VL45")) {
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    for (let j = i + 1; j < Number.parseInt(req.properties.encoder_count); j++) {
                        if (req.properties[videoSource[i]]) {
                            if (req.properties[videoSource[i]] == req.properties[videoSource[j]]) {
                                if (req.properties[`input${i + 1}_resolution`] == req.properties[`input${j + 1}_resolution`]) {
                                    msg.push(`${videoType[i]}: ${message}`);
                                }
                            }
                        }
                    }
                }
            }
        }
        // else{
        //     for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
        //         for (let j = i+1; j < 4; j++) {
        //             if(req.properties[videoInputSourceRm[i]]){
        //                 if(req.properties[videoInputSourceRm[i]]==req.properties[videoInputSourceRm[j]]){
        //                     if(req.properties[videoInputResolution[i]]==req.properties[videoInputResolution[j]]){
        //                         msg.push(`${videoType[i]}: ${message}`);
        //                     }
        //                 }
        //             }
        //         }                
        //     } 
        // }
    }

    // TS Parameter
    public checkTimeToLive = async (req) => {
        try {
            let message = 'Check Time to Live for Encoder:';
            if (req.properties) {
                for (let i = 0; i < Number.parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[`ts${i + 1}_timeToLive`]) {
                        if (Number.parseInt(req.properties[`ts${i + 1}_timeToLive`]) == 0) {
                            checkPropertiesChanges = true;
                            req.properties[`ts${i + 1}_timeToLive`] = '64';
                        }
                        if (Number.parseInt(req.properties[`ts${i + 1}_timeToLive`]) == 1) {
                            msg.push(`${message} ${encoderNumber[i]}`);
                        }
                    }
                }
            }
            return;
        }
        catch (err) {
            return;
        }
    }

    //Ts parameter--------
    public checkPassPhrase = async (req) => {
        try {
            if (req.properties) {
                for (let i = 0; i < parseInt(req.properties.encoder_count); i++) {
                    if (Number.parseInt(req.properties[`ts${i + 1}_passphrase`].length) < 10 && Number.parseInt(req.properties[`ts${i + 1}_passphrase`].length) != 0) {
                        checkPropertiesChanges = true;
                        req.properties[`ts${i + 1}_passphrase`] = "";
                    }
                }
            }
            return;
        } catch (error) {
            return;
        }
    }

    public checkPassphraseForSrt = async (req) => {
        if (req.properties) {
            try {
                for (let i = 0; i < parseInt(req.properties.encoder_count); i++) {
                    if (req.properties[`ts${i + 1}_delivery`] == 'SRT' && req.properties[`ts${i + 1}_encryption`] == '0') {
                        if (req.properties[`ts${i + 1}_passphrase`]) {
                            checkPropertiesChanges = true;
                            req.properties[`ts${i + 1}_passphrase`] = '';
                        }
                    } else if (req.properties[`ts${i + 1}_delivery`] == 'SRT' && Number.parseInt(req.properties[`ts${i + 1}_passphrase`].length) >= 10) {
                        checkPropertiesChanges = true;
                        req.properties[`ts${i + 1}_encryption`] = '32';
                    }
                }
                return;
            } catch (error) {
                return;
            }
        }
    }

    public checkPropgramPIDS = async (req) => {
        try {
            if (req.properties) {
                let arr: string[] = ['id', 'audio_pid', 'pmt_pid', 'video_pid'];
                if (req.properties && req.properties[`ts_type`] == 'MPTS') {
                    for (let i = 1; i <= Number.parseInt(req.properties.encoder_count); i++) {
                        // internal checking within a program
                        for (let j = 0; j < 3; j++) {
                            for (let k = j + 1; k < 4; k++) {
                                if (Number.parseInt(req.properties[`program${i}_${arr[j]}`]) == Number.parseInt(req.properties[`program${i}_${arr[k]}`])) {
                                    this.checkPropgramPIDS_if_changed(req);
                                    return;
                                }
                            }
                        }
                        // external checking within whole encoder
                        for (let m = i + 1; m <= Number.parseInt(req.properties.encoder_count); m++) {
                            for (let j = 0; j < 4; j++) {
                                for (let k = 0; k < 4; k++) {
                                    if (Number.parseInt(req.properties[`program${i}_${arr[j]}`]) == Number.parseInt(req.properties[`program${m}_${arr[k]}`])) {
                                        this.checkPropgramPIDS_if_changed(req);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }

                if (req.properties && req.properties[`ts_type`] == 'SPTS') {
                    for (let i = 1; i < Number.parseInt(req.properties.encoder_count) + 1; i++) {
                        // internal checking within a program
                        for (let j = 0; j < 3; j++) {
                            for (let k = j + 1; k < 4; k++) {
                                let c = `program${i}_${arr[j]}`;
                                let d = `program${i}_${arr[k]}`;
                                if (req.properties[`program${i}_${arr[j]}`] == req.properties[`program${i}_${arr[k]}`]) {
                                    this.checkPropgramPIDS_if_changed(req);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
            return;
        } catch (error) {
            return;
        }
    }

    public checkPropgramPIDS_if_changed = (req: any) => {
        try {
            if (req.properties) {
                checkPropertiesChanges = true;
                for (let i = 1; i < Number.parseInt(req.properties.encoder_count) + 1; i++) {
                    if (req.properties[`program${i}_id`]) {
                        req.properties[`program${i}_id`] = i.toString();
                    }
                    if (req.properties[`program${i}_audio_pid`]) {
                        req.properties[`program${i}_audio_pid`] = (50 + i).toString();
                    }
                    if (req.properties[`program${i}_pcr_pid`]) {
                        req.properties[`program${i}_pcr_pid`] = (60 + i).toString();
                    }
                    if (req.properties[`program${i}_pmt_pid`]) {
                        req.properties[`program${i}_pmt_pid`] = (40 + i).toString();
                    }
                    if (req.properties[`program${i}_video_pid`]) {
                        req.properties[`program${i}_video_pid`] = (60 + i).toString();
                    }
                }
                return;
            }
        } catch (error) {
            return;
        }
    }

    // For SPTS is destination IP address is the same destination ports must be different and vice versa.

    // public checkDestIpAndPort= async (req) => {
    //     if (req.properties) {
    //         if (req.properties['ts_type'] == 'SPTS') {
    //             let en_count = req.properties.encoder_count;
    //             for (let i = 0; i < en_count; i++) {
    //                 for (let j = i + 1; j < en_count; j++) {
    //                     if ((req.properties[`ts${i}_ip`] == req.properties[`ts${j}_ip`]) && (req.properties[`ts${i}_port`] == req.properties[`ts${j}_port`]) && (req.properties[`ts${j}`])) {

    //                     }
    //                 }
    //             }        
    //         }  
    //     }    
    // }

    // For SRT destination ip addresses cannot be multicast. Multicast ip addresses are in the range of 224.0. 0.0 through 239.255. 255.255 
    public IPtoNum = (ip) => {
        return Number(
            ip.split(".")
                .map(d => ("000" + d).substr(-3))
                .join("")
        );
    }

    public checkIPforSRT = (ip) => {
        let start = "224.0. 0.0";
        let end = "239.255.255.255";
        if (this.IPtoNum(start) < this.IPtoNum(ip) && this.IPtoNum(end) > this.IPtoNum(ip)) {
            return true;
        }
        else return false;
    }

    public checkMulticastIp = async (req) => {
        if (req.properties) {
            let en_count = req.properties.encoder_count;
            let message = 'Destination ip addresses cannot be multicast for Encoder: ';
            for (let k = 1; k < Number.parseInt(en_count) + 1; k++) {
                if (req.properties[`ts${k}_delivery`] == 'SRT' && this.checkIPforSRT(req.properties[`ts${k}_ip`])) {
                    let device: any = customerDeviceModel.findOne({ IP: req.peerIP });
                    let reqq: any = {
                        body: {
                            ip: req.peerIP,
                            RegionID: device?.RegionID,
                            SystemID: device?.SystemID,
                            deviceip: req.peerIP
                        }
                    }
                    let res, next;
                    encoderControllerV1.StopEncoding(reqq, res, next);
                    msg.push(`${message} ${encoderNumber[k]}`);
                }
            }
        }
    }

    // For SRT if source port is different than 0 it must not be same as destination port/s or any other source port/s
    public checkSourcePortForSRT = async (req) => {
        if (req.properties) {
            let message = 'Source port can not be same as destination port/s or any other source port/s';
            for (let i = 1; i < 4; i++) {
                if (req.properties[`ts${i}_srcport`]) {
                    if (req.properties[`ts${i}_srcport`] != '0' && req.properties[`ts${i}_delivery`] == 'SRT') {
                        for (let j = i + 1; j < 5; j++) {
                            if (req.properties[`ts${j}_srcport`]) {
                                if ((req.properties[`ts${i}_srcport`] == req.properties[`ts${j}_srcport`]) || (req.properties[`ts${i}_srcport`] == req.properties[`ts${j}_port`]) || (req.properties[`ts${i}_srcport`] == req.properties[`ts${i}_port`])) {
                                    msg.push(message); return;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    //qam_mode if 2 means QAM64 ANNEX B
    //qam_mode if 3 means QAM256 ANNEX B
    public check_TS_Type_For_QAM = async (req) => {
        if (req.properties) {
            if (req.properties["output_mode"] === 'QAM' && Number.parseInt(req.properties["qam_mode"]) && req.properties["ts_type"] !== 'MPTS') {
                req.properties["ts_type"] = "MPTS";
                checkPropertiesChanges = true;
                return;
            }
        }
    }

    public check_TS1_Bitrate_For_QAM64 = async (req) => {
        if (req.properties) {
            if (req.properties["output_mode"] === 'QAM' && req.properties["qam_mode"] === '2' && req.properties["output_bitrate_mode"] === "MANUAL" && Number.parseInt(req.properties["ts1_bitrate"]) > 26000) {
                req.properties["ts1_bitrate"] = '25000';
                checkPropertiesChanges = true;
                return;
            }
        }
    }

    public check_TS1_Bitrate_For_QAM256 = async (req) => {
        if (req.properties) {
            if (req.properties["output_mode"] === 'QAM' && req.properties["qam_mode"] === '3' && req.properties["output_bitrate_mode"] === "MANUAL" && Number.parseInt(req.properties["ts1_bitrate"]) > 38000) {
                req.properties["ts1_bitrate"] = '36000';
                checkPropertiesChanges = true;
                return;
            }
        }
    }

    // System Parameter
    // For all encoders if encoder is set to run, but settings are not saved to new preset,
    // VCDMS will create a preset and save it.Preset should save after the encoder is started and running.

    public CheckEncoderIsSetToRun = async (req: any) => {
        if (req.status) {
            if (req.status.current_enc_preset == 'encoder_factory_default') {
                if (req.status.opstate == 'Running') {
                    let isAllFilled = true;
                    for (let i = 1; i < 9; i++) {
                        if (req.properties[`preset${i}`] == '') {
                            isAllFilled = false; break;
                        }
                    }
                    if (!isAllFilled) {
                        let flag = true;
                        let preset_names = ["preset_1", "preset_2", "preset_3", "preset_4", "preset_5", "preset_6", "preset_7", "preset_8"];
                        for (let i = 0; i < 8; i++) {
                            for (let j = 1; j < 9; j++) {
                                if (req.properties[`preset${j}`] == preset_names[i]) {
                                    flag = false; break;
                                }
                            }
                            if (flag) {
                                for (let j = 1; j < 9; j++) {
                                    if (req.properties[`preset${j}`] == '') {
                                        req.properties[`preset${j}`] = preset_names[i];
                                        let pre: any = [];
                                        for (let p = 1; p < 9; p++) {
                                            pre.push(req.properties[`preset${p}`]);
                                        }
                                        let data: any = {
                                            body: {
                                                presets: pre,
                                                ip: req.peerIP
                                            }
                                        }

                                        let res, next;
                                        await encoderControllerV1.UpdatePreset(data, res, next);
                                        let data1: any = {
                                            body: {
                                                current_enc_presets: preset_names[i],
                                                ip: req.peerIP
                                            }
                                        }
                                        await encoderControllerV1.LoadPreset(data1, res, next);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    let device = await customerDeviceModel.findOne({ IP: req.peerIP });
                    let reqq: any = {
                        body: {
                            ip: req.peerIP,
                            RegionID: device?.RegionID,
                            SystemID: device?.SystemID,
                            deviceip: req.peerIP
                        }
                    }
                    let res, next;
                    let requestResult: any = await encoderControllerV1.StartEncoding(reqq, res, next);
                    if (requestResult && requestResult.status === "success" && requestResult.device.opstate == "Running") {
                        this.CheckEncoderIsSetToRun(req);
                    }
                }


            }
        }
    }

}
export const globalServicesForAutomatedWorkFlow = new AutomatedWorkFlowServices();
