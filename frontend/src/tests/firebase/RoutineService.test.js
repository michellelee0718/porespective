import {
  initDailyCheckIn,
  markRoutineCompleted,
} from "../../firebase/routineService"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "../../firebase-config"

jest.mock("firebase/firestore")
jest.mock("../../firebase-config", () => ({
  auth: {
    currentUser: { uid: "test-user-id" },
  },
  db: {},
}))

describe("Routine Service", () => {
  beforeEach(() => {
    // Reset
    jest.clearAllMocks()

    // Mock date
    jest.spyOn(global, "Date").mockImplementation(() => ({
      getFullYear: () => 2024,
      getMonth: () => 4, // May (0-indexed)
      getDate: () => 15,
      toISOString: () => "2024-05-15T12:00:00.000Z",
    }))

    // Setup default mock for getDoc
    const mockDocSnap = {
      exists: jest.fn().mockReturnValue(true),
      data: jest.fn().mockReturnValue({
        fullName: "Test User",
        skincareRoutine: { am: "8:00", pm: "20:00" },
        routineCheckIn: {
          lastResetDate: "2024-05-15",
          amCompleted: false,
          pmCompleted: false,
        },
      }),
    }

    getDoc.mockResolvedValue(mockDocSnap)
    doc.mockReturnValue("userDocRef")
    updateDoc.mockResolvedValue()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("initDailyCheckIn", () => {
    test("should initialize new check-in if none exists", async () => {
      // Expect new check-in to be initialized if none exists
      // Override the default mock for this specific test
      const mockDocSnap = {
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue({
          fullName: "Test User",
          skincareRoutine: { am: "8:00", pm: "20:00" },
        }),
      }

      getDoc.mockResolvedValue(mockDocSnap)
      const result = await initDailyCheckIn()

      // Verify result
      expect(result).toEqual({
        lastResetDate: "2024-05-15",
        amCompleted: false,
        pmCompleted: false,
      })

      expect(doc).toHaveBeenCalledWith(db, "users", "test-user-id")
      expect(getDoc).toHaveBeenCalledWith("userDocRef")
      expect(updateDoc).toHaveBeenCalledWith("userDocRef", {
        routineCheckIn: {
          lastResetDate: "2024-05-15",
          amCompleted: false,
          pmCompleted: false,
        },
      })
    })

    test("should reset check-in for a new day", async () => {
      // Expect check-in to be reset for a new day
      // Override the default mock for this specific test
      const mockDocSnap = {
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue({
          fullName: "Test User",
          skincareRoutine: { am: "8:00", pm: "20:00" },
          routineCheckIn: {
            lastResetDate: "2024-05-14", // Previous day
            amCompleted: true,
            pmCompleted: true,
          },
        }),
      }

      getDoc.mockResolvedValue(mockDocSnap)
      const result = await initDailyCheckIn()

      // Verify result
      expect(result).toEqual({
        lastResetDate: "2024-05-15",
        amCompleted: false,
        pmCompleted: false,
      })

      expect(updateDoc).toHaveBeenCalledWith("userDocRef", {
        routineCheckIn: {
          lastResetDate: "2024-05-15",
          amCompleted: false,
          pmCompleted: false,
        },
      })
    })

    test("should return existing check-in if already initialized for today", async () => {
      // Expect existing check-in to be returned if already initialized for today
      // Override the default mock for this specific test
      const mockDocSnap = {
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue({
          fullName: "Test User",
          skincareRoutine: { am: "8:00", pm: "20:00" },
          routineCheckIn: {
            lastResetDate: "2024-05-15", // Today
            amCompleted: true,
            pmCompleted: false,
          },
        }),
      }

      // Setup mocks
      doc.mockReturnValue("userDocRef")
      getDoc.mockResolvedValue(mockDocSnap)
      const result = await initDailyCheckIn()

      // Verify result
      expect(result).toEqual({
        lastResetDate: "2024-05-15",
        amCompleted: true,
        pmCompleted: false,
      })
      expect(updateDoc).not.toHaveBeenCalled()
    })

    test("should return null if user is not logged in", async () => {
      // Expect null if user is not logged in
      // Modify auth.currentUser to be null
      const originalUser = auth.currentUser
      auth.currentUser = null

      const result = await initDailyCheckIn()

      // Verify result
      expect(result).toBeNull()

      auth.currentUser = originalUser
    })
  })

  describe("markRoutineCompleted", () => {
    test("should mark AM routine as completed", async () => {
      // Expect AM routine to be marked as completed if morning routine is done
      // Setup mocks
      doc.mockReturnValue("userDocRef")
      updateDoc.mockResolvedValue()

      const result = await markRoutineCompleted("am")

      // Verify result
      expect(result).toBe(true)
      expect(updateDoc).toHaveBeenCalledWith("userDocRef", {
        "routineCheckIn.amCompleted": true,
      })
    })

    test("should mark PM routine as completed", async () => {
      // Expect PM routine to be marked as completed if evening routine is done
      // Setup mocks
      doc.mockReturnValue("userDocRef")
      updateDoc.mockResolvedValue()

      const result = await markRoutineCompleted("pm")

      // Verify result
      expect(result).toBe(true)
      expect(updateDoc).toHaveBeenCalledWith("userDocRef", {
        "routineCheckIn.pmCompleted": true,
      })
    })

    test("should throw error for invalid routine type", async () => {
      // Call with invalid type and expect error
      await expect(markRoutineCompleted("invalid")).rejects.toThrow(
        "Invalid routine type. Must be 'am' or 'pm'",
      )
    })
  })
})
