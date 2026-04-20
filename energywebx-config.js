
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

        // If baseUrls are pre-resolved in __envConfig, use them directly
        // This avoids async race conditions in standalone runtime environments
        if (ewxRemoteConfig.baseUrls) {
            this.baseUrls = ewxRemoteConfig.baseUrls;
            this.subsquidUrl = ewxRemoteConfig.baseUrls.indexer_url || ewxRemoteConfig.baseUrls.base_indexer_url;
            this.log(`worker=${this.workerAddress} solution=${this.solutionNamespace} group=${this.solutionGroupId}`);
            this.status({fill: "green", shape: "dot", text: "connected"});
            const provider = new polkadot.HttpProvider(this.rpcUrl);
            new polkadot.ApiPromise({ provider, noInitWarn: true })
                .connect()
                .then(() => this.log(`connected to ${this.rpcUrl}`))
                .catch(e => this.log(e));
            return;
        }

        // Default: fetch base URLs from remote registry
        axios.get(ewxRemoteConfig.BASE_URL).then((response) => {
            if (response.status !== 200) {
                this.status({fill: "red", shape: "dot", text: "base url fetch failed"});
                throw new Error('failed to obtain base urls');
            }

            this.baseUrls = BASE_URLS_SCHEMA.parse(response.data);
            this.subsquidUrl = response.data.indexer_url;

            this.log(`worker=${this.workerAddress} solution=${this.solutionNamespace} rpc=${this.rpcUrl}`);

            const provider = new polkadot.HttpProvider(this.rpcUrl);
            const api = new polkadot.ApiPromise({ provider, throwOnUnknown: true, throwOnConnect: true });

            api.connect()
                .then(() => {
                    this.log(`connected to ${this.rpcUrl}`);
                    this.status({fill: "green", shape: "dot", text: "connected"});
                })
                .catch((e) => {
                    this.log(e);
                    this.status({fill: "red", shape: "ring", text: "disconnected"});
                });
        }).catch((e) => {
            this.log(e);
        });
    }

    RED.nodes.registerType("energywebx-config", EnergyWebXConfigNode);
}
