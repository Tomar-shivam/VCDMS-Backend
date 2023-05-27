import {ApiModel, ApiModelProperty} from 'swagger-express-ts'
@ApiModel( {
    description : "Version description" ,
    name : "Port"
} )
export class PortModel {
    constructor(){
        port: String
    }
    @ApiModelProperty( {
        description : "Port Number" ,
        required : true,
        example: ["20443"]
    } )
    port
}