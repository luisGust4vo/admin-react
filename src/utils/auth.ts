export const AUTH_TOKEN_KEY = "odonto_auth_token";
export const AUTH_USER_KEY = "odonto_auth_user";
export const AUTH_EMAIL_KEY = "odonto_auth_email";

export const getAuthToken = () => {
  const localToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (localToken) return localToken;

  return sessionStorage.getItem(AUTH_TOKEN_KEY);
};

export const hasAuthToken = () => Boolean(getAuthToken());

export const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_EMAIL_KEY);

  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_EMAIL_KEY);
};
