import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase-config";

export const showNotification = (message) => {
  if (Notification.permission === "granted") {
    new Notification("Skincare Reminder", {
      body: message,
    });
  }
};

export const sendEmail = async () => {
  if (!auth.currentUser) return;
  const userRef = doc(db, "users", auth.currentUser.uid);
  const docSnap = await getDoc(userRef);
  if (!docSnap.exists()) return;
  const userData = docSnap.data();
  if (!userData) return;

  const userEmail = userData.email; 

  const url = "http://localhost:3001/send-email";
  console.log("Sending email to URL: ", url);
  try {
    const response = await fetch(url, {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Porespective - Skincare Routine Reminder!", 
        email: userEmail,
        message: "Reminder to do your skincare routine today!"
      }),
    }); 
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    } 
    const json = await response.json();
    console.log(json);
  } catch (error) {
    console.error(error.message);
  }
};


export const resetNotifications = async () => {
  if (!auth.currentUser) return;
  const userRef = doc(db, "users", auth.currentUser.uid);
  const docSnap = await getDoc(userRef);
  const userData = docSnap.data();
  await updateDoc(userRef, {
    [`pmNotification`]: false,
    [`amNotification`]: false,
  });
};

export const scheduleNotifications = async () => {
  if (!auth.currentUser) return;
    const userRef = doc(db, "users", auth.currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) return;


  
    const userData = docSnap.data();
    if (!userData) return;



    const am = userData.skincareRoutine.am;
    const pm = userData.skincareRoutine.pm;
    const amCompleted = userData.routineCheckIn.amCompleted;
    const pmCompleted = userData.routineCheckIn.pmCompleted;
    let amNotification = userData.amNotification;
    let pmNotification = userData.pmNotification;

    if (!am && !pm && !amCompleted && !pmCompleted) return;
    const now = new Date();

    let hours = now.getHours();

    if (hours > 12) { 
        hours = hours - 12; 
        const pmTime = hours.toString() + ":" + now.getMinutes().toString().padStart(2, '0');
        if (pmTime === pm && !pmCompleted && !pmNotification) {

          await updateDoc(userRef, {
            [`pmNotification`]: true
          });
          await sendEmail();
          showNotification("Time for your night skincare routine!");
          
          } 
    } else {
        const amTime = now.getHours().toString() + ":" + now.getMinutes().toString().padStart(2, '0');
        if (amTime === am && !amCompleted && !amNotification) {
           showNotification("Time for your morning skincare routine!");
           await updateDoc(userRef, {
            [`amNotification`]: true
          });
          await sendEmail();
          }
    }
};

const resetInterval = setInterval(scheduleNotifications, 30000);
clearInterval(resetInterval);