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

// VAULT API RESPONSES
export interface userpassResponse {
	request_id: string;
	lease_id: string;
	renewable: boolean;
	lease_duration: number;
	data: null;
	wrap_info: null;
	warnings: null;
	auth: userpassResponseAuth;
}

export interface userpassResponseAuth {
	client_token: string;
	accesor: string;
	policies: string[];
	token_policies: string[];
	metadata: {
		username: string;
	};
	lease_duration: number;
	renewable: boolean;
	entity_id: string | null;
	token_type: string;
	orphan: boolean;
	mfa_requirement: null;
	num_uses: number;
}
