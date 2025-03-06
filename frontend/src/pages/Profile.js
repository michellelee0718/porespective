import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase-config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { initDailyCheckIn, markRoutineCompleted, getRoutineCheckInStatus } from "../firebase/routineService";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [routineStatus, setRoutineStatus] = useState({ amCompleted: false, pmCompleted: false });
  const [formData, setFormData] = useState({
    fullName: "",
    gender: "",
    skinType: "",
    skinConcerns: "",
    allergies: "",
    skincareRoutine: { am: "", pm: "" },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setFormData({
            fullName: data.fullName || auth.currentUser?.displayName || "",
            gender: data.gender || "",
            skinType: data.skinType || "",
            skinConcerns: data.skinConcerns || "",
            allergies: data.allergies || "",
            skincareRoutine: {
              am: data.skincareRoutine?.am || "",
              pm: data.skincareRoutine?.pm || "",
            },
          });
          
          // Initialize check-in status for today if needed
          const status = await getRoutineCheckInStatus();
          if (status) {
            setRoutineStatus({
              amCompleted: status.amCompleted,
              pmCompleted: status.pmCompleted
            });
          }
        } else {
          // If user doesn't exist, initialize with default values
          setFormData({
            fullName: auth.currentUser?.displayName || "",
            gender: "",
            skinType: "",
            skinConcerns: "",
            allergies: "",
            skincareRoutine: { am: "", pm: "" },
          });
          
          // Initialize a fresh check-in record
          await initDailyCheckIn();
        }
      }
      setLoading(false);
    };

    fetchUserData();
    
    // Set up check-in reset at midnight
    const checkMidnightReset = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        initDailyCheckIn().then(status => {
          if (status) {
            setRoutineStatus({
              amCompleted: status.amCompleted,
              pmCompleted: status.pmCompleted
            });
          }
        });
      }
    };
    
    const resetInterval = setInterval(checkMidnightReset, 60000); // Check every minute
    
    return () => clearInterval(resetInterval);
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("skincareRoutine")) {
      const routineType = name.split(".")[1]; // Extract "am" or "pm"
      setFormData((prev) => ({
        ...prev,
        skincareRoutine: { ...prev.skincareRoutine, [routineType]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Save data to Firestore
  const handleSave = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        await updateDoc(userRef, formData); // Update existing user
      } else {
        await setDoc(userRef, formData); // Create a new user if none exists
      }

      setUserData(formData);
      setEditing(false);
    }
  };
  
  // Handle routine check-in
  const handleRoutineCheckIn = async (routineType) => {
    try {
      await markRoutineCompleted(routineType);
      setRoutineStatus(prev => ({
        ...prev,
        [routineType === "am" ? "amCompleted" : "pmCompleted"]: true
      }));
    } catch (error) {
      // Show an error message to the user 
      console.error("Error marking routine as completed:", error);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          {auth.currentUser?.photoURL ? (
            <img
              src={auth.currentUser.photoURL}
              alt="Profile"
              onError={(e) => (e.target.style.display = "none")}
            />
          ) : (
            <span className="profile-avatar-icon">👤</span>
          )}
        </div>
        <div className="profile-details">
          {editing ? (
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
          ) : (
            <p className="profile-name">{userData?.fullName || auth.currentUser?.displayName}</p>
          )}
          <p className="profile-email">{auth.currentUser?.email}</p>
        </div>
      </div>

      <div className="profile-info-container">
        <table className="profile-table">
          <tbody>
            <tr>
              <td><strong>Gender:</strong></td>
              <td>
                {editing ? (
                  <select name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Nonbinary">Nonbinary</option>
                </select>
                ) : (
                  userData?.gender || "Not specified"
                )}
              </td>
            </tr>
            <tr>
              <td><strong>Skin Type:</strong></td>
              <td>
                {editing ? (
                <select name="skinType" value={formData.skinType} onChange={handleChange}>
                <option value="">Select Skin Type</option>
                <option value="Dry">Dry</option>
                <option value="Oily">Oily</option>
                <option value="Normal">Normal</option>
                <option value="Sensitive">Sensitive</option>
                <option value="Combination">Combination</option>
              </select>
                ) : (
                  userData?.skinType || "Not specified"
                )}
              </td>
            </tr>
            <tr>
              <td><strong>Skin Concerns:</strong></td>
              <td>
                {editing ? (
                  <input
                    type="text"
                    name="skinConcerns"
                    value={formData.skinConcerns}
                    onChange={handleChange}
                  />
                ) : (
                  userData?.skinConcerns || "None"
                )}
              </td>
            </tr>
            <tr>
              <td><strong>Allergies:</strong></td>
              <td>
                {editing ? (
                  <input
                    type="text"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                  />
                ) : (
                  userData?.allergies || "None"
                )}
              </td>
            </tr>
            <tr>
              <td><strong>AM Routine:</strong></td>
              <td>
                {editing ? (
                  <input
                    type="text"
                    name="skincareRoutine.am"
                    value={formData.skincareRoutine.am}
                    onChange={handleChange}
                  />
                ) : (
                  userData?.skincareRoutine?.am || "Not specified"
                )}
              </td>
            </tr>
            <tr>
              <td><strong>PM Routine:</strong></td>
              <td>
                {editing ? (
                  <input
                    type="text"
                    name="skincareRoutine.pm"
                    value={formData.skincareRoutine.pm}
                    onChange={handleChange}
                  />
                ) : (
                  userData?.skincareRoutine?.pm || "Not specified"
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* check-in section */}
      <div className="routine-checkin-container">
        <h3>Today's Skincare Routine</h3>
        <div className="routine-status">
          <div className="routine-card">
            <h3>Morning Routine</h3>
            <p>Status: {routineStatus.amCompleted ? "Completed" : "Pending"}</p>
            <p>Scheduled for: {userData?.skincareRoutine?.am || "Not set"}</p>
            {!routineStatus.amCompleted && (
              <button 
                className="checkin-button"
                onClick={() => handleRoutineCheckIn("am")}
                disabled={!userData?.skincareRoutine?.am}
              >
                Mark as Done
              </button>
            )}
          </div>
          
          <div className="routine-card">
            <h3>Evening Routine</h3>
            <p>Status: {routineStatus.pmCompleted ? "Completed" : "Pending"}</p>
            <p>Scheduled for: {userData?.skincareRoutine?.pm || "Not set"}</p>
            {!routineStatus.pmCompleted && (
              <button 
                className="checkin-button"
                onClick={() => handleRoutineCheckIn("pm")}
                disabled={!userData?.skincareRoutine?.pm}
              >
                Mark as Done
              </button>
            )}
          </div>
        </div>
      </div>

      <button className="profile-edit-button" onClick={() => setEditing(!editing)}>
        {editing ? "Cancel" : "Edit"}
      </button>

      {editing && (
        <button className="profile-save-button" onClick={handleSave}>
          Save
        </button>
      )}
    </div>
  );
};

export default Profile;