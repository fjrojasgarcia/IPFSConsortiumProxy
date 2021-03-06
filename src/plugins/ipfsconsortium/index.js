const IPFSProxy = require(
	'../../../node_modules/ipfsconsortiumcontracts/build/contracts/IPFSProxy.json');
const IPFSEvents = require(
	'../../../node_modules/ipfsconsortiumcontracts/build/contracts/IPFSEvents.json');

/*
* The default plugin for the native IPFS pinning consortium events
*/
class IPFSConsortium {
	addWatch(options) {

		const contract = new options.web3.eth.Contract(IPFSProxy.abi, options.contractAddress);

		contract.events.allEvents({
			fromBlock: options.startBlock,
		}, (error, result) => {
			if (error == null) {
				options.web3.eth.getTransaction(result.transactionHash).then((transaction) => {
					switch (result.event) {
						case 'HashAdded':
							resolveExpiration(transaction.blockNumber, result.returnValues.ttl).then((expiryTimeStamp) => {
								if (expiryTimeStamp >= 0) {
									options.pinner.pin(options.ownershiptracker.getOwner(options.contractAddress) || transaction.from, result.returnValues.hash, result.returnValues.ttl);
								} else {
									options.logger.info('hash %s already expired. Not pinning', result.returnValues.hash);
								}
							});
							break;
						case 'HashRemoved':
							options.pinner.unpin(options.ownershiptracker.getOwner(options.contractAddress) || transaction.from, result.returnValues.hash);
							break;
					}
				});
			} else {
				options.logger.error('Error reading event: %s', error.message);
			}
		});

		function resolveExpiration(blockNumber, ttl){
			return new Promise((resolve, reject) => {
				ttl = parseInt(ttl);
				if (ttl === 0) {
					return resolve(0);
				}
				options.web3.eth.getBlock(blockNumber).then((blockInfo) => {
					const expiryTimeStamp =
						ttl +
						blockInfo.timestamp * 1000;
					return resolve(expiryTimeStamp);
				});
			});
		}		
	}

	getStats() {
		return ({});
	}
}

module.exports = IPFSConsortium;
