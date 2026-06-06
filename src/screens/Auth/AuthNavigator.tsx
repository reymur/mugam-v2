// src/screens/Auth/AuthNavigator.tsx
import React, { useState } from 'react';
import LoginScreen    from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import ForgotScreen   from './ForgotScreen';

type Screen = 'login' | 'register' | 'forgot';

export default function AuthNavigator() {
  const [screen, setScreen] = useState<Screen>('login');

  if (screen === 'register') {
    return <RegisterScreen onGoLogin={() => setScreen('login')} />;
  }
  if (screen === 'forgot') {
    return <ForgotScreen onBack={() => setScreen('login')} />;
  }
  return (
    <LoginScreen
      onGoRegister={() => setScreen('register')}
      onForgot={() => setScreen('forgot')}
    />
  );
}
