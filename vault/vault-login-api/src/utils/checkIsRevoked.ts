import { ClientVaultConn } from './clientConn';

export const checkIsRevoked = async () => {
	console.log('Chequeando Ip de acceso ...');

	const clientVaultConn: ClientVaultConn = new ClientVaultConn();
	await clientVaultConn.setClient(true);

	const isRevokedIP = await clientVaultConn.checkRevokedIpAccess();

	return isRevokedIP;
};
