module.exports = function (RED) {
    function EnergyWebXConfigNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.ready = new Promise(async (resolve, reject) => {
            try {
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

                const ewxRemoteConfig = config.__envConfig;

                if (!ewxRemoteConfig) {
                    throw new Error('missing __envConfig');
                }

                const response = await axios.get(config.__envConfig.BASE_URL);
                if (response.status !== 200) {
                    throw new Error('failed to obtain base urls');
                }

                node.baseUrls = BASE_URLS_SCHEMA.parse(response.data);
                node.subsquidUrl = response.data.indexer_url;

                const provider = new polkadot.HttpProvider(node.baseUrls.rpc_url);
                const api = new polkadot.ApiPromise({
                    provider,
                    throwOnUnknown: true,
                    throwOnConnect: true,
                })

                await api.connect().catch((e) => {
                    console.error('failed to initialize api', e);

                    throw e;
                })

                node.workerUrl = 'http://localhost:3002';
                node.workerAddress = ewxRemoteConfig.EWX_WORKER_ADDRESS;
                node.solutionNamespace = ewxRemoteConfig.EWX_SOLUTION_ID;
                node.solutionGroupId = ewxRemoteConfig.EWX_SOLUTION_GROUP_ID;
                node.rpcUrl = ewxRemoteConfig.EWX_RPC_URL;

                await api.disconnect();

                node.status({fill: "green", shape: "dot", text: "connected"});
                resolve();
            } catch (error) {
                node.status({fill: "red", shape: "dot", text: "initialization failed"});
                node.error('Configuration initialization failed: ' + error.message);
                reject(error);
            }
        });

        node.on('close', async (done) => {
            done();
        });
    }

    RED.nodes.registerType("energywebx-config", EnergyWebXConfigNode);
}