const {getGraphqlUrlFromEwxConfigNode} =  require("./helper");

const axios = require('axios');

const QUERIES = {
    VOTING_ROUND_CONSENSUS: `
    query GetVotingRound($votingRoundId: String!, $solutionNamespace: String!){
      votingRounds(where:{solution:{id_eq: $solutionNamespace}, votingRoundId_eq: $votingRoundId}) {
        settled
        expired
        processBlock
        settleBlock
        result
        votes(orderBy: blockNumber_ASC) {
          result {
            result
          }
          worker {
            id
          }
        }
      }
    }
    `,
    IS_NOMINATED: `
                    query IsWorkerNominated($workerAddress: String!, $solutionNamespace: String!, $votingRoundId: String!) {
                      votingRoundNominatedWorkersSnapshots(where: {worker: {id_eq: $workerAddress}, votingRound:{votingRoundId_eq: $votingRoundId, solution: {id_eq: $solutionNamespace}}}) {
                        id
                        votingRound {
                          id
                        }
                      }
                    }
                    
                    `
};

const queryIsWorkerNominated = async (ewxConfigNode, workerAddress, votingRoundId, solutionNamespace) => {
    const votesUrl = getGraphqlUrlFromEwxConfigNode(ewxConfigNode, 'votes');

    return await axios.post(votesUrl, {
        query: QUERIES.IS_NOMINATED,
        variables: {
            workerAddress,
            votingRoundId,
            solutionNamespace
        },
        validateStatus: () => true,
    });
}

const queryVotingRoundConsensus = async (ewxConfigNode, votingRoundId, solutionNamespace) => {
    const votesUrl = getGraphqlUrlFromEwxConfigNode(ewxConfigNode, 'votes');

    return await axios.post(votesUrl, {
        query: QUERIES.VOTING_ROUND_CONSENSUS,
        variables: {
            votingRoundId,
            solutionNamespace
        },
        validateStatus: () => true,
    });
}

module.exports = {
    queryIsWorkerNominated,
    queryVotingRoundConsensus
}