const merkletreejs = require('merkletreejs');
const EWXNRLogger = require("../../lib/log");
const crypto = require('crypto');

module.exports = function (RED) {
    function NodeConstructor(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        const logger = new EWXNRLogger('MerkleTreeRootHash', {}, node, true);

        const order = (unordered) => Object.keys(unordered).sort().reduce(
            (obj, key) => {
                obj[key] = hashFunction(unordered[key].toString());
                return obj;
            }, {}
        );

        const hashFunction = (data) => crypto.createHash('sha256').update(data).digest('hex');

        const sortObjectDeeply = (object, leaves = []) => {
            for (let [key, value] of Object.entries(object)) {
                if (typeof(value) === "object") {
                    object[key] = sortObjectDeeply(value, leaves);
                }
            }
            const objWithHashes = order(object);

            leaves.push(... Object.values(objWithHashes));

            return objWithHashes;
        }

        node.on('input', async function (msg, send, done) {
            const leaves = [];

            if (Array.isArray(msg.payload)) {
                logger.info("payload is array");

                msg.payload.forEach(x => sortObjectDeeply(x, leaves));
            } else if(typeof(msg.payload) === "object") {
                logger.info("payload is object");

                sortObjectDeeply(msg.payload, leaves);
            } else if(typeof(msg.payload) === "string") {
                logger.info("payload is string");

                leaves.push(hashFunction(msg.payload));
            } else if(typeof(msg.payload) === "number") {
                logger.info("payload is number");

                leaves.push(hashFunction(msg.payload.toString()));
            } else {
                node.error("invalid payload type");

                done();

                return;
            }

            if (leaves.length === 0) {
               node.error("no leaves to hash");

               done();
               return;
            }

            const tree = new merkletreejs.MerkleTree(leaves, hashFunction, {
                sortLeaves: true,
            });

            const root = tree.getHexRoot();

            logger.info("root hash", {
                root,
            })

            send({
                payload: {
                    ... msg.payload,
                    rootHash: root,
                }
            });
        });
    }

    RED.nodes.registerType("merkle-tree-root-hash", NodeConstructor);
}