import { sendEmail, showNotification, resetNotifications, scheduleNotifications } from '../../components/Notification';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

jest.mock('firebase/firestore');
jest.mock('../../firebase-config', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  },
  db: {}
}));

global.fetch = jest.fn();
global.Notification = jest.fn().mockImplementation(() => ({
  permission: 'granted',
  body: 'Test notification',
}));

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = jest.fn();
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('May 15, 2024 08:00:00'));
    const mockDocSnap = {
      exists: jest.fn().mockReturnValue(true),
      data: jest.fn().mockReturnValue({
        email: 'testuser@example.com',
        skincareRoutine: { am: '8:00', pm: '10:00' },
        routineCheckIn: { amCompleted: false, pmCompleted: false },
        amNotification: false,
        pmNotification: false,
      }),
    };
    getDoc.mockResolvedValue(mockDocSnap);
    doc.mockReturnValue('userDocRef');
    updateDoc.mockResolvedValue();
    global.Notification = jest.fn(); 
    Object.defineProperty(global.Notification, 'permission', {
        value: 'granted', 
    writable: true
  });

  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();

  });

  describe('sendEmail', () => {
    test('should send an email successfully', async () => {
      fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ status: 'success' }) });
      await sendEmail();
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/send-email', expect.objectContaining({ method: 'POST' }));
    });
    test('should send an email successfully', async () => {
        const mockUserData = { email: 'user@example.com' };
        getDoc.mockResolvedValue({
          exists: () => true,
          data: () => mockUserData,
        });
    
        fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: 'success', message: 'Email sent successfully' }),
        });
    
        await sendEmail();
    
        expect(fetch).toHaveBeenCalledWith('http://localhost:3001/send-email', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Porespective - Skincare Routine Reminder!',
            email: 'user@example.com',
            message: 'Reminder to do your skincare routine today!',
          }),
        }));
    
        expect(console.log).toHaveBeenCalledWith({
          status: 'success',
          message: 'Email sent successfully',
        });
      });
    
      test('should handle fetch errors gracefully', async () => {
        const mockUserData = { email: 'user@example.com' };
        getDoc.mockResolvedValue({
          exists: () => true,
          data: () => mockUserData,
        });
    
        fetch.mockRejectedValue(new Error('Failed to send email'));
    
        await sendEmail();
        expect(console.error).toHaveBeenCalledWith('Failed to send email');
      });
    
      test('should handle missing email data gracefully', async () => {
        getDoc.mockResolvedValue({
          exists: () => true,
          data: () => null, 
        });
    
        await sendEmail();
        expect(fetch).not.toHaveBeenCalled();
      });
  });

  describe('showNotification', () => {
    test('should display a notification if permission is granted', () => {
      showNotification('Test Notification');
      expect(Notification).toHaveBeenCalledWith('Skincare Reminder', { body: 'Test Notification' });
    });
  });

  describe('scheduleNotifications', () => {
    test('should send AM notification and email at the correct time', async () => {

        fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ status: 'success' }) });
        const result = await scheduleNotifications();
                expect(Notification).toHaveBeenCalled();
                

        expect(updateDoc).toHaveBeenCalledWith('userDocRef', { amNotification: true });
        expect(fetch).toHaveBeenCalled();
        expect(Notification).toHaveBeenCalled();
    });

    test('should send PM notification and email at the correct time', async () => {
        jest.setSystemTime(new Date('May 15, 2024 22:00:00'));
        await scheduleNotifications();
        expect(updateDoc).toHaveBeenCalledWith('userDocRef', { pmNotification: true });
        expect(fetch).toHaveBeenCalled();
        expect(Notification).toHaveBeenCalled();
    });

    test('should not send notifications if routines are already completed', async () => {
      getDoc.mockResolvedValueOnce({
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue({
          skincareRoutine: { am: '08:00', pm: '10:00' },
          routineCheckIn: { amCompleted: true, pmCompleted: true },
          amNotification: true,
          pmNotification: true,
        })
      });
      await scheduleNotifications();
      expect(updateDoc).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(Notification).not.toHaveBeenCalled();
    });
  });
});