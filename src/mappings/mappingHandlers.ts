import {Implementation, Project, Transfer} from "../types";
import { AcalaEvmEvent, AcalaEvmCall } from '@subql/acala-evm-processor';
import { BigNumber, logger } from "ethers"; 

// Setup types from ABI
type ProjectInfo = [string, string, string, string, string, BigNumber] & { name: string; tokenAddress: string; tokenTicker: string; documentHash: string; creator: string; tokenDecimal:BigNumber; };
type Upgrade = [string] & { implementation: string; };
type TransferWrapped = [string, string, BigNumber] & {_from: string; _to: string; _amount:BigNumber};

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

export async function handleUpgraded(event: AcalaEvmCall<Upgrade>): Promise<void> {
    let _implementation = event.args[0];

    let upgrade = await Implementation.get(event.blockHash.toString());
    logger.debug(upgrade);
    if(!upgrade) {
        upgrade = new Implementation(event.blockHash.toString());
        upgrade.newImplementationAddress = _implementation;
        upgrade.timestamp = BigInt(event.timestamp);
    }
    upgrade.save();
}

export async function handleAcalaEvmCall(event: AcalaEvmCall<TransferWrapped>): Promise<void> {
    const approval = new Transfer(event.hash);

    approval.token = event.from;
    approval.amount = event.args._amount.toBigInt();
    approval.from = event.args._from;
    approval.to = event.args._to;

    await approval.save();
}
