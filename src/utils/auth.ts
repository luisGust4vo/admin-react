export const AUTH_TOKEN_KEY = "odonto_auth_token";
export const AUTH_USER_KEY = "odonto_auth_user";
export const AUTH_EMAIL_KEY = "odonto_auth_email";

type AuthUserPayload = Record<string, unknown>;

export type AuthProfile = {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl: string;
};

export type AuthProfileUpdate = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl?: string;
};

export const getAuthToken = () => {
  const localToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (localToken) return localToken;

  return sessionStorage.getItem(AUTH_TOKEN_KEY);
};

export const hasAuthToken = () => Boolean(getAuthToken());

const getFromStorages = (key: string) => {
  const localValue = localStorage.getItem(key);
  if (localValue) return localValue;
  return sessionStorage.getItem(key);
};

const readAuthUser = (): AuthUserPayload | null => {
  const rawUser = getFromStorages(AUTH_USER_KEY);
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser);
    if (parsed && typeof parsed === "object") {
      return parsed as AuthUserPayload;
    }
  } catch {
    return null;
  }

  return null;
};

const pickString = (obj: AuthUserPayload | null, keys: string[]) => {
  if (!obj) return "";

  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

export const getAuthProfile = (): AuthProfile => {
  const user = readAuthUser();
  const email = getFromStorages(AUTH_EMAIL_KEY) ?? pickString(user, ["email"]);
  const fullName = pickString(user, [
    "name",
    "fullName",
    "username",
    "displayName",
  ]);
  const firstName = pickString(user, ["firstName", "givenName"]);
  const lastName = pickString(user, ["lastName", "familyName", "surname"]);
  const combinedName =
    fullName || `${firstName} ${lastName}`.trim() || "Usuário";
  const nameParts = combinedName.split(" ");

  return {
    fullName: combinedName,
    firstName: firstName || nameParts[0] || "Usuário",
    lastName: lastName || nameParts.slice(1).join(" "),
    email: email || "",
    role:
      pickString(user, ["role", "jobTitle", "occupation", "position"]) ||
      "Clínica",
    avatarUrl: pickString(user, ["avatar", "avatarUrl", "photo", "photoUrl", "image"]),
  };
};

export const getProfileInitials = (fullName: string) => {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

export const updateAuthProfile = (updates: AuthProfileUpdate) => {
  const currentUser = readAuthUser() ?? {};
  const fullName = `${updates.firstName} ${updates.lastName}`.trim();
  const nextUser: AuthUserPayload = {
    ...currentUser,
    firstName: updates.firstName,
    lastName: updates.lastName,
    name: fullName,
    fullName,
    email: updates.email,
    role: updates.role,
  };

  if (typeof updates.avatarUrl === "string") {
    nextUser.avatarUrl = updates.avatarUrl;
    nextUser.avatar = updates.avatarUrl;
    nextUser.photo = updates.avatarUrl;
    nextUser.photoUrl = updates.avatarUrl;
    nextUser.image = updates.avatarUrl;
  }

  const serializedUser = JSON.stringify(nextUser);
  const normalizedEmail = updates.email.trim();

  localStorage.setItem(AUTH_USER_KEY, serializedUser);
  sessionStorage.setItem(AUTH_USER_KEY, serializedUser);

  if (normalizedEmail) {
    localStorage.setItem(AUTH_EMAIL_KEY, normalizedEmail);
    sessionStorage.setItem(AUTH_EMAIL_KEY, normalizedEmail);
  } else {
    localStorage.removeItem(AUTH_EMAIL_KEY);
    sessionStorage.removeItem(AUTH_EMAIL_KEY);
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_EMAIL_KEY);

  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_EMAIL_KEY);
};
