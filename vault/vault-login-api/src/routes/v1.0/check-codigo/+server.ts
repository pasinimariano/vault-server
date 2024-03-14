import { json } from '@sveltejs/kit';
import type { checkCodigoResponse, qrCodeBody } from '../../../utils/interfaces.js';
import { checkCodigo } from '../../../utils/checkCodigo.js';

export const POST = async ({ request }) => {
	const body: qrCodeBody = await request.json();
	const code: string = body.authCode;
	const username: string = body.username;
	const password: string = body.password;

	const response: checkCodigoResponse = await checkCodigo(username, password, code);

	return json(response);
};
