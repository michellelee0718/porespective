import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase-config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { resetNotifications } from "../components/Notification";
import {
  initDailyCheckIn,
  markRoutineCompleted,
  getRoutineCheckInStatus,
} from "../firebase/routineService";
import { useAuthState } from "react-firebase-hooks/auth";

const Profile = () => {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [routineStatus, setRoutineStatus] = useState({
    amCompleted: false,
    pmCompleted: false,
  });

  // Generate time options
  const hours = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0"),
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );

  const [formData, setFormData] = useState({
    fullName: "",
    gender: "",
    skinType: "",
    skinConcerns: "",
    allergies: "",
    skincareRoutine: {
      am: { hour: "6", minute: "00", period: "AM" },
      pm: { hour: "6", minute: "00", period: "PM" },
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        // Parse existing time strings into hour, minute, period format
        const parseTime = (timeStr) => {
          if (!timeStr) return { hour: "06", minute: "00", period: "AM" };
          const [time] = timeStr.split(" ");
          const [hour, minute] = time.split(":");
          return {
            hour: hour.padStart(2, "0"),
            minute: minute.padStart(2, "0"),
            period: timeStr.includes("PM") ? "PM" : "AM",
          };
        };

        setFormData({
          fullName: data.fullName || user?.displayName || "",
          gender: data.gender || "",
          skinType: data.skinType || "",
          skinConcerns: data.skinConcerns || "",
          allergies: data.allergies || "",
          skincareRoutine: {
            am: parseTime(data.skincareRoutine?.am),
            pm: parseTime(data.skincareRoutine?.pm),
          },
        });

        // Initialize check-in status for today if needed
        const status = await getRoutineCheckInStatus();
        if (status) {
          setRoutineStatus({
            amCompleted: status.amCompleted,
            pmCompleted: status.pmCompleted,
          });
        }
      } else {
        // If user doesn't exist, initialize with default values
        setFormData({
          fullName: user?.displayName || "",
          gender: "",
          skinType: "",
          skinConcerns: "",
          allergies: "",
          skincareRoutine: {
            am: { hour: "06", minute: "00", period: "AM" },
            pm: { hour: "06", minute: "00", period: "PM" },
          },
        });

        // Initialize a fresh check-in record
        await initDailyCheckIn();
      }
    };

    if (!loading) {
      fetchUserData();
    }

    // Set up check-in reset at midnight
    const checkMidnightReset = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        initDailyCheckIn().then((status) => {
          if (status) {
            setRoutineStatus({
              amCompleted: status.amCompleted,
              pmCompleted: status.pmCompleted,
            });
          }
        });
        resetNotifications();
      }
    };

    const resetInterval = setInterval(checkMidnightReset, 60000); // Check every minute

    return () => clearInterval(resetInterval);
  }, [user, loading]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("am") || name.startsWith("pm")) {
      const [routine, timeComponent] = name.split("_");
      setFormData((prev) => ({
        ...prev,
        skincareRoutine: {
          ...prev.skincareRoutine,
          [routine]: {
            ...prev.skincareRoutine[routine],
            [timeComponent]: value,
            period: routine.toUpperCase(), // Ensure period stays fixed
          },
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Save data to Firestore
  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (!user) return;

      const userRef = doc(db, "users", user.uid);

      // Format times before saving
      const formattedData = {
        ...formData,
        skincareRoutine: {
          am: `${formData.skincareRoutine.am.hour}:${formData.skincareRoutine.am.minute} ${formData.skincareRoutine.am.period}`,
          pm: `${formData.skincareRoutine.pm.hour}:${formData.skincareRoutine.pm.minute} ${formData.skincareRoutine.pm.period}`,
        },
      };

      const regex = /^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$/;
      if (
        !regex.test(formattedData.skincareRoutine.am) ||
        !regex.test(formattedData.skincareRoutine.pm)
      ) {
        alert("Please input a valid time in HH/MM format");
        return;
      }

      await updateDoc(userRef, formattedData);

      setUserData({
        ...userData,
        ...formattedData,
      });

      setIsSaving(false);
      setEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      setIsSaving(false);
      alert("Error saving profile. Please try again.");
    }
  };

  const TimeSelector = ({ prefix, value, onChange, disabled }) => (
    <div className="time-selector">
      <select
        name={`${prefix}_hour`}
        value={value.hour}
        onChange={onChange}
        disabled={disabled}
      >
        {hours.map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>
      <span>:</span>
      <select
        name={`${prefix}_minute`}
        value={value.minute}
        onChange={onChange}
        disabled={disabled}
      >
        {minutes.map((minute) => (
          <option key={minute} value={minute}>
            {minute}
          </option>
        ))}
      </select>
      <span>{prefix.toUpperCase()}</span>
    </div>
  );

  // Handle routine check-in
  const handleRoutineCheckIn = async (routineType) => {
    try {
      await markRoutineCompleted(routineType);
      setRoutineStatus((prev) => ({
        ...prev,
        [routineType === "am" ? "amCompleted" : "pmCompleted"]: true,
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
          {user?.photoURL ? (
            <img
              src={user.photoURL}
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
            <p className="profile-name">
              {userData?.fullName || user?.displayName}
            </p>
          )}
          <p className="profile-email">{user?.email}</p>
        </div>
      </div>

      <div className="profile-info-container">
        <table className="profile-table">
          <tbody>
            <tr>
              <td>
                <strong>Gender:</strong>
              </td>
              <td>
                {editing ? (
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
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
              <td>
                <strong>Skin Type:</strong>
              </td>
              <td>
                {editing ? (
                  <select
                    name="skinType"
                    value={formData.skinType}
                    onChange={handleChange}
                  >
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
              <td>
                <strong>Skin Concerns:</strong>
              </td>
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
              <td>
                <strong>Allergies:</strong>
              </td>
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
              <td>
                <strong>AM Routine:</strong>
              </td>
              <td>
                {editing ? (
                  <TimeSelector
                    prefix="am"
                    value={formData.skincareRoutine.am}
                    onChange={handleChange}
                    disabled={!editing}
                  />
                ) : (
                  userData?.skincareRoutine?.am || "Not specified"
                )}
              </td>
            </tr>
            <tr>
              <td>
                <strong>PM Routine:</strong>
              </td>
              <td>
                {editing ? (
                  <TimeSelector
                    prefix="pm"
                    value={formData.skincareRoutine.pm}
                    onChange={handleChange}
                    disabled={!editing}
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
      <div className="button-container">
        <button
          className="profile-edit-button"
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>
      <div className="button-container">
        {editing && (
          <button className="profile-save-button" onClick={handleSave}>
            Save
          </button>
        )}
      </div>
    </div>
  );
};

export default Profile;
