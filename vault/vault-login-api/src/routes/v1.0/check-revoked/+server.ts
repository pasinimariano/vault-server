import { json } from '@sveltejs/kit';
import { checkIsRevoked } from '../../../utils/checkIsRevoked.js';

export const POST = async ({ request }) => {
	const IPADDRESS = request.headers.get('x-forwarded-for');
	console.log('Se llama a la api desde ip: ', IPADDRESS);

	const response = await checkIsRevoked();

	return json(response);
};
