import { json } from '@sveltejs/kit';
import { TotpGenerator } from '../../../utils/totpGenerator';
import type { loginBody, totpResponse } from '../../../utils/interfaces';

export const POST = async ({ request }) => {
	const body: loginBody = await request.json();
	const totp: TotpGenerator = new TotpGenerator();
	totp.setUsername(body.username);

	const generated_qr: totpResponse = await totp.generateQr();

	return json(generated_qr);
};
