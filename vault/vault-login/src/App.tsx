import {
	ChangeEvent,
	FormEvent,
	ReactElement,
	useState,
	MouseEvent
} from 'react';
import Countdown from 'react-countdown';
import TeleredLogo from './assets/Telered_new_color.png';
import PwdVisible from './assets/verpassword-visible.svg';
import PwdOculta from './assets/verpassword-oculta.svg';
import { QrModal } from './components/QrModal';
import './App.css';
import {
	checkCodigoResponse,
	loginBody,
	loginResponse,
	requestOptions,
	totpResponse,
	verifyTokenResponse
} from './core/interfaces';

export const App = () => {
	const VAULT_SERVER_URL: string | undefined =
		process.env.REACT_APP_VAULT_SERVER_URL;
	const BASE_URL: string | undefined = process.env.REACT_APP_BASE_URL;
	const VAULT_LOGIN: string | undefined = process.env.REACT_APP_VAULT_LOGIN;
	const VAULT_QR_GENERATOR: string | undefined =
		process.env.REACT_APP_VAULT_QR_GENERATOR;
	const VAULT_IS_VALID: string | undefined =
		process.env.REACT_APP_VAULT_IS_VALID;
	const VAULT_VERIFY_TOKEN: string | undefined =
		process.env.REACT_APP_VAULT_VERIFY_TOKEN;

	const [loginData, setLoginData] = useState<loginBody>({
		username: '',
		password: ''
	});
	const [authCode, setAuthCode] = useState<string>('');

	const [loginResponse, setLoginResponse] = useState<loginResponse>({
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
	});

	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const [visible, setVisible] = useState<boolean>(false);
	const [inputType, setInputType] = useState('password');

	const [isValidAuth, setIsValidAuth] = useState<boolean | undefined>(
		undefined
	);
	const [jwtToken, setJwtToken] = useState<string | undefined>(undefined);
	const [jwtTokenError, setJwtTokenError] = useState<boolean>(false);

	const [disabled, setDisabled] = useState<boolean>(false);
	const [qrDisabled, setQrDisabled] = useState<boolean>(false);
	const [isDisabledUntil, setIsDisabledUntil] = useState<number>(0);
	const [countAttemp, setCountAttemps] = useState<number>(1);

	const handleChanges = (event: ChangeEvent<HTMLInputElement>) => {
		event.preventDefault();

		const targetName: string | undefined = event.target.name;
		const targetValue: string | undefined = event.target.value;

		setLoginData({ ...loginData, [targetName]: targetValue });
	};

	const handleChangesAuth = (event: ChangeEvent<HTMLInputElement>): void => {
		event.preventDefault();
		const targetValue = event.target.value;

		setAuthCode(targetValue);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
		event.preventDefault();
		setIsModalOpen(false);

		const requestOptions: requestOptions = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(loginData)
		};

		fetch(`${BASE_URL}${VAULT_LOGIN}`, requestOptions)
			.then((res: any) => {
				return res.json();
			})
			.then((data: loginResponse) => {
				if (data) {
					setLoginResponse(data);

					if (
						!data.error &&
						!data.isChecked.error &&
						!data.is2Factive.error
					) {
						setIsModalOpen(true);
					}

					let count;
					let last_attemp;
					if (
						data.activeTimeout.active &&
						data.activeTimeout.active_timeout_request &&
						data.activeTimeout.active_timeout_request < 2
					) {
						count = data.activeTimeout.time_out_data.attemps;
						last_attemp =
							data.activeTimeout.time_out_data.last_attemp;

						setDisableTimeout(count, last_attemp, 'pwd');
					}

					if (
						data.isChecked.error &&
						data.isChecked.attemps.attemps
					) {
						count = data.isChecked.attemps.attemps;
						last_attemp = data.isChecked.attemps.last_attemp;

						if (data.isChecked.attemps.attemps === -1) {
							if (countAttemp < 4) {
								setCountAttemps((prevCount) => prevCount + 1);
							}

							count = countAttemp;
							last_attemp = Date.now();
						} else {
							setCountAttemps(1);
						}

						setDisableTimeout(count, last_attemp, 'pwd');
					}
				}
			});
	};

	const getQrImage = (): Promise<string | undefined> => {
		const requestOptions: requestOptions = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: loginData.username })
		};

		return fetch(`${BASE_URL}${VAULT_QR_GENERATOR}`, requestOptions)
			.then((res: any) => {
				return res.json();
			})
			.then((data: totpResponse) => {
				if (data.error) {
					setIsModalOpen(false);
					setLoginResponse({ ...loginResponse, error: data.body });
				} else {
					return data.body;
				}
			});
	};

	const checkIsValid = (): Promise<void> => {
		const requestOptions: requestOptions = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				username: loginData.username,
				password: loginData.password,
				authCode
			})
		};

		return fetch(`${BASE_URL}${VAULT_IS_VALID}`, requestOptions)
			.then((res: any) => {
				return res.json();
			})
			.then(async (data: checkCodigoResponse) => {
				const isValid = data.isValid;
				setIsValidAuth(isValid);

				if (isValid) {
					setIsModalOpen(false);
					setAuthCode('');
					setJwtTokenError(false);
					setJwtToken(data.access_token);
				}

				if (!isValid) {
					if (
						data.codeAttemps.activeTimeout.active &&
						data.codeAttemps.activeTimeout.time_out_data.attemps !==
							-1
					) {
						const count =
							data.codeAttemps.activeTimeout.time_out_data
								.attemps;
						const last_attemp =
							data.codeAttemps.activeTimeout.time_out_data
								.last_attemp;

						setDisableTimeout(count, last_attemp, 'code');
					}

					if (data.codeAttemps.attemps === -1) {
						setIsModalOpen(false);
						setAuthCode('');
						setIsValidAuth(undefined);
						loginResponse.error =
							'Por razones de seguridad tu usuario se encuentra bloqueado.';
					}

					loginResponse.is2Factive.attemps.attemps =
						data.codeAttemps.attemps;
					loginResponse.is2Factive.attemps.last_attemp =
						data.codeAttemps.last_attemp;

					setDisableTimeout(
						loginResponse.is2Factive.attemps.attemps,
						loginResponse.is2Factive.attemps.last_attemp,
						'code'
					);
				}
			});
	};

	const goToVault = (event: MouseEvent): Promise<void> => {
		event.preventDefault();

		const requestOptions: requestOptions = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				access_token: jwtToken,
				username: loginData.username,
				password: loginData.password
			})
		};

		return fetch(`${BASE_URL}${VAULT_VERIFY_TOKEN}`, requestOptions)
			.then((res: any) => {
				return res.json();
			})
			.then(async (data: verifyTokenResponse) => {
				if (data.expired) {
					setIsValidAuth(undefined);
					setJwtToken(undefined);
					setJwtTokenError(true);
					setLoginData({
						username: '',
						password: ''
					});
				}

				if (!data.expired && !data.token) {
					setLoginResponse({
						...loginResponse,
						error: 'Ocurrio un error al generar tu token de acceso'
					});
				}

				if (!data.expired && data.token && VAULT_SERVER_URL) {
					navigator.clipboard.writeText(data.token);
					window.location.href = VAULT_SERVER_URL;
				}
			});
	};

	const setDisableTimeout = (
		count: number,
		last_attemp: number,
		type: 'pwd' | 'code'
	): void => {
		const currentTime: number = Date.now();
		let timeDisabled: number = 0;
		let tempDisabled: number | undefined;
		let disabledUntil: number | undefined;

		if (type === 'pwd') {
			setDisabled(true);
		} else {
			setQrDisabled(true);
		}

		disabledUntil =
			count === 1 || count === 5
				? 0
				: count === 2
				? last_attemp + 5000
				: count === 3
				? last_attemp + 30000
				: last_attemp + 300000;

		tempDisabled = disabledUntil - currentTime;

		if (tempDisabled > 0) {
			timeDisabled = tempDisabled;
			setIsDisabledUntil(tempDisabled);
		}

		setTimeout(() => {
			setDisabled(false);
			setQrDisabled(false);
			setIsDisabledUntil(0);
		}, timeDisabled);
	};

	const renderer = ({
		minutes,
		seconds
	}: {
		minutes: number;
		seconds: number;
	}): ReactElement => {
		const formattedMinutes = ('0' + minutes).slice(-2);
		const formattedSeconds = ('0' + seconds).slice(-2);

		return (
			<span className="counter-showing">{`${formattedMinutes}:${formattedSeconds}`}</span>
		);
	};

	const toggleVisible = (): void => {
		setVisible(!visible);

		if (visible) {
			setInputType('password');
		} else {
			setInputType('text');
		}
	};

	return (
		<div className="main-container">
			<div className="telered-logo-container">
				<img
					className="telered-logo"
					src={TeleredLogo}
					alt="https://www.telered.com.ar/"
				/>
			</div>

			{isValidAuth && jwtToken ? (
				<div className="body-container">
					<div className="title-container">
						<h2 className="title">
							El servidor vault, fue configurado correctamente.
						</h2>
					</div>
					<div className="valid-container">
						<div className="showing-error-container">
							<span>
								Al presionar el botón se copiará tu código de
								acceso para ingresar en vault. El mismo debe ser
								pegado en el input correspondiente.
							</span>
						</div>
						<div className="showing-error-container">
							<span className="showing-data">
								Tené en cuenta que tu acceso a Vault estará
								limitado por <strong>5 minutos</strong>. Luego
								de este tiempo perderás el acceso, debiendo
								generar un nuevo Token, repitiendo la
								autenticación.
							</span>
						</div>
						<button
							className="submit-btn"
							onClick={(event) => goToVault(event)}
						>
							Ingresar a Vault
						</button>
					</div>
				</div>
			) : isValidAuth && !jwtToken ? (
				<div className="body-container">
					<div className="title-container">
						<h2 className="title">
							Ah ocurrido un error en el proceso de autenticación.
						</h2>
						<div className="showing-error-container">
							<span className="showing-error">
								Por favor contactá con el sector de Desarrollo
								para poder solucionar el inconveniente.
							</span>
						</div>
					</div>
				</div>
			) : (
				<div className="body-container">
					<div className="title-container">
						<h2 className="title">
							Iniciá sesión y comenzá a utilizar los servicios de
							Vault.
						</h2>
					</div>
					<form onSubmit={(event) => handleSubmit(event)}>
						<div className="form-control-container">
							<input
								className="form-control"
								type="text"
								name="username"
								placeholder="Nombre de usuario"
								value={loginData.username}
								onChange={(event) => handleChanges(event)}
							/>

							<div className="pwd-control-container">
								<input
									className="form-control"
									type={inputType}
									name="password"
									placeholder="Contraseña"
									value={loginData.password}
									onChange={(event) => handleChanges(event)}
								/>

								{visible ? (
									<img
										className="form-control-img"
										alt="pwd-visible-icon"
										onClick={() => toggleVisible()}
										src={PwdOculta}
									/>
								) : (
									<img
										className="form-control-img"
										alt="pwd-visible-icon"
										onClick={() => toggleVisible()}
										src={PwdVisible}
									/>
								)}
							</div>
							<button
								className="submit-btn"
								type="submit"
								disabled={
									!loginData.username ||
									!loginData.password ||
									disabled
								}
							>
								Iniciar sesión
							</button>
						</div>
					</form>
					<div className="showing-error-container">
						{loginResponse.error ? (
							<span className="showing-error">
								{loginResponse.error}
							</span>
						) : loginResponse.isChecked.error ? (
							<span className="showing-error">
								El usuario o contraseña administradas son
								incorrectos.
							</span>
						) : loginResponse.is2Factive.error ? (
							<span className="showing-error">
								El servidor no está funcionando correctamente.
							</span>
						) : jwtTokenError ? (
							<span className="showing-error">
								El token de acceso expiró, por favor repetí el
								proceso de autenticación y obtené uno nuevo.
							</span>
						) : null}
					</div>
					{!isDisabledUntil ? (
						<div className="showing-counter-container"></div>
					) : (
						<div className="showing-counter-container">
							<span className="showing-error">
								Podrás intentarlo nuevamente en:
							</span>
							<Countdown
								date={Date.now() + isDisabledUntil}
								intervalDelay={0}
								precision={3}
								renderer={renderer}
							/>
						</div>
					)}
				</div>
			)}

			<QrModal
				isOpen={isModalOpen}
				authCode={authCode}
				loginResponse={loginResponse}
				isValidAuth={isValidAuth}
				qrDisabled={qrDisabled}
				isDisabledUntil={isDisabledUntil}
				handleChangesAuth={(event: ChangeEvent<HTMLInputElement>) =>
					handleChangesAuth(event)
				}
				closeModal={() => {
					setAuthCode('');
					setIsModalOpen(false);
					setIsValidAuth(undefined);
				}}
				getQrImage={() => getQrImage()}
				checkIsValid={() => checkIsValid()}
				renderer={renderer}
			/>
		</div>
	);
};
