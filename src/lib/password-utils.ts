const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!'

export function generateRandomPassword(length = 12): string {
  let password = ''
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARS.charAt(Math.floor(Math.random() * PASSWORD_CHARS.length))
  }
  return password
}
