import * as dotenv from 'dotenv';
import { authenticator } from '@otplib/preset-default';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { ClientVaultConn } from './clientConn';
import type {
	checkCodigoAttemps,
	checkCodigoResponse,
	errorAttemps,
	timeoutAttemps,
	verifyTokenResponse
} from './interfaces';

dotenv.config();

export const checkCodigo = async (
	username: string,
	password: string,
	code: string
): Promise<checkCodigoResponse> => {
	console.log('Comienzo de chequeo del código two-factor.');

	const JWT_SECRET_KEY: string | undefined = process.env.JWT_SECRET_KEY;
	const clientVaultConn: ClientVaultConn = new ClientVaultConn();

	clientVaultConn.setUsername(username);
	clientVaultConn.setPassword(password);
	await clientVaultConn.setClient(true);

	const checkTimeouts: timeoutAttemps | undefined = await clientVaultConn.checkTimeout('code');
	const codeAttemps: checkCodigoAttemps = {
		attemps: 0,
		last_attemp: 0,
		activeTimeout: {
			active: false,
			time_out_data: {
				attemps: 0,
				last_attemp: 0
			},
			active_timeout_request: 0
		}
	};

	if (checkTimeouts && checkTimeouts.active) {
		codeAttemps.activeTimeout.active = true;
		codeAttemps.activeTimeout.time_out_data.attemps = checkTimeouts.time_out_data.attemps;
		codeAttemps.activeTimeout.time_out_data.last_attemp = checkTimeouts.time_out_data.last_attemp;
		codeAttemps.activeTimeout.active_timeout_request = checkTimeouts.active_timeout_request || 0;

		if (checkTimeouts.active_timeout_request && checkTimeouts.active_timeout_request === 2) {
			await clientVaultConn.revokeAccess('timeout');
			codeAttemps.attemps = -1;

			return { isValid: false, access_token: undefined, codeAttemps };
		}

		return { isValid: false, access_token: undefined, codeAttemps };
	}

	const secretToken: string | undefined = await clientVaultConn.get2Fsecret();

	if (secretToken) {
		const isValid: boolean = authenticator.check(code, secretToken);
		let access_token: string | undefined;

		if (isValid) {
			access_token = jwt.sign({ username }, `${JWT_SECRET_KEY}`, {
				algorithm: 'HS256',
				expiresIn: '1m'
			});
		} else {
			clientVaultConn.setClient(true);
			const checkRevokedAccess: boolean = await clientVaultConn.checkRevokedAccess();

			if (checkRevokedAccess) {
				codeAttemps.attemps = -1;

				return { isValid, access_token, codeAttemps };
			}

			await clientVaultConn.generateErrorLog('code');
			const pwdErrorsCount: errorAttemps | undefined =
				await clientVaultConn.checkErrorAttemps('code');

			if (pwdErrorsCount) {
				codeAttemps.attemps = pwdErrorsCount.attemps;
				codeAttemps.last_attemp = pwdErrorsCount.last_attemp;

				if (pwdErrorsCount.attemps === 5) {
					await clientVaultConn.revokeAccess('two-factor');
				}
			}
		}

		return { isValid, access_token, codeAttemps };
	}

	console.log('No existe ningún código secreto para generar QR');
	return { isValid: false, access_token: undefined, codeAttemps };
};

export const verifyToken = async (token: string): Promise<verifyTokenResponse> => {
	try {
		const JWT_SECRET_KEY: string | undefined = process.env.JWT_SECRET_KEY;
		const verify: JwtPayload = jwt.verify(token, `${JWT_SECRET_KEY}`) as JwtPayload;

		try {
			const clientVaultConn: ClientVaultConn = new ClientVaultConn();
			clientVaultConn.setUsername(verify.username);
			await clientVaultConn.setClient(true);

			const token: string = await clientVaultConn.generateAccessToken();

			return { expired: false, token };
		} catch {
			return { expired: false, token: undefined };
		}
	} catch {
		return { expired: true, token: undefined };
	}
};
