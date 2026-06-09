import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { jobQueue } from './queue';
import { appRoutes } from '@bull-board/api/dist/routes';
import { getQueuesApi } from '@bull-board/api/dist/queuesApi';
import type { BullBoardQueues, UIConfig } from '@bull-board/api/typings/app';

const globalForBoard = globalThis as typeof globalThis & {
    bullBoardQueues?: BullBoardQueues;
};

let bullBoardQueues: BullBoardQueues;

if (globalForBoard.bullBoardQueues) {
    bullBoardQueues = globalForBoard.bullBoardQueues;
} else {
    const queuesApi = getQueuesApi([new BullMQAdapter(jobQueue)]);
    bullBoardQueues = queuesApi.bullBoardQueues;
    globalForBoard.bullBoardQueues = bullBoardQueues;
}

export const uiConfig: UIConfig = { boardTitle: 'Job Queue' };
export { bullBoardQueues, appRoutes };
