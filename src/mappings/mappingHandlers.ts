import {Implementation, Project, Derivative, UserHoldings} from "../types";
import { AcalaEvmEvent, AcalaEvmCall } from '@subql/acala-evm-processor';
import { BigNumber, logger } from "ethers"; 
import { bool } from "@polkadot/types-codec";

// Setup types from ABI
type ProjectInfo = [string, string, string, string, string, BigNumber] & { name: string; tokenAddress: string; tokenTicker: string; documentHash: string; creator: string; tokenDecimal:BigNumber; };
type Upgrade = [string] & { implementation: string; }

// Setup types from ABI
type CreateVest = [string,string,string,BigNumber,BigNumber,string,string, Boolean] & {
    assetAddress: string;
    creator: string;
    userAddress: string;
    userAmount: BigNumber;
    unlockTime: BigNumber;
    wrappedERC20Address: string;
    wrappedAssetTicker: string;
    transferable: Boolean;
}
type TransferWrapped = [string,string,string,BigNumber] & {
    userAddress: string;
    wrappedTokenAddress: string;
    receiverAddress: string;
    amount: BigNumber;
}
type WithdrawController = [string,BigNumber,string] & {
    userAddress: string;
    amount: BigNumber;
    wrappedTokenAddress: string;
}

function generateID(_user: string, _ticker: string): string {
    return _user.concat("-LOCK-").concat(_ticker);
  }

export async function handleProjectInfo(event: AcalaEvmEvent<ProjectInfo>): Promise<void> {
    let _projectName = event.args.name.toString();
    let _projectTokenAddress = event.args.tokenAddress;
    let _projectTokenTicker = event.args.tokenTicker.toString();
    let _projectDocHash = event.args.documentHash.toString();
    let _projectOwner = event.args.creator.toString();
    let _projectDecimal = event.args.tokenDecimal.toBigInt();

    let _projectID = generateID(_projectOwner,_projectTokenAddress);

    let project = await Project.get(_projectID);
    logger.debug("ProjectInfo --- ",project);
    if(project === undefined) {
        project = new Project(_projectID);
        project.projectOwnerAddress = _projectOwner;
        project.projectName = _projectName;
        project.projectTokenAddress = _projectTokenAddress;
        project.projectTokenTicker = _projectTokenTicker;
        project.projectDocHash = _projectDocHash;
        project.projectTokenDecimal = _projectDecimal;
    }
    project.save();
}

export async function handleUpgraded(event: AcalaEvmCall<Upgrade>): Promise<void> {
    let _implementation = event.args.implementation.toString();

    let upgrade = await Implementation.get(event.hash.toString());
    logger.debug(upgrade);
    if(upgrade === undefined) {
        upgrade = new Implementation(event.hash.toString());
        upgrade.newImplementationAddress = _implementation;
        upgrade.timestamp = BigInt(event.timestamp);
    }
    upgrade.save();
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
    logger.debug(project);
    if(project != undefined) {
        // If the project exists. Check the corresponding derivative asset exists or not.
        let derivative = await Derivative.get(_wrappedTokenAddress);
        if(derivative === undefined) {
            // If the derivative asset doesn't exist, create one.
            derivative = new Derivative(_wrappedTokenAddress);
            derivative.wrappedTokenTicker = _wrappedTokenTicker;
            derivative.totalSupply = BigInt(0);
            derivative.projectIDId = project.id;
            derivative.unlockTime = _unlockTime;
            derivative.save();
        }
        // Increase the Total Supply of the Derivative Asset.
        let derivativeSupply = derivative.totalSupply;
        derivative.totalSupply = derivativeSupply + _tokenAmount;

        // Creating a unique User ID, i.e. a combination of the User Address & the Wrapped Asset Address.
        let userHoldingsID = generateID(_userAddress, _wrappedTokenAddress);

        // Checking if the User already exists w.r.t the Wrapped Asset
        let userHoldings = await UserHoldings.get(userHoldingsID);
        if (userHoldings === undefined){
            // If the User doesn't exist, create one.
            userHoldings = new UserHoldings(userHoldingsID);
            userHoldings.tokenAmount = BigInt(0);
            userHoldings.address = _userAddress;
            userHoldings.derivativeIDId = derivative.id;
          }
          // Increase the Wrapped Asset Holdings of the User.
          let userTokenAmount = userHoldings.tokenAmount;
          userHoldings.tokenAmount = userTokenAmount + _tokenAmount;
          userHoldings.save();
          derivative.save();
    }
}

export async function handleTransferWrapped(event: AcalaEvmCall<TransferWrapped>): Promise<void>{
    // Getting all the required data from the Event.
  let _userAddress = event.args.userAddress.toString();
  let _wrappedTokenAddress = event.args.wrappedTokenAddress.toString();
  let _receiverAddress = event.args.receiverAddress.toString();
  let _transferAmount = event.args.amount.toBigInt();

  // Check the corresponding derivative asset exists or not.
  if (_receiverAddress != "0x30B9A8279298Ba8d37Bf76b9f2A805D656fC1C07"){
    let derivative = await Derivative.get(_wrappedTokenAddress);
    if(derivative != undefined){
      // Creating a unique User ID, i.e. a combination of the User Address & the Wrapped Asset Address.
      let senderID = generateID(_userAddress, _wrappedTokenAddress);

      // Retrieving the User w.r.t the Wrapped Asset
      let senderUserHoldings = await UserHoldings.get(senderID);
      if(senderUserHoldings != undefined){
        // Updating the Balance of Sender Address
        let senderTokenAmount = senderUserHoldings.tokenAmount;
        senderUserHoldings.tokenAmount = senderTokenAmount - _transferAmount;
        senderUserHoldings.save();

        // Creating a unique User ID, i.e. a combination of the User Address & the Wrapped Asset Address.
        let receiverID = generateID(_receiverAddress, _wrappedTokenAddress);

        // Checking if the User already exists w.r.t the Wrapped Asset
        let receiverUserHoldings = await UserHoldings.get(receiverID);
        if (receiverUserHoldings === undefined){
          // If the User doesn't exist, create one.
          receiverUserHoldings = new UserHoldings(receiverID);
          receiverUserHoldings.address = _receiverAddress;
          receiverUserHoldings.tokenAmount = BigInt(0);
          receiverUserHoldings.derivativeIDId = derivative.id;
        }

        // Updating the Balance of Receiver Address
        let receiverTokenAmount = receiverUserHoldings.tokenAmount;
        receiverUserHoldings.tokenAmount = receiverTokenAmount + _transferAmount;
        receiverUserHoldings.save();
      }
      derivative.save();
    }
  }
}

export async function handleWithdraw(event: AcalaEvmCall<WithdrawController>): Promise<void>{
    // Getting all the required data from the Event.
  let _userAddress = event.args.userAddress.toString();
  let _amount = event.args.amount.toBigInt();
  let _wrappedTokenAddress = event.args.wrappedTokenAddress.toString();

  // Loading the Derivative Asset.
  let derivative = await Derivative.get(_wrappedTokenAddress);
  if(derivative != undefined){
    // Decreasing the Total Supply of the Derivative Asset.
    let derivativeTotalSupply = derivative.totalSupply;
    derivative.totalSupply = derivativeTotalSupply - _amount;

    // Creating a unique User ID, i.e. a combination of the User Address & the Wrapped Asset Address.
    let userID = generateID(_userAddress, _wrappedTokenAddress);

    // Retrieving the User w.r.t the Wrapped Asset
    let userHoldings = await UserHoldings.get(userID);
    if(userHoldings != undefined){
      // Updating the Balance of User Address
      let userTokenAmount = userHoldings.tokenAmount;
      userHoldings.tokenAmount = userTokenAmount - _amount;
      userHoldings.save();
    }
    derivative.save();
  }
}
