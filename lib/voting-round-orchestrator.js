const axios = require('axios');

const getLatestVotingRoundId = async (ewxConfigNode) => {
    return await axios.get(ewxConfigNode.ewxConfig.baseUrls.voting_round_orchestrator_url + '/api/v1/voting-round/' + ewxConfigNode.ewxConfig.solutionNamespace + '/' + ewxConfigNode.ewxConfig.workerAddress + '/latest', {
        validateStatus: () => true,
    });
}

module.exports = {
    getLatestVotingRoundId
}