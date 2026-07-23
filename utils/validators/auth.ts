/**
 * Checks if a required text field contains a value.
 */
export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validates a person's full name.
 *
 * Rules:
 * - Cannot be empty
 * - At least 2 characters
 */
export const validateName = (name: string): boolean => {
  const trimmedName = name.trim();

  return trimmedName.length >= 2;
};

/**
 * Validates an email address.
 */
export const validateEmail = (email: string): boolean => {
  const trimmedEmail = email.trim();

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return regex.test(trimmedEmail);
};

/**
 * Validates a password.
 *
 * Rules:
 * - At least 8 characters
 */
export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

/**
 * Checks if password and confirm password match.
 */
export const passwordsMatch = (
  password: string,
  confirmPassword: string,
): boolean => {
  return password === confirmPassword;
};