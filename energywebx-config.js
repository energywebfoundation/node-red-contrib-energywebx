const polkadot = require('@polkadot/api');

const URLS = {
    PEX: 'https://public-rpc.testnet.energywebx.com',
    MAINNET: 'https://public-rpc.mainnet.energywebx.com'
};

const matchRpcToSubsquid = (rpcUrl) => {
    if (rpcUrl === URLS.PEX) {
        return 'https://ewx-subsquid-dev.energyweb.org/graphql'
    } else if (rpcUrl === URLS.MAINNET) {
        return 'https://ewx-indexer.mainnet.energywebx.com/graphql';
    }

    return process.env.__EWX_SUBSQUID_URL;
}


module.exports = function (RED) {
    function EnergyWebXConfigNode(config) {

        RED.nodes.createNode(this, config);

        const ewxRemoteConfig = config.__envConfig;

        this.workerUrl = 'http://localhost:3002';

        this.workerAddress = ewxRemoteConfig.EWX_WORKER_ADDRESS;
        this.solutionNamespace = ewxRemoteConfig.EWX_SOLUTION_ID;
        this.solutionGroupId = ewxRemoteConfig.EWX_SOLUTION_GROUP_ID;
        this.rpcUrl = ewxRemoteConfig.EWX_RPC_URL;
        this.subsquidUrl = matchRpcToSubsquid(this.rpcUrl);

        this.log(`worker address = ${this.workerAddress}, solution namespace = ${this.solutionNamespace}, solution group id = ${this.solutionGroupId}, rpc url = ${this.rpcUrl}, subsquid url = ${this.subsquidUrl}`)

        const provider = new polkadot.HttpProvider(this.rpcUrl);

        const api = new polkadot.ApiPromise({
            provider,
            throwOnUnknown: true,
            throwOnConnect: true,
        });

        api.connect()
            .then(() => {
                this.log(`connected to ${this.rpcUrl}`);

                this.status({fill: "green", shape: "dot", text: "connected"});
            })
            .catch((e) => {
                this.log(e);

                this.status({fill: "red", shape: "ring", text: "disconnected"});
            })
    }

    RED.nodes.registerType("energywebx-config", EnergyWebXConfigNode);
}