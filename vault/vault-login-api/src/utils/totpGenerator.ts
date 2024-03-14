import qrcode from 'qrcode';
import { authenticator } from '@otplib/preset-default';
import { ClientVaultConn } from './clientConn';
import type { totpResponse } from './interfaces';

export class TotpGenerator {
	private username: string;
	private service: string;
	private secret: string;

	constructor() {
		this.username = '';
		this.service = 'Telered-Vault';
		this.secret = this.generateSecret();
	}

	async generateQr(): Promise<totpResponse> {
		if (!this.username) {
			return { error: 400, body: 'Error faltan datos para generar el QR' };
		}

		console.log('Preparandose para generar el QR ...');
		const otpauth: string = authenticator.keyuri(this.username, this.service, this.secret);

		return qrcode
			.toDataURL(otpauth)
			.then(async (imageUrl: string) => {
				const body: totpResponse = { error: undefined, body: imageUrl };
				const clientVaultConn: ClientVaultConn = new ClientVaultConn();
				clientVaultConn.setUsername(this.username);
				await clientVaultConn.setClient(true);
				await clientVaultConn.generate2Fcode(this.secret);

				return body;
			})
			.catch((err) => {
				console.log('Error with QR generation, ', err);
				return {
					error: 500,
					body: 'Error al generar QR. Por favor contacte con servicio técnico.'
				};
			});
	}

	generateSecret = (): string => {
		authenticator.options = {
			step: 30,
			window: 1,
			algorithm: 'sha1',
			digits: 6
		};

		return authenticator.generateSecret();
	};

	setUsername(username: string): void {
		this.username = username;
	}
}
