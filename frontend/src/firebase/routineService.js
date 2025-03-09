import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { auth, db } from "../firebase-config"

// Check if user is logged in and return their uid or null
const getCurrentUserId = () => {
  return auth.currentUser ? auth.currentUser.uid : null
}

// Get the current date in the format YYYY-MM-DD
export const getTodayDateString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

// Initialize or reset daily check-in status
export const initDailyCheckIn = async () => {
  const userId = getCurrentUserId()
  if (!userId) return null

  const userRef = doc(db, "users", userId)
  const docSnap = await getDoc(userRef)

  if (!docSnap.exists()) {
    const newUserData = {
      fullName: auth.currentUser?.displayName || "",
      email: auth.currentUser?.email || "",
      createdAt: new Date(),
      skincareRoutine: { am: "", pm: "" },
      routineCheckIn: {
        lastResetDate: getTodayDateString(),
        amCompleted: false,
        pmCompleted: false,
      },
    }

    await setDoc(userRef, newUserData)
    return newUserData.routineCheckIn
  }

  const userData = docSnap.data()
  const today = getTodayDateString()

  // Check if we need to reset for a new day
  if (
    !userData.routineCheckIn ||
    userData.routineCheckIn.lastResetDate !== today
  ) {
    const routineCheckIn = {
      lastResetDate: today,
      amCompleted: false,
      pmCompleted: false,
    }

    await updateDoc(userRef, { routineCheckIn })
    return routineCheckIn
  }

  return userData.routineCheckIn
}

// Mark a routine as completed
export const markRoutineCompleted = async routineType => {
  if (routineType !== "am" && routineType !== "pm") {
    throw new Error("Invalid routine type. Must be 'am' or 'pm'")
  }

  const userId = getCurrentUserId()
  if (!userId) return null

  await initDailyCheckIn()

  const userRef = doc(db, "users", userId)
  const updateField = routineType === "am" ? "amCompleted" : "pmCompleted"

  await updateDoc(userRef, {
    [`routineCheckIn.${updateField}`]: true,
  })

  return true
}

// Get current check-in status
export const getRoutineCheckInStatus = async () => {
  const userId = getCurrentUserId()
  if (!userId) return null

  const checkInStatus = await initDailyCheckIn()
  return checkInStatus
}
