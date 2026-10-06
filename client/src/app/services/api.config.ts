declare global {
	interface Window {
		TASKSTREAK_API_URL?: string;
	}
}

export const API_BASE_URL = (window.TASKSTREAK_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const AUTH_TOKEN_KEY = 'taskstreak_token';
