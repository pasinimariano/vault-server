import { useEffect, useState, useRef, ChangeEvent, ReactElement } from 'react';
import Modal from 'react-bootstrap/Modal';
import Image from 'react-bootstrap/Image';
import Countdown from 'react-countdown';
import LogoTelered from '../../assets/telered_icon.png';
import Loading from '../../assets/loading.png';
import { loginResponse } from '../../core/interfaces';
import './qrModalStyles.css';

export const QrModal = ({
	isOpen,
	authCode,
	loginResponse,
	isValidAuth,
	qrDisabled,
	isDisabledUntil,
	handleChangesAuth,
	closeModal,
	getQrImage,
	checkIsValid,
	renderer
}: {
	isOpen: boolean;
	authCode: string;
	loginResponse: loginResponse;
	isValidAuth: boolean | undefined;
	qrDisabled: boolean;
	isDisabledUntil: number;
	handleChangesAuth: (event: ChangeEvent<HTMLInputElement>) => void;
	closeModal: () => void;
	getQrImage: () => Promise<string | undefined>;
	checkIsValid: () => void;
	renderer: ({
		minutes,
		seconds
	}: {
		minutes: number;
		seconds: number;
	}) => ReactElement;
}) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [imageURL, setImageURL] = useState<undefined | string>(undefined);

	useEffect(() => {
		const getImageURL = async () => {
			const qrIMAGE = await getQrImage();
			setImageURL(qrIMAGE);
		};

		if (
			isOpen &&
			!loginResponse.is2Factive.active &&
			!loginResponse.is2Factive.error &&
			!imageURL
		) {
			getImageURL();
		}

		if (inputRef.current && isOpen) {
			inputRef.current.focus();
		}
	}, [imageURL, isOpen, loginResponse, getQrImage]);

	return (
		<Modal
			show={isOpen}
			onHide={closeModal}
			backdrop="static"
			keyboard={false}
			aria-labelledby="contained-modal-title-vcenter"
			centered
		>
			<Modal.Header closeButton className="modal-header">
				<Image
					className="modal-logo"
					src={LogoTelered}
					alt="Telered icon"
				/>
				<Modal.Title> Two-factor Authentication </Modal.Title>
			</Modal.Header>
			<Modal.Body className="modal-body">
				{loginResponse.is2Factive.active ? (
					<div className="body-container">
						<span>
							Abrí la aplicación de two-factor authentication en
							tu dispositivo para ver tu código de autenticación.
						</span>

						<div className="form-control-container">
							<input
								className="form-control-code"
								type="text"
								name="username"
								placeholder="XXXXXX"
								maxLength={6}
								ref={inputRef}
								value={authCode}
								onChange={(event) => handleChangesAuth(event)}
							/>
						</div>
					</div>
				) : (
					<div className="body-container">
						<span className="modal-body-first">
							Escaneá la siguiente imagen con la aplicación de
							two-factor authentication de tu teléfono.
						</span>
						{!imageURL ? (
							<div className="qr-image-container">
								<Image src={Loading} alt="loading-icon" />
							</div>
						) : (
							<div className="qr-image-container">
								<Image src={`${imageURL}`} />
							</div>
						)}
						<span>
							Ingresá el código que la aplicación te administró.
						</span>
						<span>
							Tras escanear la imagen del código QR, la aplicación
							mostrará un código que podrás introducir a
							continuación.
						</span>
						<div className="form-control-container">
							<input
								className="form-control-code"
								type="text"
								name="username"
								placeholder="XXXXXX"
								maxLength={6}
								ref={inputRef}
								value={authCode}
								onChange={(event) => handleChangesAuth(event)}
							/>
						</div>
					</div>
				)}
				<div className="showing-error-container">
					{isValidAuth !== undefined && !isValidAuth ? (
						<span className="showing-error">
							El código administrado es incorrecto.
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
			</Modal.Body>
			<Modal.Footer>
				<button className="submit-btn cancel-btn" onClick={closeModal}>
					Cancelar
				</button>
				<button
					className="submit-btn continue-btn"
					onClick={checkIsValid}
					disabled={!authCode || qrDisabled}
				>
					Continuar
				</button>
			</Modal.Footer>
		</Modal>
	);
};
