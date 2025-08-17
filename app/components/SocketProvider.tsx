/* eslint-disable react-native/no-inline-styles */
import {
  createContext,
  JSX,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { APP_HOST, EXPRESS_URL } from '../tools/Define';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TouchableOpacity, View } from 'react-native';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import Color from '../tools/Color';
import { NavigationState } from '@react-navigation/native';
import { DriverType } from '../types/driverType';
import Spinner from 'react-native-spinkit';

export const SocketContext = createContext<{
  socket: Socket | null;
  receiverId: string | null;
  isConnected: boolean;
}>({
  socket: null,
  receiverId: null,
  isConnected: false,
});

export default function SocketProvider({
  children,
}: {
  children: (
    callback: (state?: Readonly<NavigationState>) => void,
  ) => JSX.Element | React.ReactNode;
}): JSX.Element {
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<TypeError | Error | null>(
    null,
  );
  const [isSentToMongo, setIsSentToMongo] = useState(false);
  const [navigationState, setNavigationState] =
    useState<Readonly<NavigationState> | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const timeoutConnecting = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isConnecting) {
      timeoutConnecting.current = setTimeout(() => {
        setIsConnecting(false);
      }, 10000);
    }
  }, [isConnecting]);

  const updateSocketToMongo = useCallback(
    async (user: DriverType) => {
      if (!receiverId) return;
      try {
        const result = await fetch(
          `${EXPRESS_URL}drivers/${user.driverId}/socket`,
          {
            method: 'PATCH',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              socketId: receiverId,
            }),
          },
        );
        if (!result.ok) {
          throw new Error('Failed to update socket id to mongo');
        }
        setIsSentToMongo(true);
      } catch (e) {
        setRequestError(
          e instanceof Error || e instanceof TypeError
            ? e
            : new Error('Failed to update socket id to mongo'),
        );
      }
    },
    [receiverId],
  );

  useEffect(() => {
    if (!isSentToMongo) {
      if (navigationState) {
        AsyncStorage.getItem('user_logged_in').then(item => {
          if (item) {
            const itemToJson = JSON.parse(item);
            updateSocketToMongo(itemToJson);
          }
        });
      }
    }
  }, [isSentToMongo, navigationState, updateSocketToMongo]);

  const socket = useMemo(
    () =>
      io(`${APP_HOST}`, {
        path: '/copek-node/socket.io',
        transports: ['websocket', 'polling'],
      }),
    [],
  );

  useEffect(() => {
    socket.on('connect', () => {
      setReceiverId(socket.id || null);
      setIsConnected(true);
      setIsConnecting(false);
      if (timeoutConnecting.current) clearTimeout(timeoutConnecting.current);
    });
    socket.on('disconnect', () => {
      setReceiverId(null);
      setIsConnected(false);
      setIsSentToMongo(false);
      setIsConnecting(true);
    });
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const handleNavigationStateChange = (state?: Readonly<NavigationState>) => {
    setNavigationState(state || null);
  };

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <SocketContext.Provider value={{ socket, receiverId, isConnected }}>
        {isConnected ? (
          children(handleNavigationStateChange)
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: Color.white,
            }}
          >
            {isConnecting ? (
              <Spinner size={50} type="Circle" />
            ) : (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome5
                  iconStyle="solid"
                  name="exclamation-triangle"
                  color={Color.red}
                  size={40}
                />
                <Text style={{ fontSize: 16, fontWeight: '300', marginTop: 8 }}>
                  Server tidak tersedia
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsConnecting(true);
                    socket.connect();
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: Color.red,
                      marginTop: 8,
                    }}
                  >
                    Coba lagi
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        {requestError && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: Color.white,
              }}
            />
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome5
                iconStyle="solid"
                name="exclamation-triangle"
                color={Color.red}
                size={40}
              />
              <Text style={{ fontSize: 16, fontWeight: '300', marginTop: 8 }}>
                Server tidak tersedia
              </Text>
              <TouchableOpacity
                onPress={() => {
                  AsyncStorage.getItem('user_logged_in').then(item => {
                    if (item) {
                      const itemToJson = JSON.parse(item);
                      updateSocketToMongo(itemToJson);
                    }
                  });
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: Color.red,
                    marginTop: 8,
                  }}
                >
                  Coba lagi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SocketContext.Provider>
    </View>
  );
}

export const useSocket = () => useContext(SocketContext);
