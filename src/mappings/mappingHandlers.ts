import {Implementation, Project} from "../types";
import { AcalaEvmEvent, AcalaEvmCall } from '@subql/acala-evm-processor';
import { BigNumber } from "ethers";

// Setup types from ABI
type ProjectInfo = [string, string, string, string, string, BigNumber] & { name: string; tokenAddress: string; tokenTicker: string; documentHash: string; creator: string; tokenDecimal:BigNumber };
type Upgrade = [string] & { implementation: string; }

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
    if(project === undefined) {
        project = new Project(_projectID);
        project.projectOwnerAddress = _projectOwner;
        project.projectName = _projectName;
        project.projectTokenAddress = _projectTokenAddress;
        project.projectTokenTicker = _projectTokenTicker;
        project.projectDocHash = _projectDocHash;
        project.projectTokenDecimal = _projectDecimal;
    }
    await project.save();
}

export async function handleUpgraded(event: AcalaEvmCall<Upgrade>): Promise<void> {
    let _implementation = event.args.implementation.toString();

    let upgrade = await Implementation.get(event.hash.toString());
    if(upgrade === undefined) {
        upgrade = new Implementation(event.hash.toString());
        upgrade.newImplementationAddress = _implementation;
        upgrade.timestamp = BigInt(event.timestamp);
    }
    await upgrade.save();
}
