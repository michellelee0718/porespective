import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase-config";

const showNotification = (message) => {
  if (Notification.permission === "granted") {
    new Notification("Skincare Reminder", {
      body: message,
    });
  }
};

export const scheduleNotifications = async () => {
  if (!auth.currentUser) return;

  const userRef = doc(db, "users", auth.currentUser.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) return;

  const checkAndNotify = () => {
    const { skincareRoutine } = docSnap.data();
    if (!skincareRoutine) return;

    const { am, pm } = skincareRoutine;

    if (!am && !pm) return;

    const now = new Date();

    let hours = now.getHours();
    if (hours > 12) {
      hours = hours - 12;
      const pmTime = hours.toString() + ":" + now.getMinutes().toString();
      if (pmTime === pm) {
        showNotification("Time for your night skincare routine!");
      }
    } else {
      const amTime =
        now.getHours().toString() + ":" + now.getMinutes().toString();
      if (amTime === am) {
        showNotification("Time for your morning skincare routine!");
      }
    }
  };

  setInterval(checkAndNotify, 60000);
};
