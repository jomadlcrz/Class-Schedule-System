import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h2>Welcome to Class Schedule</h2>
      <button onClick={() => signIn('google')}>Sign in with Google</button>
    </div>
  );
}
