/* eslint-disable react/no-unstable-nested-components */
import React, { JSX } from 'react';
import LoginScreen from './app/screen/Login';
import HomeScreen from './app/screen/Home';
import BookingScreen from './app/screen/Booking';
import TopupScreen from './app/screen/Topup';
import ForgotScreen from './app/screen/Forgot';
import ChatScreen from './app/screen/Chat';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Color from './app/tools/Color';

const Stack = createNativeStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="Topup" component={TopupScreen} />
      <Stack.Screen name="Forgot" component={ForgotScreen} />
    </Stack.Navigator>
  );
};

export default function App(): JSX.Element {
  return (
    <NavigationContainer
      theme={{
        colors: {
          background: Color.white,
          border: Color.borderColor,
          card: Color.grayLighter,
          notification: Color.secondary,
          primary: Color.primary,
          text: Color.textColor,
        },
        dark: false,
        fonts: {
          bold: {
            fontFamily: 'Archivo_bold',
            fontWeight: '700',
          },
          medium: {
            fontFamily: 'Archivo_bold',
            fontWeight: '600',
          },
          heavy: {
            fontFamily: 'Archivo_bold',
            fontWeight: '800',
          },
          regular: {
            fontFamily: 'Archivo',
            fontWeight: '400',
          },
        },
      }}
    >
      <StackNavigator />
    </NavigationContainer>
  );
}
