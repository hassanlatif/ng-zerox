import { BigNumber } from '0x.js';

import { ONE_SECOND_MS, TEN_MINUTES_MS } from '../configs/constants';

/**
 * Returns an amount of seconds that is greater than the amount of seconds since epoch.
 */
export const getRandomFutureDateInSeconds = (): BigNumber => {
    return new BigNumber(Date.now() + TEN_MINUTES_MS).div(ONE_SECOND_MS).integerValue(BigNumber.ROUND_CEIL);
};
