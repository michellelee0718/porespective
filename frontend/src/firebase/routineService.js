import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase-config";

// Check if user is logged in and return their uid or null
const getCurrentUserId = () => {
  return auth.currentUser ? auth.currentUser.uid : null;
};

// Get the current date in the format YYYY-MM-DD
const getTodayDateString = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Initialize or reset daily check-in status
export const initDailyCheckIn = async () => {
  const userId = getCurrentUserId();
  if (!userId) return null;
  
  const userRef = doc(db, "users", userId);
  const docSnap = await getDoc(userRef);
  
  if (!docSnap.exists()) return null;
  
  const userData = docSnap.data();
  const today = getTodayDateString();
  
  // Check if we need to reset for a new day
  if (!userData.routineCheckIn || userData.routineCheckIn.lastResetDate !== today) {
    const routineCheckIn = {
      lastResetDate: today,
      amCompleted: false,
      pmCompleted: false
    };
    
    await updateDoc(userRef, { routineCheckIn });
    return routineCheckIn;
  }
  
  return userData.routineCheckIn;
};

// Mark a routine as completed
export const markRoutineCompleted = async (routineType) => {
  if (routineType !== "am" && routineType !== "pm") {
    throw new Error("Invalid routine type. Must be 'am' or 'pm'");
  }
  
  const userId = getCurrentUserId();
  if (!userId) return null;
  
  await initDailyCheckIn();
  
  const userRef = doc(db, "users", userId);
  const updateField = routineType === "am" ? "amCompleted" : "pmCompleted";
  
  await updateDoc(userRef, {
    [`routineCheckIn.${updateField}`]: true
  });
  
  return true;
};

// Get current check-in status
export const getRoutineCheckInStatus = async () => {
  const userId = getCurrentUserId();
  if (!userId) return null;
  
  const checkInStatus = await initDailyCheckIn();
  return checkInStatus;
}; 