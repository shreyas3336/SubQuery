import {Increment} from "../types";
import { AcalaEvmEvent, AcalaEvmCall } from '@subql/acala-evm-processor';
import { BigNumber } from "ethers";

// Setup types from ABI
type TransferEventArgs = [BigNumber] & { value: BigNumber; };

export async function handleIncrement(event: AcalaEvmEvent<TransferEventArgs>): Promise<void> {
    const transaction = new Increment(event.transactionHash);

    transaction.value = event.args.value.toBigInt();

    await transaction.save();
}