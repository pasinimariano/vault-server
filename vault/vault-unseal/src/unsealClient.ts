import NodeVault from 'node-vault';

export const unsealClient = async (
	vault_client: NodeVault.client,
	KEY: string | undefined
) => {
	await vault_client.unseal({
		key: KEY
	});
};
