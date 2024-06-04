import {NodeInitializer} from "node-red";
import {SubmitSolutionResultNode, SubmitSolutionResultNodeDef} from "./modules/types";

import {ApiPromise, HttpProvider} from '@polkadot/api';

interface SubmittedResult {
    votingRoundId: string;
    solutionNamespace: string;
    address: string;
    resultHash: string;
}

const getRegisteredOperatorsCount = async (
    api: ApiPromise,
    solutionGroupId: string
): Promise<number> => {
    const stakeRecords =
        await api.query.workerNodePallet.solutionGroupStakeRecords.entries(
            solutionGroupId
        );

    const transformedRecords = stakeRecords
        .map(([addr, v]) => [addr.toHuman(), v.toHuman()])
        .map((x) => {
            if (x.length !== 2) {
                return null;
            }

            const [addr, v]: [[string, string], { [key: string]: string }] = x as [[string, string], {
                [key: string]: string
            }];

            return addr[1];
        })
        .filter(x => !!x);

    const operatorsRecords = await Promise.all(transformedRecords.map(async (x: any) => {
        const encodedAccount = api.registry.createType('AccountId', x);

        const operator = await api.query.workerNodePallet.workerNodeToOperator(encodedAccount);

        const humanizedOperator = operator.toHuman() as string | null;

        return humanizedOperator;
    }))

    const operators = operatorsRecords.filter(x => !!x).length;

    console.log('solution group operators', operators);

    return operators;
};
const getSubmittedResults = async (
    api: ApiPromise,
    solutionNamespace: string,
    votingRoundId: string
): Promise<SubmittedResult[]> => {
    const submittedResults =
        await api.query.workerNodePallet.solutionResults.entries(
            solutionNamespace,
            votingRoundId
        );

    return submittedResults.map(([c, k]) => {
        const [solutionNamespace, votingRoundId, address]: [
            string,
            string,
            string
        ] = c.toHuman() as [string, string, string];
        const resultHash: string = k.toHuman() as string;

        return {
            address,
            resultHash,
            solutionNamespace,
            votingRoundId,
        };
    });
};

enum ConsensusStatus {
    REACHED = 'REACHED',
    NOT_ENOUGH_VOTES = 'NOT_ENOUGH_VOTES',
    UNABLE_TO_REACH_CONSENSUS = 'UNABLE_TO_REACH_CONSENSUS',
    FAILED = 'FAILED'
}

interface ConsensusReached {
    consensusStatus: ConsensusStatus.REACHED;
    leaderAddress: string;
}

interface ConsensusNotReached {
    leaderAddress: null;
    consensusStatus:
        | ConsensusStatus.UNABLE_TO_REACH_CONSENSUS
        | ConsensusStatus.NOT_ENOUGH_VOTES
        | ConsensusStatus.FAILED;
}

type ConsesusResult = ConsensusReached | ConsensusNotReached;

const leaderElection = async (
    votingUrl: string,
    solutionNamespace: string,
    solutionGroupId: string,
    votingRoundId: string,
): Promise<ConsesusResult> => {
    console.log(votingUrl);
    const httpProvider: HttpProvider = new HttpProvider(votingUrl);

    await httpProvider.connect();

    const api: ApiPromise = await ApiPromise.create({
        provider: httpProvider,
        throwOnConnect: true,
        throwOnUnknown: true,
    });

    const totalWorkers: number = await getRegisteredOperatorsCount(api, solutionGroupId);

    const submittedResults: SubmittedResult[] = await getSubmittedResults(
        api,
        solutionNamespace,
        votingRoundId
    );

    if (submittedResults.length === 0) {
        return {
            leaderAddress: null,
            consensusStatus: ConsensusStatus.NOT_ENOUGH_VOTES,
        };
    }

    console.log('votes', submittedResults.length);

    const usedAddresses: string[] = [];

    const orderedUniqueResults: SubmittedResult[] = submittedResults.filter(
        (submittedResult: SubmittedResult) => {
            if (!usedAddresses.includes(submittedResult.address)) {
                usedAddresses.push(submittedResult.address);

                return true;
            }

            return false;
        }
    );

    const orderedK: { [resultHash: string]: number } = {};
    const minVotesRequired = totalWorkers / 2 + 0.5;

    if (orderedUniqueResults.length < minVotesRequired) {
        return {
            leaderAddress: null,
            consensusStatus: ConsensusStatus.NOT_ENOUGH_VOTES,
        };
    }

    let electedLeader: SubmittedResult | null = null;

    for (const submittedResult of orderedUniqueResults) {
        if (!orderedK[submittedResult.resultHash]) {
            orderedK[submittedResult.resultHash] = 0;
        }

        orderedK[submittedResult.resultHash] += 1;

        if (orderedK[submittedResult.resultHash] >= minVotesRequired) {
            electedLeader = submittedResult;
        }
    }

    if (electedLeader) {
        const otherPossibleLeader: [string, number] | undefined = Object.entries(
            orderedK
        ).find(
            ([k, v]) => {
                if (!electedLeader) {
                    return false
                }

                return v === orderedK[electedLeader.resultHash] &&
                    k !== electedLeader.resultHash;
            }
        );

        if (!otherPossibleLeader) {
            return {
                leaderAddress: electedLeader.address,
                consensusStatus: ConsensusStatus.REACHED,
            };
        }
    }

    const remainingVotes: number = totalWorkers - orderedUniqueResults.length;
    const highestVote: number = orderedK[getKeyWithHighestNumber(orderedK)];

    const canStillReachConsensus: boolean =
        highestVote + remainingVotes >= minVotesRequired;

    if (canStillReachConsensus) {
        return {
            leaderAddress: null,
            consensusStatus: ConsensusStatus.NOT_ENOUGH_VOTES,
        };
    }

    return {
        leaderAddress: null,
        consensusStatus: ConsensusStatus.UNABLE_TO_REACH_CONSENSUS,
    };
};

const getKeyWithHighestNumber = (obj: any) =>
    Object.keys(obj).reduce((a, b) => (obj[a] > obj[b] ? a : b));


const nodeInit: NodeInitializer = (RED): void => {
    function ConsensusNode(this: SubmitSolutionResultNode, config: SubmitSolutionResultNodeDef) {
        RED.nodes.createNode(this, config);

        this.on('input', async (msg: any, send, done) => {
            const payload: any = msg.payload;

            if (typeof payload !== 'object') {
                console.error('payload is not an object');
                send(msg);
                done();
                return;
            }
            
            await leaderElection(
                payload.votingUrl,
                payload.solutionNamespace,
                payload.solutionGroupId,
                payload.votingRoundId,
            ).then((result) => {
                send({
                    payload: result
                });

                done();
            }).catch((e) => {
                console.error(e);

                send({
                    payload: {
                        consensusStatus: ConsensusStatus.FAILED,
                        leaderAddress: null,
                    }
                });

                done();
            })
        });
    }

    RED.nodes.registerType("consensus-node", ConsensusNode);
};

export = nodeInit;