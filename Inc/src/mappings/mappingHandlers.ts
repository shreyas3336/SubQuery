import {Approval, Transaction} from "../types";
import { AcalaEvmEvent } from '@subql/acala-evm-processor';
import { BigNumber } from "ethers";

// Setup types from ABI
type TransferEventArgs = [string, BigNumber] & { initiator: string; value: BigNumber; };

export async function handleAcalaEvmEvent(event: AcalaEvmEvent<TransferEventArgs>): Promise<void> {
    const transaction = new Transaction(event.transactionHash);

    transaction.value = event.args.value.toBigInt();
    transaction.from = event.args.initiator;

    await transaction.save();
}
