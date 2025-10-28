export type MockUser = {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
};

export const mockLogin = async (email: string, password: string): Promise<MockUser> => {
  await new Promise((r) => setTimeout(r, 400));
  if (email === 'test@sanchari.app' && password === '123456') {
    return { uid: 'user123', name: 'Traveler One', email, photoURL: undefined };
  }
  throw new Error('Invalid credentials');
};

export const mockSignup = async (email: string, _password: string): Promise<MockUser> => {
  await new Promise((r) => setTimeout(r, 400));
  return { uid: 'user_new', name: 'New Traveler', email, photoURL: undefined };
};
