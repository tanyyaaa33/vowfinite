export function formatAuthError(error) {
  const code = error?.code || '';
  const message = error?.message || 'Something went wrong. Please try again.';

  switch (code) {
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not set up for this project yet. Open console.firebase.google.com → your project → Build → Authentication → click Get started → Sign-in method → enable Email/Password → Save.';
    case 'auth/operation-not-allowed':
      return 'Email sign-up is not enabled yet. In Firebase Console go to Authentication → Sign-in method → enable Email/Password.';
    case 'auth/email-already-in-use':
      return 'This email already has an account. Try Sign In instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/user-not-found':
      return 'No account found with this email. Try Sign Up instead.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.';
    case 'permission-denied':
      return 'Firestore is not set up. In Firebase Console create a Firestore database (test mode is fine).';
    default:
      if (message.includes('permission') || message.includes('PERMISSION_DENIED')) {
        return 'Firestore access denied. Create a Firestore database in Firebase Console and use test mode for development.';
      }
      return message;
  }
}
