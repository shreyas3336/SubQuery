import {Implementation, Project, Transfer} from "../types";
import { AcalaEvmEvent, AcalaEvmCall } from '@subql/acala-evm-processor';
import { BigNumber, logger } from "ethers"; 

// Setup types from ABI
type ProjectInfo = [string, string, string, string, string, BigNumber] & { name: string; tokenAddress: string; tokenTicker: string; documentHash: string; creator: string; tokenDecimal:BigNumber; };
type Upgrade = [string] & { implementation: string; };
type TransferWrapped = [string, string, BigNumber] & {from: string; to: string; value:BigNumber};

function generateID(_user: string, _ticker: string): string {
    return _user.concat("-LOCK-").concat(_ticker);
  }

export async function handleProjectInfo(event: AcalaEvmEvent<ProjectInfo>): Promise<void> {
    let _projectName = event.args.name.toString();
    let _projectTokenAddress = event.args.tokenAddress.toString();
    let _projectTokenTicker = event.args.tokenTicker.toString();
    let _projectDocHash = event.args.documentHash.toString();
    let _projectOwner = event.args.creator.toString();
    let _projectDecimal = event.args.tokenDecimal.toBigInt();

    let _projectID = generateID(_projectOwner,_projectTokenAddress);

    let project = await Project.get(_projectID);
    logger.debug(project);
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

export async function handleUpgraded(event: AcalaEvmEvent<Upgrade>): Promise<void> {
    let _implementation = event.args[0];

    let upgrade = await Implementation.get(event.blockHash.toString());
    logger.debug(upgrade);
    if(!upgrade) {
        upgrade = new Implementation(event.blockHash.toString());
        upgrade.newImplementationAddress = _implementation;
        upgrade.blockNumber = BigInt(event.blockNumber);
    }
    upgrade.save();
}

export async function handleAcalaEvmEvent(event: AcalaEvmEvent<TransferWrapped>): Promise<void> {
    if(event.address.toLowerCase() === "0xd93896F15bb793F88c1ae50610bFBA209621dBD1".toLowerCase()){
        const approval = new Transfer(event.transactionHash.toString());
        approval.token = event.address;
        approval.amount = event.args.value.toBigInt();
        approval.from = event.args.from;
        approval.to = event.args.to;
        await approval.save();
    }
}
