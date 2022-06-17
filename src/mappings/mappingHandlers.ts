import {Increment} from "../types";
import { AcalaEvmEvent, AcalaEvmCall } from '@subql/acala-evm-processor';
import { BigNumber, logger } from "ethers";

// Setup types from ABI
type IncrementEvent = [string, BigNumber] & { initiator: string; value: BigNumber; };

export async function handleIncrement(event: AcalaEvmEvent<IncrementEvent>): Promise<void> {
    logger.info('handlePurchaseOfferCreated');
    const transaction = new Increment(event.transactionHash);

    transaction.value = event.args.value.toBigInt();
    transaction.initiator = event.args.initiator.toString();

    await transaction.save();
}