/* eslint-disable react/no-unstable-nested-components */

import HomeScreen from './main/Home';
import AccountScreen from './main/Account';
import OrderScreen from './main/Order';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { JSX } from 'react';
import CustomTabBar from '../components/CustomTabBar';
const Tab = createBottomTabNavigator();

export default function Home(): JSX.Element {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Order" component={OrderScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
