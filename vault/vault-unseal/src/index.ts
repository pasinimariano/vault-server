import NodeVault from 'node-vault';
import * as dotenv from 'dotenv';

import { unsealClient } from './unsealClient.js';

dotenv.config();

const unsealVault = async () => {
	console.log('Starting to unseal the vault server ...');
	const VAULT_ADDR: string | undefined = process.env.VAULT_ADDR;
	const VAULT_ACCESS_TOKEN: string | undefined =
		process.env.VAULT_ACCESS_TOKEN;
	const VAULT_UNSEAL_KEY1: string | undefined = process.env.VAULT_UNSEAL_KEY1;
	const VAULT_UNSEAL_KEY2: string | undefined = process.env.VAULT_UNSEAL_KEY2;
	const VAULT_UNSEAL_KEY3: string | undefined = process.env.VAULT_UNSEAL_KEY3;

	const vault_client = NodeVault({
		apiVersion: 'v1',
		endpoint: VAULT_ADDR,
		token: VAULT_ACCESS_TOKEN
	});

	try {
		await vault_client.status();
		console.log('Client started successfully');

		await unsealClient(vault_client, VAULT_UNSEAL_KEY1);
		await unsealClient(vault_client, VAULT_UNSEAL_KEY2);
		await unsealClient(vault_client, VAULT_UNSEAL_KEY3);

		console.log('Server unsealed succesfully');
	} catch (error) {
		console.log('Error during Vault unsealing. Contact technical service.');
	}
};

unsealVault();
