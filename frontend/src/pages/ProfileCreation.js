import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../firebase-config"
import { doc, updateDoc } from "firebase/firestore"
import "./ProfileCreation.css"

function ProfileCreation() {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(true)
  const [errors, setErrors] = useState({})
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
  })

  // Generate time options
  const hours = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0"),
  )
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0"),
  )

  const handleChange = e => {
    const { name, value } = e.target
    if (name.startsWith("am") || name.startsWith("pm")) {
      const [routine, timeComponent] = name.split("_")
      setFormData(prev => ({
        ...prev,
        skincareRoutine: {
          ...prev.skincareRoutine,
          [routine]: {
            ...prev.skincareRoutine[routine],
            [timeComponent]: value,
            period: routine.toUpperCase(), // Ensure period stays fixed
          },
        },
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required"
    if (!formData.gender) newErrors.gender = "Please select a gender"
    if (!formData.skinType) newErrors.skinType = "Please select a skin type"
    if (!formData.skinConcerns.trim())
      newErrors.skinConcerns = "Skin concerns are required"
    if (!formData.allergies.trim())
      newErrors.allergies = "Please specify allergies or write 'None'"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    try {
      const user = auth.currentUser
      if (user) {
        const userRef = doc(db, "users", user.uid)
        // Format times before saving
        const formattedData = {
          ...formData,
          skincareRoutine: {
            am: `${formData.skincareRoutine.am.hour}:${formData.skincareRoutine.am.minute}`,
            pm: `${formData.skincareRoutine.pm.hour}:${formData.skincareRoutine.pm.minute}`,
          },
        }
        await updateDoc(userRef, formattedData)
        setEditing(false)
        navigate("/profile")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
    }
  }

  const TimeSelector = ({ prefix, value, onChange, disabled }) => (
    <div className="time-selector">
      <select
        name={`${prefix}_hour`}
        value={value.hour}
        onChange={onChange}
        disabled={disabled}
      >
        {hours.map(hour => (
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
        {minutes.map(minute => (
          <option key={minute} value={minute}>
            {minute}
          </option>
        ))}
      </select>
      <span>{prefix.toUpperCase()}</span>
    </div>
  )

  return (
    <div className="profileCreationPage">
      <h1>Create Your Profile</h1>
      <form className="profile-form" onSubmit={e => e.preventDefault()}>
        <div className="form-columns">
          <div className="form-column">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                disabled={!editing}
                required
              />
              {errors.fullName && (
                <span className="error-message">{errors.fullName}</span>
              )}
            </div>

            <div className="form-group">
              <label>Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={!editing}
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
              {errors.gender && (
                <span className="error-message">{errors.gender}</span>
              )}
            </div>

            <div className="form-group">
              <label>Skin Type</label>
              <select
                name="skinType"
                value={formData.skinType}
                onChange={handleChange}
                disabled={!editing}
                required
              >
                <option value="">Select Skin Type</option>
                <option value="oily">Oily</option>
                <option value="dry">Dry</option>
                <option value="combination">Combination</option>
                <option value="normal">Normal</option>
                <option value="sensitive">Sensitive</option>
              </select>
              {errors.skinType && (
                <span className="error-message">{errors.skinType}</span>
              )}
            </div>

            <div className="form-group">
              <label>Skin Concerns</label>
              <textarea
                name="skinConcerns"
                value={formData.skinConcerns}
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter your skin concerns..."
              />
              {errors.skinConcerns && (
                <span className="error-message">{errors.skinConcerns}</span>
              )}
            </div>
          </div>

          <div className="form-column">
            <div className="form-group">
              <label>Allergies and Sensitivities</label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter any allergies or sensitivities..."
              />
              {errors.allergies && (
                <span className="error-message">{errors.allergies}</span>
              )}
            </div>

            <div className="form-group">
              <label>Morning Skincare Routine Time</label>
              <TimeSelector
                prefix="am"
                value={formData.skincareRoutine.am}
                onChange={handleChange}
                disabled={!editing}
              />
            </div>

            <div className="form-group">
              <label>Evening Skincare Routine Time</label>
              <TimeSelector
                prefix="pm"
                value={formData.skincareRoutine.pm}
                onChange={handleChange}
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        <div className="button-group">
          {editing ? (
            <button className="save-btn" onClick={handleSave}>
              Save
            </button>
          ) : (
            <button className="edit-btn" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default ProfileCreation
