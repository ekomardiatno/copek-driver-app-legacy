/* eslint-disable react-native/no-inline-styles */
import React, { Component } from 'react';
import {
  View,
  Text,
  Image,
  TouchableNativeFeedback,
  Alert,
  Vibration,
  AppState,
  BackHandler,
  StatusBar,
  ToastAndroid,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import Color from '../../tools/Color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXPRESS_URL, REST_API_URL } from '../../tools/Define';
import KeepAwake from 'react-native-keep-awake';
import PushNotification from 'react-native-push-notification';
import cancellablePromise from '../../tools/cancellablePromise';
import Geolocation from '@react-native-community/geolocation';
import SoundPlayer from 'react-native-sound-player';
import { SocketContext } from '../../components/SocketProvider';
import { withSafeAreaInsets } from 'react-native-safe-area-context';

class Home extends Component {
  static contextType = SocketContext; // 👈 attach context
  timerConnecting;
  watchId;
  appState;
  backHandler;
  sound = () => {
    SoundPlayer.playSoundFile('iphone_send_sms', 'mp3');
    return SoundPlayer.getInfo();
  };
  orderSound = () => {
    SoundPlayer.playSoundFile('samsung_s1', 'mp3');
    return SoundPlayer.getInfo();
  };

  constructor(props) {
    super(props);
    this.state = {
      status: false,
      nextAppState: AppState.currentState,
      tracking: {
        latitude: 0,
        longitude: 0,
      },
      receiverId: null,
      driver: null,
      ready: false,
      changingStatus: false,
      timeActive: 0,
      statusSocketConnection: 'disconnected',
      isKeepAwake: false,
    };
  }

  pendingPromises = [];

  appendPendingPromise = promise => {
    this.pendingPromises = [...this.pendingPromises, promise];
  };

  removePendingPromise = promise => {
    this.pendingPromises = this.pendingPromises.filter(p => p !== promise);
  };

  didBlurSubscription = null;
  didFocusSubscription = null;

  _handleReceiveOrder = data => {
    this.setState({
      status: false,
      isKeepAwake: false,
    });
    this._changeStatusOnMongo(false);
    this._toBooking(data);
  };

  _handleReceiveOrderCancelled = statusCancel => {
    if (this.state.nextAppState === 'active') {
      Alert.alert(
        'Dibatalkan',
        statusCancel === 'by_user'
          ? 'Pemesan membatalkan pesanannya'
          : 'Anda melewatkan pesanan',
      );
    } else {
      PushNotification.cancelAllLocalNotifications();
      PushNotification.localNotification({
        title: 'Dibatalkan',
        message:
          statusCancel === 'by_user'
            ? 'Pemesan membatalkan pesanannya'
            : 'Anda melewatkan pesanan',
        importance: 'high',
        priority: 'high',
      });
    }
  };

  componentDidMount() {
    StatusBar.setBackgroundColor(Color.grayLighter, true);
    StatusBar.setBarStyle('dark-content', true);
    StatusBar.setTranslucent(false);

    if (!this.backHandler) {
      this.backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        this._handleBackPress,
      );
    }

    const { socket } = this.context;
    if (!socket.connected) {
      this._changeStatusOnMongo(false);
      this.setState(
        {
          status: false,
          statusSocketConnection: 'disconnected',
        },
        () => {
          AsyncStorage.setItem('status', JSON.stringify(this.state.status));
        },
      );
    } else {
      this._checkStatus();
      this.setState({
        statusSocketConnection: 'connected',
        receiverId: socket.id,
      });
    }

    AsyncStorage.getItem('user_logged_in', (_err, user) => {
      if (user !== null) {
        user = JSON.parse(user);
        this.setState(
          {
            driver: user,
            ready: true,
          },
          () => {
            this._fetchGetDriver();
            this._startGeolocationService();
            socket?.on(
              user.driverId + '_receive_order',
              this._handleReceiveOrder,
            );
            socket?.on(
              user.driverId + '_receive_order_cancellation',
              this._handleReceiveOrderCancelled,
            );
          },
        );
      }
    });

    this.appState = AppState.addEventListener(
      'change',
      this._handleAppStateChange,
    );
    this.didFocusSubscription = this.props.navigation.addListener(
      'focus',
      this._onFocus,
    );
    this.didBlurSubscription = this.props.navigation.addListener(
      'blur',
      this._onBlur,
    );
  }

  _fetchGetDriver = () => {
    const wrappedPromise = cancellablePromise(this._promiseGetDriver());
    this.appendPendingPromise(wrappedPromise);
    wrappedPromise.promise
      .then(driver => {
        if (driver !== null) {
          driver = {
            driverId: driver.driverId,
            driverName: driver.driverName,
            driverVRP: driver.driverVRP,
            driverPhone: driver.driverPhone,
            driverEmail: driver.driverEmail,
            driverPicture: driver.driverPicture,
          };
          AsyncStorage.setItem(
            'user_logged_in',
            JSON.stringify(driver),
            error => {
              if (!error) {
                this.setState({
                  driver: driver,
                });
              }
            },
          );
        } else {
          AsyncStorage.removeItem('user_logged_in', error => {
            if (!error) {
              this.props.navigation.replace('Login');
              AsyncStorage.removeItem('orders');
            }
          });
        }
      })
      .then(() => {
        this.removePendingPromise(wrappedPromise);
      })
      .catch(_err => {
        Alert.alert(
          'Koneksi gagal',
          'Terjadi kesalahan pada sistem, pastikan Anda telah menggunakan aplikasi terbaru dan coba lagi nanti',
          [
            {
              text: 'Coba lagi',
              onPress: this._fetchGetDriver,
            },
          ],
        );
      });
  };

  _sendLocation = (driverId, location) => {
    return new Promise((resolve, reject) => {
      fetch(`${EXPRESS_URL}drivers/${driverId}/location`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [location.longitude, location.latitude],
        }),
      })
        .then(res => res.json())
        .then(resolve)
        .catch(reject);
    });
  };

  _promiseGetDriver = () => {
    const { driver } = this.state;
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('token').then(v => {
        fetch(`${REST_API_URL}driver/${driver.driverPhone}`, {
          headers: {
            Authorization: `Bearer ${v}`,
          },
        })
          .then(res => res.json())
          .then(resolve)
          .catch(reject);
      });
    });
  };

  componentWillUnmount() {
    if (this.backHandler) {
      this.backHandler.remove();
    }
    if (this.appState) this.appState.remove();
    if (this.didBlurSubscription) {
      this.didBlurSubscription();
    }
    if (this.didFocusSubscription) {
      this.didFocusSubscription();
    }
    this._stopGeolocationService();

    const { socket } = this.context;
    const { driver } = this.state;
    socket?.off(driver.driverId + '_receive_order', this._handleReceiveOrder);
    socket?.off(
      driver.driverId + '_receive_order_cancellation',
      this._handleReceiveOrderCancelled,
    );

    this.pendingPromises.map(p => {
      this.removePendingPromise(p);
    });
  }

  _onFocus = () => {
    this.backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      this._handleBackPress,
    );
  };

  _onBlur = () => {
    if (this.backHandler) {
      this.backHandler.remove();
    }
  };

  _stopSoundVibrate = () => {
    Vibration.cancel();
    SoundPlayer.stop();
  };

  _checkStatus = () => {
    const { socket } = this.context;
    if (!this.state.changingStatus) {
      const wrappedPromise = cancellablePromise(this._promiseCheckStatus());
      this.appendPendingPromise(wrappedPromise);
      wrappedPromise.promise
        .then(res => {
          if (socket.id) {
            this.setState(
              {
                status: res[0].status === 'off' ? false : true,
                changingStatus: false,
              },
              () => {
                AsyncStorage.setItem(
                  'status',
                  JSON.stringify(this.state.status),
                );
              },
            );
          }
        })
        .then(() => this.removePendingPromise(wrappedPromise))
        .catch(() => {
          this.setState({
            status: false,
            changingStatus: false,
          });
        });
    }
  };

  _promiseCheckStatus = () => {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('user_logged_in').then(v => {
        const driver = v ? JSON.parse(v) : null;
        if (driver) {
          fetch(`${EXPRESS_URL}drivers/${driver.driverId}`)
            .then(res => res.json())
            .then(resolve)
            .catch(reject);
        } else {
          reject('Driver not found');
        }
      });
    });
  };

  _changeStatus = () => {
    this.setState(
      {
        changingStatus: true,
      },
      () => {
        let newStatus = this.state.status ? false : true;

        if (newStatus === true) {
          this._checkAndChangingOrderStatus(newStatus);
        } else {
          this._changeStatusOnMongo(false);
          this.setState(
            {
              status: newStatus,
              isKeepAwake: false,
            },
            () => {
              this.setState({
                changingStatus: false,
              });
              AsyncStorage.setItem('status', JSON.stringify(newStatus));
            },
          );
        }
      },
    );
  };

  _checkAndChangingOrderStatus = status => {
    const wrappedPromise = cancellablePromise(this._promiseCheckOrderStatus());
    this.appendPendingPromise(wrappedPromise);
    wrappedPromise.promise
      .then(res => {
        if (res.length > 0) {
          for (let i = 0; i < res.length; i++) {
            AsyncStorage.getItem('orders', (_err, order) => {
              if (order !== null) {
                order = JSON.parse(order);
                let index = order
                  .map(item => {
                    return item.orderId;
                  })
                  .indexOf(res[i].orderId.toString());
                if (res[i].status !== null) {
                  order[index].status = res[i].status;
                } else {
                  order.splice(index, 1);
                }
                AsyncStorage.setItem(
                  'orders',
                  JSON.stringify(order),
                  _error => {
                    if (i + 1 >= res.length) {
                      this._checkingBeforeChangingStatus(status);
                    }
                  },
                );
              }
            });
          }
        } else {
          this._checkingBeforeChangingStatus(status);
        }
      })
      .then(() => this.removePendingPromise(wrappedPromise))
      .catch(_err => {
        this.setState({
          changingStatus: false,
        });
        Alert.alert(
          'Gagal membuat pesanan',
          'Terjadi kesalahan pada sistem, pastikan Anda telah menggunakan aplikasi terbaru dan coba lagi nanti',
        );
      });
  };

  _changeStatusOnMongo = status => {
    const wrappedPromise2 = cancellablePromise(
      this._promiseStatusMongoDb(status),
    );
    this.appendPendingPromise(wrappedPromise2);
    wrappedPromise2.promise
      .then(() => {
        this.removePendingPromise(wrappedPromise2);
      })
      .catch(e => {
        this.setState({
          changingStatus: false,
          status: !status,
        });
        Alert.alert(
          'Koneksi gagal',
          'Terjadi kesalahan pada sistem, pastikan Anda telah menggunakan aplikasi terbaru dan coba lagi nanti',
        );
      });
  };

  _checkingBeforeChangingStatus = status => {
    AsyncStorage.getItem(
      'orders',
      function (_err, orders) {
        const outstandingOrders = !orders
          ? []
          : JSON.parse(orders).filter(item => {
              return ![
                'completed',
                'cancelled_by_user',
                'cancelled_by_driver',
              ].includes(item.status);
            });
        if (outstandingOrders.length > 0) {
          this.setState(
            {
              changingStatus: false,
            },
            () => {
              ToastAndroid.show(
                'Anda memiliki pesanan yang belum selesai',
                ToastAndroid.SHORT,
              );
            },
          );
        } else {
          const wrappedPromise = cancellablePromise(this._fetchSaldo());
          this.appendPendingPromise(wrappedPromise);
          wrappedPromise.promise
            .then(res => {
              if (Number(res.driverSaldo) >= 10000) {
                this.sound();
                Vibration.vibrate(50);
                this._changeStatusOnMongo(status);
                this.setState(
                  {
                    status: status,
                  },
                  () => {
                    this.setState({
                      changingStatus: false,
                    });
                    AsyncStorage.setItem('status', JSON.stringify(status));
                  },
                );
              } else {
                this.setState({
                  changingStatus: false,
                });
                Alert.alert(
                  'Saldo tidak cukup',
                  'Silakan top-up saldo untuk dapat menerima pesanan',
                );
              }
            })
            .then(() => {
              this.removePendingPromise(wrappedPromise);
            })
            .catch(_err => {
              this.setState({
                changingStatus: false,
              });
              Alert.alert(
                'Gagal mengubah status',
                'Terjadi kesalahan pada sistem, pastikan Anda telah menggunakan aplikasi terbaru dan coba lagi nanti',
              );
            });
        }
      }.bind(this),
    );
  };

  _promiseCheckOrderStatus = () => {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('orders', (error, result) => {
        if (!error && result !== null) {
          result = JSON.parse(result);
          let filtered = result.filter(a => {
            return (
              a.status !== 'completed' &&
              a.status !== 'cancelled_by_user' &&
              a.status !== 'cancelled_by_driver'
            );
          });
          if (filtered.length > 0) {
            filtered = filtered.map(a => {
              return a.orderId;
            });
            AsyncStorage.getItem('token').then(v => {
              fetch(`${REST_API_URL}order/checking`, {
                method: 'post',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${v}`,
                },
                body: JSON.stringify(filtered),
              })
                .then(res => res.json())
                .then(resolve)
                .catch(reject);
            });
          } else {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });
    });
  };

  _promiseStatusMongoDb = status => {
    status = status ? 'on' : 'off';
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('user_logged_in').then(v => {
        const driver = v ? JSON.parse(v) : null;
        if (driver) {
          fetch(`${EXPRESS_URL}drivers/${driver.driverId}`, {
            method: 'PATCH',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: status,
              driverName: driver.driverName,
              driverVRP: driver.driverVRP,
              driverPhone: driver.driverPhone,
              driverEmail: driver.driverEmail,
              driverPicture: driver.driverPicture,
            }),
          })
            .then(res => res.json())
            .then(resolve)
            .catch(reject);
        } else {
          reject('Driver not found');
        }
      });
    });
  };

  _fetchSaldo = () => {
    const { driver } = this.state;
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('token').then(v => {
        fetch(`${REST_API_URL}driver/${driver.driverPhone}/driverSaldo`, {
          headers: {
            Authorization: `Bearer ${v}`,
          },
        })
          .then(res => res.json())
          .then(resolve)
          .catch(reject);
      });
    });
  };

  _startGeolocationService = () => {
    this.watchId = Geolocation.getCurrentPosition(position => {
      const coords = position.coords;
      const { latitude, longitude } = this.state.tracking;
      if (latitude !== coords.latitude && longitude !== coords.longitude) {
        this.setState({
          tracking: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        });
        if (!this.state.driver) return;
        const wrappedPromise = cancellablePromise(
          this._sendLocation(this.state.driver.driverId, coords),
        );
        this.appendPendingPromise(wrappedPromise);
        wrappedPromise.promise
          .then(() => this.removePendingPromise(wrappedPromise))
      }
    });
  };

  _stopGeolocationService = () => {
    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
    }
  };

  _handleAppStateChange = nextAppState => {
    this.setState({ nextAppState });
  };

  _handleBackPress = () => {
    if (this.state.status) {
      Alert.alert(
        'Status masih aktif',
        'Keluar dari aplikasi akan menonaktifkan status',
        [{ text: 'Batal' }, { text: 'OK', onPress: this._keluar }],
        {
          cancelable: true,
        },
      );
      return true;
    }
  };

  _keluar = async () => {
    const { driver } = this.state;
    await fetch(`${EXPRESS_URL}drivers/${driver.driverId}/status`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'off',
      }),
    });
    this.setState({
      status: false,
    });
    AsyncStorage.setItem('status', JSON.stringify(false));
    BackHandler.exitApp();
  };

  _toBooking = data => {
    this._changeStatusOnMongo(false);
    this.orderSound();
    Vibration.vibrate([1000, 1500, 2000], true);
    if (this.backHandler) {
      this.backHandler.remove();
    }
    AsyncStorage.getItem('orders', (_err, res) => {
      if (res !== null) {
        res = JSON.parse(res);
        res.push(data);
        AsyncStorage.setItem('orders', JSON.stringify(res));
      } else {
        AsyncStorage.setItem('orders', JSON.stringify([data]));
      }
    });
    this.props.navigation.navigate('Booking', {
      data: data,
      stopSoundVibrate: this._stopSoundVibrate,
      action: () => {
        StatusBar.setBackgroundColor(Color.grayLighter, true);
        StatusBar.setBarStyle('dark-content', true);
      },
      driver: this.state.driver,
    });
  };

  _keepAwake = () => {
    this.setState({
      isKeepAwake: this.state.isKeepAwake ? false : true,
    });
  };

  render() {
    return (
      <View style={{ flex: 1, paddingTop: this.props.insets.top }}>
        {this.state.isKeepAwake && <KeepAwake />}
        <View style={{ flex: 1 }}>
          <ScrollView>
            <View
              style={{
                padding: 15,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 15,
              }}
            >
              <Image
                style={{ width: 150, height: 150 }}
                source={require('../../images/copek.png')}
              />
            </View>
            <View style={{ paddingHorizontal: 15 }}>
              <View
                style={{
                  padding: 15,
                  borderRadius: 20,
                  backgroundColor: Color.grayLighter,
                  marginBottom: 15,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 8,
                  }}
                >
                  Perhatian!
                </Text>
                <Text
                  style={{
                    textAlign: 'center',
                    marginBottom: 10,
                    color: Color.textMuted,
                  }}
                >
                  Pastikan saat menerima pesanan, tanyakan ke pemesan apakah
                  pesanan sudah benar dan tidak ada kesalahan
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingVertical: 10,
            borderTopColor: Color.borderColor,
            backgroundColor: Color.white,
            borderTopWidth: 1,
            marginHorizontal: 20,
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <Text style={{ fontSize: 17 }}>Status: </Text>
              {this.state.ready ? (
                <Text
                  style={{
                    fontWeight: 'bold',
                    color: this.state.status ? Color.green : Color.red,
                    fontSize: 17,
                  }}
                >
                  {this.state.status ? 'Aktif' : 'Tidak aktif'}
                </Text>
              ) : (
                <View style={{ flexDirection: 'row' }}>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      color: this.state.status ? Color.green : Color.red,
                      fontSize: 17,
                    }}
                  >
                    Pending
                  </Text>
                  <ActivityIndicator
                    size="small"
                    style={{ marginLeft: 10 }}
                    color={Color.red}
                  />
                </View>
              )}
              {this.state.changingStatus && (
                <ActivityIndicator
                  size="small"
                  style={{ marginLeft: 10 }}
                  color={Color.primary}
                />
              )}
            </View>
            <Text
              style={{ color: Color.textMuted, fontSize: 13, lineHeight: 15 }}
            >
              Aktifkan supaya dapat menerima pesanan
            </Text>
          </View>
          <View
            style={{
              borderLeftWidth: 1,
              borderLeftColor: Color.borderColor,
              paddingLeft: 10,
            }}
          >
            {this.state.changingStatus ? (
              <View
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: this.state.status ? Color.green : Color.gray,
                  overflow: 'hidden',
                  elevation: 3,
                  opacity: 0.5,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: Color.white,
                    position: 'absolute',
                    top: '50%',
                    marginTop: -10,
                    left: this.state.status ? 26 : 4,
                    elevation: 5,
                  }}
                />
              </View>
            ) : (
              <TouchableNativeFeedback
                onPress={() => {
                  if (
                    this.state.ready &&
                    this.state.statusSocketConnection === 'connected'
                  ) {
                    this._changeStatus();
                  }
                }}
                useForeground={true}
                background={TouchableNativeFeedback.Ripple(
                  'rgba(0,0,0,.15)',
                  false,
                )}
              >
                <View
                  style={{
                    width: 50,
                    height: 28,
                    borderRadius: 14,
                    opacity: !(
                      this.state.ready &&
                      this.state.statusSocketConnection === 'connected'
                    )
                      ? 0.6
                      : 1,
                    backgroundColor: this.state.status
                      ? Color.green
                      : Color.gray,
                    overflow: 'hidden',
                    elevation: 3,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: Color.white,
                      position: 'absolute',
                      top: '50%',
                      marginTop: -10,
                      left: this.state.status ? 26 : 4,
                      elevation: 5,
                    }}
                  />
                </View>
              </TouchableNativeFeedback>
            )}
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingVertical: 10,
            borderTopColor: Color.borderColor,
            backgroundColor: Color.white,
            borderTopWidth: 1,
            marginHorizontal: 20,
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              style={{
                marginBottom: 5,
                fontSize: 17,
                opacity: this.state.status ? 1 : 0.45,
              }}
            >
              Tetap menyala
            </Text>
            <Text
              style={{
                color: Color.textMuted,
                fontSize: 13,
                lineHeight: 15,
                opacity: this.state.status ? 1 : 0.45,
              }}
            >
              Layar ponsel akan terus menyala di aplikasi untuk menghindari
              kehilangan koneksi saat layar mati. (Lebih boros baterai)
            </Text>
          </View>
          <View
            style={{
              borderLeftWidth: 1,
              borderLeftColor: Color.borderColor,
              paddingLeft: 10,
            }}
          >
            {this.state.status ? (
              <TouchableNativeFeedback
                onPress={this._keepAwake}
                useForeground={true}
                background={TouchableNativeFeedback.Ripple(
                  'rgba(0,0,0,.15)',
                  false,
                )}
              >
                <View
                  style={{
                    width: 50,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: this.state.isKeepAwake
                      ? Color.green
                      : Color.gray,
                    overflow: 'hidden',
                    elevation: 3,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: Color.white,
                      position: 'absolute',
                      top: '50%',
                      marginTop: -10,
                      left: this.state.isKeepAwake ? 26 : 4,
                      elevation: 5,
                    }}
                  />
                </View>
              </TouchableNativeFeedback>
            ) : (
              <View
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: this.state.isKeepAwake
                    ? Color.green
                    : Color.gray,
                  overflow: 'hidden',
                  elevation: 3,
                  opacity: 0.5,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: Color.white,
                    position: 'absolute',
                    top: '50%',
                    marginTop: -10,
                    left: this.state.isKeepAwake ? 26 : 4,
                    elevation: 5,
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }
}

export default withSafeAreaInsets(Home);
