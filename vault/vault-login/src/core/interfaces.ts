// REQUESTS BODY
export interface loginBody {
	username: string;
	password: string;
}

export interface qrCodeBody {
	authCode: string;
	username: string;
	password: string;
}

export interface verifyTokenBody {
	access_token: string;
}

// RESPONSES
export interface loginResponse {
	isChecked: responseIsChecked;
	is2Factive: response2Factive;
	error: string | undefined;
	activeTimeout: timeoutAttemps;
}
export interface totpResponse {
	error: number | undefined;
	body: string;
}
export interface checkCodigoResponse {
	isValid: boolean;
	access_token: undefined | string;
	codeAttemps: checkCodigoAttemps;
}

export interface verifyTokenResponse {
	expired: boolean;
	token: string | undefined;
}

export interface responseIsChecked {
	checked: boolean;
	error: boolean;
	attemps: loginAttemps;
}

export interface response2Factive {
	active: boolean;
	error: boolean;
	attemps: loginAttemps;
}

// PURE INTERFACES
export interface loginAttemps {
	attemps: number;
	last_attemp: number;
}
export interface timeoutAttemps {
	active: boolean;
	time_out_data: loginAttemps;
	active_timeout_request: number | undefined;
}
export interface errorAttemps extends loginAttemps {
	active_timeout_request: number;
}

export interface checkCodigoAttemps extends loginAttemps {
	activeTimeout: timeoutAttemps;
}
export interface JwtPayload {
	username: string;
	policies: string[];
}

export interface inputType {
	type: 'password' | 'text';
}

export interface requestOptions {
	method: 'POST' | 'GET' | 'PUT';
	headers: {
		'Content-Type': string;
	};
	body: string;
}
