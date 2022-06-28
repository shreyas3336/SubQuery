import {TokenDeployed, ERC20Implementation} from "../types";
import { AcalaEvmEvent, AcalaEvmCall } from '@subql/acala-evm-processor';
import { BigNumber } from "ethers";

// Setup types from ABI
type NewTokenDeployed = [BigNumber,string,string, string] & { 
    tokenType: BigNumber; 
    token: string; 
    documentHash: string; 
    deployer: string;
};
type NewERC20Implementation = [string,BigNumber,string,boolean,boolean[]] & { 
    typeOfToken: string; 
    typeID: BigNumber; 
    implementation: string;
    isReflective: boolean;
    features: boolean[];
};

export async function handleNewTokenDeployed(event: AcalaEvmEvent<NewTokenDeployed>): Promise<void> {
    let entity = await TokenDeployed.get(event.args.token.toString());
    if(!entity) {
        entity = new TokenDeployed(event.args.token.toString());
        entity.tokenDeployer = event.args.deployer.toString();
        entity.typeOfToken = event.args.tokenType.toBigInt();
        entity.tokenCreatedAt = BigInt(event.blockTimestamp.getTime());
        entity.tokenDocumentHash = event.args.documentHash.toString();
    }
    await entity.save();
}

export async function handleNewImplementation(event: AcalaEvmCall<NewERC20Implementation>): Promise<void> {
    let entity = await ERC20Implementation.get(event.args.typeID.toHexString());
    if (!entity) {
        entity = new ERC20Implementation(event.args.typeID.toHexString());
        entity.address = event.args.implementation.toString();
        entity.name = event.args.typeOfToken.toString();
        entity.ERC_20_Compliant = true;
        entity.Verified = true;
        entity.Ownable = true;
        if(event.args.isReflective) {
            entity.Mintable = false
            entity.Burnable = false
            entity.Pauseable = false
            entity.Yield_Generator = event.args.features[0]
            entity.Taxable = event.args.features[1]
            entity.Liquidity_Generator = event.args.features[2]
            entity.Donation_Charity = event.args.features[3]
            entity.Capped = true;
            entity.advancedFeatures = "10100000"
            
            if (event.args.features[1]) {
                entity.advancedFeatures = entity.advancedFeatures!.substring(0,3) + "1" + entity.advancedFeatures!.substring(4)
            }
            if (event.args.features[2]) {
                entity.advancedFeatures = entity.advancedFeatures!.substring(0,4) + "1" + entity.advancedFeatures!.substring(5)
                entity.advancedFeatures = entity.advancedFeatures!.substring(0,6) + "1" + entity.advancedFeatures!.substring(7)
            }
            if (event.args.features[3]) {
                entity.advancedFeatures = entity.advancedFeatures!.substring(0,5) + "1" + entity.advancedFeatures!.substring(6)
                entity.advancedFeatures = entity.advancedFeatures!.substring(0,7) + "1"
            }
        } else {
            entity.Mintable = event.args.features[0]
            entity.Burnable = event.args.features[1]
            entity.Pauseable = event.args.features[2]
            entity.Capped = event.args.features[3]
            entity.Yield_Generator = false
            entity.Taxable = false
            entity.Liquidity_Generator = false
            entity.Donation_Charity = false
            entity.advancedFeatures = "10000000"
            if (event.args.features[3]) {
              entity.advancedFeatures = entity.advancedFeatures!.substring(0,1) + "1" + entity.advancedFeatures!.substring(2)
            }
        } 
    }
    await entity.save();
}
