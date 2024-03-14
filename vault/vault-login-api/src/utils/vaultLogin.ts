import { ClientVaultConn } from './clientConn';
import type { errorAttemps, loginResponse, response2Factive, timeoutAttemps } from './interfaces';

export const loginToVault = async (username: string, password: string): Promise<loginResponse> => {
	console.log('Preparandose para chequear la data del usuario ...');
	const clientVaultConn: ClientVaultConn = new ClientVaultConn();
	const response: loginResponse = {
		is2Factive: {
			active: false,
			error: false,
			attemps: {
				attemps: 0,
				last_attemp: 0
			}
		},
		isChecked: {
			checked: false,
			error: false,
			attemps: {
				attemps: 0,
				last_attemp: 0
			}
		},
		error: undefined,
		activeTimeout: {
			active: false,
			time_out_data: {
				attemps: 0,
				last_attemp: 0
			},
			active_timeout_request: 0
		}
	};

	if (!username || !password) {
		console.log('Faltan datos necesarios para el login.');
		response.isChecked.checked = false;
		response.isChecked.error = true;
		response.error = 'Error al intentar realizar el login. Faltan datos necesarios.';
		return response;
	}

	try {
		await clientVaultConn.checkClient();
		clientVaultConn.setUsername(username);
		clientVaultConn.setPassword(password);
		const validUsername: boolean = await clientVaultConn.checkUsername();

		if (validUsername) {
			const checkRevokedAccess: boolean = await clientVaultConn.checkRevokedAccess();

			if (checkRevokedAccess) {
				response.isChecked.checked = false;
				response.isChecked.error = false;
				response.error = 'Por razones de seguridad tu usuario se encuentra bloqueado.';

				return response;
			}

			const checkTimeouts: timeoutAttemps | undefined = await clientVaultConn.checkTimeout('pwd');

			if (checkTimeouts && checkTimeouts.active) {
				response.isChecked.checked = false;
				response.isChecked.error = true;
				response.activeTimeout.active = true;
				response.activeTimeout.time_out_data.attemps = checkTimeouts.time_out_data.attemps;
				response.activeTimeout.time_out_data.last_attemp = checkTimeouts.time_out_data.last_attemp;
				response.activeTimeout.active_timeout_request = checkTimeouts.active_timeout_request;

				if (checkTimeouts.active_timeout_request && checkTimeouts.active_timeout_request === 2) {
					await clientVaultConn.revokeAccess('timeout');
					response.error = 'Por razones de seguridad tu usuario se encuentra bloqueado.';
				}

				return response;
			}

			try {
				const check2Factor: response2Factive = await clientVaultConn.check2Factor();
				response.is2Factive = check2Factor;

				if (check2Factor.error) {
					response.error =
						'Ocurrió un error inesperado. Si es la primera vez que intentas acceder, por favor contactá al sector de Desarrollo.';
				}

				await clientVaultConn.setClient(false);

				response.isChecked.checked = true;
				response.isChecked.error = false;

				return response;
			} catch {
				await clientVaultConn.setClient(true);
				await clientVaultConn.generateErrorLog('pwd');
				const pwdErrorsCount: errorAttemps | undefined =
					await clientVaultConn.checkErrorAttemps('pwd');

				if (pwdErrorsCount) {
					response.isChecked.attemps.attemps = pwdErrorsCount.attemps;
					response.isChecked.attemps.last_attemp = pwdErrorsCount.last_attemp;

					if (pwdErrorsCount.attemps === 5) {
						await clientVaultConn.revokeAccess('password');
						response.error = 'Por razones de seguridad tu usuario se encuentra bloqueado.';
					}
				}
			}

			response.isChecked.checked = false;
			response.isChecked.error = true;
		} else {
			await clientVaultConn.setClient(true);
			await clientVaultConn.generateErrorLogUsername();

			const isRevokedIP: boolean = await clientVaultConn.checkRevokedIpAccess();

			if (isRevokedIP) {
				response.error = 'Revoked IP';
			}

			response.isChecked.checked = false;
			response.isChecked.error = true;
			response.isChecked.attemps.attemps = -1;
		}

		return response;
	} catch (error) {
		response.error =
			'Error al intentar conectarse con Vault. Por favor contactar servicio técnico.';
		return response;
	}
};
