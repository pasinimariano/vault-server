import { json } from '@sveltejs/kit';
import type { loginBody, loginResponse } from '../../../utils/interfaces';
import { loginToVault } from '../../../utils/vaultLogin';

export const POST = async ({ request }) => {
	const IPADDRESS: string | null = request.headers.get('x-forwarded-for');
	console.log('Se llama a la api desde ip: ', IPADDRESS);

	const body: loginBody = await request.json();
	const response: loginResponse = await loginToVault(body.username, body.password);

	return json(response);
};
