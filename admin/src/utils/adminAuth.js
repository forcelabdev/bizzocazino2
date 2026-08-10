export const ADMIN_MFA_CHALLENGE_STORAGE_KEY = "adminMfaChallenge"

export const readAdminMfaChallenge = () => {
  const rawValue = localStorage.getItem(ADMIN_MFA_CHALLENGE_STORAGE_KEY)
  if (!rawValue)
    return null

  try {
    return JSON.parse(rawValue)
  } catch (error) {
    localStorage.removeItem(ADMIN_MFA_CHALLENGE_STORAGE_KEY)

    return null
  }
}

export const persistAdminMfaChallenge = challenge => {
  localStorage.setItem(ADMIN_MFA_CHALLENGE_STORAGE_KEY, JSON.stringify(challenge))
}

export const clearAdminMfaChallenge = () => {
  localStorage.removeItem(ADMIN_MFA_CHALLENGE_STORAGE_KEY)
}

export const persistAdminSession = ({
  accessToken,
  userData,
  userAbilities = [],
  userPermissions = [],
  ability,
  permissionStore,
}) => {
  localStorage.setItem("userAbilities", JSON.stringify(userAbilities))
  localStorage.setItem("userData", JSON.stringify(userData))
  localStorage.setItem("accessToken", JSON.stringify(accessToken))
  localStorage.setItem("userPermissions", JSON.stringify(userPermissions))

  ability.update(userAbilities)
  permissionStore.setPermissions(
    userPermissions,
    userData?.adminRole,
    userData?.isSuperAdmin || false,
  )

  clearAdminMfaChallenge()
}
