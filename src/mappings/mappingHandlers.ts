import {Project, Derivative, UserHolding } from "../types";
import { AcalaEvmEvent, AcalaEvmCall } from '@subql/acala-evm-processor';
import { BigNumber } from "ethers";

// Setup types from ABI
type ProjectInfo = [string, string, string, BigNumber] & { 
    tokenAddress: string; 
    tokenTicker: string; 
    creator: string; 
    tokenDecimal: BigNumber; 
};
type CreateVest = [string,string,string,BigNumber,BigNumber,string,string, Boolean] & {
    assetAddress: string;
    creator: string;
    userAddress: string;
    userAmount: BigNumber;
    unlockTime: BigNumber;
    wrappedERC20Address: string;
    wrappedAssetTicker: string;
    transferable: Boolean;
};

function generateID(_user: string, _ticker: string): string {
    return _user.concat("-LOCK-").concat(_ticker);
  }

export async function handleProjectInfo(event: AcalaEvmEvent<ProjectInfo>): Promise<void> {
    let _projectTokenAddress = event.args.tokenAddress.toString();
    let _projectTokenTicker = event.args.tokenTicker.toString();
    let _projectOwner = event.args.creator.toString();
    let _projectDecimal = event.args.tokenDecimal.toBigInt();

    let _projectID = generateID(_projectOwner,_projectTokenAddress);

    let project = await Project.get(_projectID);
    logger.debug("ProjectInfo --- ",project);
    if(project === undefined) {
        project = new Project(_projectID);
        project.projectOwnerAddress = _projectOwner;
        project.projectTokenAddress = _projectTokenAddress;
        project.projectTokenTicker = _projectTokenTicker;
        project.projectTokenDecimal = _projectDecimal;
    }
    project.save();
}

export async function handleCreateVest(event: AcalaEvmCall<CreateVest>): Promise<void> {
    // Getting all the required data from the Event.
    let _userAddress = event.args.userAddress.toString();
    let _projectCreator = event.args.creator.toString();
    let _projectAddress = event.args.assetAddress.toString();
    let _tokenAmount = event.args.userAmount.toBigInt();
    let _unlockTime = event.args.unlockTime.toBigInt();
    let _wrappedTokenAddress = event.args.wrappedERC20Address.toString();
    let _wrappedTokenTicker = event.args.wrappedAssetTicker.toString();

     // Generting a Unique Project ID, i.e. a combination of Project Creator & Project Address
    let _projectID = generateID(_projectCreator, _projectAddress);
    let project = await Project.get(_projectID);
    logger.debug("CreateVest | ProjectInfo --- ",project);
    if(project != undefined) {
        // If the project exists. Check the corresponding derivative asset exists or not.
        let derivative = await Derivative.get(_wrappedTokenAddress);
        if(derivative === undefined) {
            // If the derivative asset doesn't exist, create one.
            derivative = new Derivative(_wrappedTokenAddress);
            derivative.wrappedTokenTicker = _wrappedTokenTicker;
            derivative.totalSupply = BigInt(0);
            derivative.unlockTime = _unlockTime;
            derivative.projectId = project.id.toString();
            derivative.save();
        }
        
        // Increase the Total Supply of the Derivative Asset.
        let derivativeSupply = derivative.totalSupply;
        derivative.totalSupply = derivativeSupply + _tokenAmount;

        // Creating a unique User ID, i.e. a combination of the User Address & the Wrapped Asset Address.
        let userHoldingsID = generateID(_userAddress, _wrappedTokenAddress);

        // Checking if the User already exists w.r.t the Wrapped Asset
        let userHoldings = await UserHolding.get(userHoldingsID);
        if (userHoldings == null){
            // If the User doesn't exist, create one.
            userHoldings = new UserHolding(userHoldingsID);
            userHoldings.amount = BigInt(0);
            userHoldings.address = _userAddress;
            userHoldings.derivativeId = derivative.id.toString();
        }
        // Increase the Wrapped Asset Holdings of the User.
        let userTokenAmount = userHoldings.amount;
        userHoldings.amount = userTokenAmount + _tokenAmount;
        userHoldings.save();
        derivative.save();
    }
}