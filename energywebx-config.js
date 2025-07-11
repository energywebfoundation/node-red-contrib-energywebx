module.exports = function (RED) {
    function EnergyWebXConfigNode(config) {
        const polkadot = require('@polkadot/api');
        const axios = require('axios');
        const z = require('zod');

        const BASE_URLS_SCHEMA = z.object({
            base_indexer_url: z.string().url(),
            workers_registry_url: z.string().url(),
            workers_nominator_url: z.string().url(),
            voting_round_orchestrator_url: z.string().url(),
            cas_normalizer_url: z.string().url(),
            rpc_url: z.string().url(),
            kafka_proxy_url: z.string().url()
        });

        RED.nodes.createNode(this, config);

        const ewxRemoteConfig = config.__envConfig;

        if (!ewxRemoteConfig) {
            this.log(`missing __envConfig`);
            this.status({fill: "red", shape: "dot", text: "missing __envConfig"});

            throw new Error('missing __envConfig');
        }

        this.workerUrl = 'http://localhost:3002';

        this.workerAddress = ewxRemoteConfig.EWX_WORKER_ADDRESS;
        this.solutionNamespace = ewxRemoteConfig.EWX_SOLUTION_ID;
        this.solutionGroupId = ewxRemoteConfig.EWX_SOLUTION_GROUP_ID;
        this.rpcUrl = ewxRemoteConfig.EWX_RPC_URL;

        axios.get(process.env.BASE_URLS).then((response) => {
            if (response.status !== 200) {
                this.log('failed to obtain base urls');
                this.status({fill: "red", shape: "dot", text: "missing __envConfig"});

                throw new Error('failed to obtain base urls');
            }

            this.baseUrls = BASE_URLS_SCHEMA.parse(response.data);

            this.log(`worker address = ${this.workerAddress}, solution namespace = ${this.solutionNamespace}, solution group id = ${this.solutionGroupId}, rpc url = ${this.rpcUrl}`)

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
        }).catch((e) => {
            this.log(e);
        })
    }

    RED.nodes.registerType("energywebx-config", EnergyWebXConfigNode);
}