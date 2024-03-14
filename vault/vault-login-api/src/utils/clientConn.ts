import * as dotenv from 'dotenv';
import NodeVault from 'node-vault';
import type {
	errorAttemps,
	response2Factive,
	timeoutAttemps,
	userpassResponse
} from './interfaces';

dotenv.config();

export class ClientVaultConn {
	private VAULT_ADDR: string | undefined;
	private VAULT_ACCESS_TOKEN: string | undefined;
	private VAULT_USERPASS_URL: string | undefined;
	private VAULT_TWO_FACTOR_URL: string | undefined;
	private VAULT_REVOKED_USERS_URL: string | undefined;
	private VAULT_ERRORS_URL: string | undefined;
	private VAULT_BAD_USERNAME_URL: string | undefined;
	private VAULT_REVOKED_IPS_URL: string | undefined;
	private client_vault: NodeVault.client | undefined;
	private username: string | undefined;
	private password: string | undefined;
	private current_date: string | undefined;

	constructor() {
		this.VAULT_ADDR = process.env.VAULT_ADDR;
		this.VAULT_ACCESS_TOKEN = process.env.VAULT_ACCESS_TOKEN;
		this.VAULT_USERPASS_URL = process.env.VAULT_USERPASS_URL;
		this.VAULT_TWO_FACTOR_URL = process.env.VAULT_TWO_FACTOR_URL;
		this.VAULT_REVOKED_USERS_URL = process.env.VAULT_REVOKED_USERS_URL;
		this.VAULT_ERRORS_URL = process.env.VAULT_ERRORS_URL;
		this.VAULT_BAD_USERNAME_URL = process.env.VAULT_BAD_USERNAME_URL;
		this.VAULT_REVOKED_IPS_URL = process.env.VAULT_REVOKED_IPS_URL;
		this.client_vault = undefined;
		this.username = undefined;
		this.password = undefined;
		this.current_date = new Date().toJSON().slice(0, 10);
	}

	// Metodos de class ClientVaultConn //
	checkClient = async (): Promise<void> => {
		try {
			await this.client_vault?.initialized();
			console.log('El cliente de Vault esta funcionando correctamente.');
		} catch {
			console.log(
				'El cliente no esta funcionando correctamente. Contactá con el sector de Desarrollo.'
			);
		}
	};

	userpassLogin = async (): Promise<userpassResponse> => {
		const login: userpassResponse = await this.client_vault?.userpassLogin({
			username: this.username,
			password: this.password
		});

		return login;
	};

	checkUsername = async (): Promise<boolean> => {
		this.setClient(true);

		try {
			await this.client_vault?.read(`${this.VAULT_USERPASS_URL}${this.username}`);
			return true;
		} catch {
			return false;
		}
	};

	check2Factor = async (): Promise<response2Factive> => {
		const response: response2Factive = {
			active: false,
			error: false,
			attemps: {
				attemps: 0,
				last_attemp: 0
			}
		};

		await this.client_vault
			?.read(`${this.VAULT_TWO_FACTOR_URL}`)
			.then(async (secretData) => {
				const prevData = secretData.data || {};

				if (
					this.username &&
					prevData.data[this.username] &&
					prevData.data[this.username].active === 1
				) {
					response.active = true;
				}

				if (
					this.username &&
					(!prevData.data[this.username] || prevData.data[this.username].active === 0)
				) {
					const updateData = { ...prevData.data, [this.username]: { active: 1, code: '' } };

					await this.client_vault?.write(`${this.VAULT_TWO_FACTOR_URL}`, { data: updateData });

					response.active = false;
				}
			})
			.catch(() => {
				response.error = true;
			});

		return response;
	};

	generate2Fcode = async (secret: string): Promise<void> => {
		await this.client_vault?.read(`${this.VAULT_TWO_FACTOR_URL}`).then(async (secretData) => {
			const prevData = secretData.data || {};

			if (this.username) {
				const updateData = {
					...prevData.data,
					[this.username]: { active: 1, code: secret }
				};

				await this.client_vault?.write(`${this.VAULT_TWO_FACTOR_URL}`, { data: updateData });
			}
		});
	};

	get2Fsecret = async (): Promise<string | undefined> => {
		let secret;

		await this.client_vault?.read(`${this.VAULT_TWO_FACTOR_URL}`).then(async (secretData) => {
			const twoFactorData = secretData.data;

			if (this.username && twoFactorData.data[this.username]) {
				secret = twoFactorData.data[this.username].code;
			}
		});

		return secret;
	};

	generateAccessToken = async (): Promise<string> => {
		let policies;
		await this.client_vault
			?.read(`${this.VAULT_USERPASS_URL}${this.username}`)
			.then(async (userData) => {
				const user_policies = userData.data.token_policies;
				user_policies.push('default');

				policies = user_policies;
			});

		const access_token = await this.client_vault?.tokenCreate({
			ttl: '5m',
			policies: policies,
			display_name: this.username,
			renewable: false
		});

		return access_token.auth.client_token;
	};

	checkRevokedAccess = async (): Promise<boolean> => {
		let revoked: boolean = false;
		await this.client_vault?.read(`${this.VAULT_REVOKED_USERS_URL}`).then(async (revokedData) => {
			const revokedUsers = revokedData.data.data;

			if (this.username && revokedUsers[this.username]) {
				revoked = true;
			}
		});

		return revoked;
	};

	generateErrorLog = async (type: 'pwd' | 'code'): Promise<void> => {
		await this.client_vault?.read(`${this.VAULT_ERRORS_URL}`).then(async (logsData) => {
			if (this.username && this.current_date) {
				const prevData = logsData.data || {};
				const currentAttemp = Date.now();

				if (!prevData.data[this.username]) {
					const errorLog = {
						[this.current_date]: {
							pwd: { attemps: 0, last_attemp: 0, active_timeout_request: 0 },
							code: { attemps: 0, last_attemp: 0, active_timeout_request: 0 }
						}
					};
					errorLog[this.current_date][type].attemps = 1;
					errorLog[this.current_date][type].last_attemp = currentAttemp;

					const updateData = { ...prevData.data, [this.username]: errorLog };

					await this.client_vault?.write(`${this.VAULT_ERRORS_URL}`, { data: updateData });
				}

				if (prevData.data[this.username] && prevData.data[this.username][this.current_date]) {
					const errorCurrentDate = prevData.data[this.username][this.current_date];

					if (errorCurrentDate[type].attemps < 5) {
						errorCurrentDate[type].attemps += 1;
						errorCurrentDate[type].last_attemp = currentAttemp;

						await this.client_vault?.write(`${this.VAULT_ERRORS_URL}`, { data: prevData.data });
					}
				}

				if (prevData.data[this.username] && !prevData.data[this.username][this.current_date]) {
					const errorUsername = prevData.data[this.username];
					errorUsername[this.current_date] = {
						pwd: { attemps: 0, last_attemp: 0, active_timeout_request: 0 },
						code: { attemps: 0, last_attemp: 0, active_timeout_request: 0 }
					};
					errorUsername[this.current_date][type].attemps = 1;
					errorUsername[this.current_date][type].last_attemp = currentAttemp;

					await this.client_vault?.write(`${this.VAULT_ERRORS_URL}`, { data: prevData.data });
				}
			}
		});
	};

	checkErrorAttemps = async (type: 'pwd' | 'code'): Promise<errorAttemps | undefined> => {
		let attemps: errorAttemps | undefined;
		await this.client_vault?.read(`${this.VAULT_ERRORS_URL}`).then(async (logsData) => {
			const errorsData = logsData.data;
			if (
				this.username &&
				this.current_date &&
				errorsData.data[this.username] &&
				errorsData.data[this.username][this.current_date]
			) {
				attemps = errorsData.data[this.username][this.current_date][type];
			}
		});

		return attemps;
	};

	revokeAccess = async (type: 'password' | 'two-factor' | 'timeout'): Promise<void> => {
		await this.client_vault?.read(`${this.VAULT_REVOKED_USERS_URL}`).then(async (revokedData) => {
			const prevData = revokedData.data || {};

			if (prevData.data) {
				if (this.username) {
					const updateData = {
						...prevData.data,
						[this.username]: {
							reason: `Ingreso fallido reiterado de ${type}`,
							date: new Date().toLocaleString('es')
						}
					};

					await this.client_vault?.write(`${this.VAULT_REVOKED_USERS_URL}`, { data: updateData });
				}
			} else {
				if (this.username) {
					const updateData = {
						[this.username]: {
							reason: `Ingreso fallido reiterado de ${type}`,
							date: new Date().toLocaleString('es')
						}
					};

					await this.client_vault?.write(`${this.VAULT_REVOKED_USERS_URL}`, { data: updateData });
				}
			}
		});
	};

	updateTimeoutRequest = async (type: 'pwd' | 'code'): Promise<number | undefined> => {
		let active_timeout_request;
		await this.client_vault?.read(`${this.VAULT_ERRORS_URL}`).then(async (logsData) => {
			if (this.username && this.current_date) {
				const prevData = logsData.data || {};
				const dataUpdated = prevData;

				dataUpdated.data[this.username][this.current_date][type].active_timeout_request =
					dataUpdated.data[this.username][this.current_date][type].active_timeout_request + 1;

				active_timeout_request =
					dataUpdated.data[this.username][this.current_date][type].active_timeout_request;

				await this.client_vault?.write(`${this.VAULT_ERRORS_URL}`, { data: dataUpdated.data });
			}
		});

		return active_timeout_request;
	};

	checkTimeout = async (type: 'pwd' | 'code'): Promise<timeoutAttemps | undefined> => {
		const errorAttemps: errorAttemps | undefined = await this.checkErrorAttemps(type);

		if (errorAttemps && errorAttemps.attemps && errorAttemps.attemps < 5) {
			const currentTime: number = Date.now();
			const attemps: number = errorAttemps.attemps;
			const disabledUntil: number =
				attemps === 1 ? 0 : attemps === 2 ? 5000 : attemps === 3 ? 30000 : 300000;
			const remaining: number = errorAttemps.last_attemp + disabledUntil - currentTime;
			const isActive: boolean = remaining > 0 ? true : false;
			let active_timeout_request: number | undefined;

			if (isActive) {
				active_timeout_request = await this.updateTimeoutRequest(type);
			}

			return {
				active: isActive,
				time_out_data: { attemps: errorAttemps.attemps, last_attemp: errorAttemps.last_attemp },
				active_timeout_request
			};
		}
	};

	generateErrorLogUsername = async (): Promise<void> => {
		await this.client_vault?.read(`${this.VAULT_BAD_USERNAME_URL}`).then(async (logsData) => {
			if (this.username && this.current_date) {
				const prevData = logsData.data || {};
				const currentTime = Date.now();

				if (prevData && prevData.data[this.current_date]) {
					if (prevData.data[this.current_date]['192.168.112.1']) {
						const badUsernames = prevData.data[this.current_date]['192.168.112.1'].usernames;
						const prevAttemp = prevData.data[this.current_date]['192.168.112.1'].attemps;
						const currentAttemp = prevAttemp + 1;

						if (currentAttemp > 4) {
							this.revokeIPAccess();
						}

						prevData.data[this.current_date]['192.168.112.1'] = {
							usernames: [...badUsernames, this.username],
							last_attemp: currentTime,
							attemps: currentAttemp
						};
					} else {
						prevData.data[this.current_date]['192.168.112.1'] = {
							usernames: [this.username],
							last_attemp: currentTime,
							attemps: 1
						};
					}
				}

				if (prevData && !prevData.data[this.current_date]) {
					prevData.data[this.current_date] = {
						'192.168.112.1': {
							usernames: [this.username],
							last_attemp: currentTime,
							attemps: 1
						}
					};
				}

				await this.client_vault?.write(`${this.VAULT_BAD_USERNAME_URL}`, { data: prevData.data });
			}
		});
	};

	revokeIPAccess = async (): Promise<void> => {
		await this.client_vault?.read(`${this.VAULT_REVOKED_IPS_URL}`).then(async (revokedData) => {
			const prevData = revokedData.data || {};

			if (prevData.data) {
				const updateData = {
					...prevData.data,
					'192.168.112.1': {
						reason: `Ingreso fallido reiterado de nombres de usuario`,
						date: new Date().toLocaleString('es')
					}
				};

				await this.client_vault?.write(`${this.VAULT_REVOKED_IPS_URL}`, { data: updateData });
			} else {
				const updateData = {
					'192.168.112.1': {
						reason: `Ingreso fallido reiterado de nombres de usuario`,
						date: new Date().toLocaleString('es')
					}
				};

				await this.client_vault?.write(`${this.VAULT_REVOKED_IPS_URL}`, { data: updateData });
			}
		});
	};

	checkRevokedIpAccess = async (): Promise<boolean> => {
		let isRevoked: boolean = false;
		await this.client_vault?.read(`${this.VAULT_REVOKED_IPS_URL}`).then(async (revokedData) => {
			const currentData = revokedData.data;

			if (currentData.data && currentData.data['192.168.112.1']) {
				isRevoked = true;
			}
		});

		return isRevoked;
	};

	// Setters //
	setUsername = (username: string): void => {
		this.username = username;
	};

	setPassword = (password: string): void => {
		this.password = password;
	};

	setClient = async (isRoot: boolean): Promise<userpassResponse | undefined> => {
		if (isRoot) {
			this.client_vault = NodeVault({
				apiVersion: 'v1',
				endpoint: this.VAULT_ADDR,
				token: this.VAULT_ACCESS_TOKEN
			});
		} else {
			this.client_vault = NodeVault({
				apiVersion: 'v1',
				endpoint: this.VAULT_ADDR
			});

			return await this.userpassLogin();
		}
	};
}
