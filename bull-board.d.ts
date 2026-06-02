declare module '@bull-board/api/dist/routes' {
    import type { AppRouteDefs } from '@bull-board/api/typings/app';
    export const appRoutes: AppRouteDefs;
}

declare module '@bull-board/api/dist/queuesApi' {
    import type { BullBoardQueues } from '@bull-board/api/typings/app';
    export function getQueuesApi(queues: ReadonlyArray<unknown>): {
        bullBoardQueues: BullBoardQueues;
        setQueues: (newBullQueues: ReadonlyArray<unknown>) => void;
        replaceQueues: (newBullQueues: ReadonlyArray<unknown>) => void;
        addQueue: (queue: unknown) => void;
        removeQueue: (queueOrName: string | unknown) => void;
    };
}
