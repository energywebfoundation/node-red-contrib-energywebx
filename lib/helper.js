/**
 *
 * @param ewxConfig
 * @return {string|null}
 */
const getGraphqlUrlFromEwxConfigNode = (ewxConfig, target) => {
    if (!target) {
        console.warn('no target specified');

        return null;
    }

    if(!ewxConfig) {
        console.warn('no ewxConfig specified');

        return null;
    }

    if(!ewxConfig.ewxConfig) {
        console.warn('no ewxConfig.ewxConfig specified');

        return null;
    }

    if (!ewxConfig.ewxConfig.baseUrls || !ewxConfig.ewxConfig.baseUrls.base_indexer_url) {
        console.warn('no base_indexer_url specified');
        return null;
    }

    if (target === 'votes') {
        return ewxConfig.ewxConfig.baseUrls.base_indexer_url + '/votes/graphql';
    } else if (target === 'core') {
        return ewxConfig.ewxConfig.baseUrls.base_indexer_url + '/core/graphql';
    }

    return null;
};

module.exports = {
    getGraphqlUrlFromEwxConfigNode,
}