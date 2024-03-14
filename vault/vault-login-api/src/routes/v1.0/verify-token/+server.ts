import { json } from '@sveltejs/kit';
import { verifyToken } from '../../../utils/checkCodigo.js';
import type { verifyTokenBody, verifyTokenResponse } from '../../../utils/interfaces.js';

export const POST = async ({ request }) => {
	const body: verifyTokenBody = await request.json();
	const access_token: string = body.access_token;

	const response: verifyTokenResponse = await verifyToken(access_token);

	return json(response);
};
