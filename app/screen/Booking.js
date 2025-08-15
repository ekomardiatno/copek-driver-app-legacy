/* eslint-disable react-native/no-inline-styles */
import { Component } from 'react';
import {
  Text,
  View,
  Alert,
  AppState,
  TouchableNativeFeedback,
  ScrollView,
  BackHandler,
  ToastAndroid,
  StatusBar,
  Linking,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import PushNotification from 'react-native-push-notification';
import MapView, {
  PROVIDER_GOOGLE,
  Polyline as Direction,
  Marker,
} from 'react-native-maps';
import Color, { colorYiq } from '../tools/Color';
import Fa from '@react-native-vector-icons/fontawesome5';
import Card from '../components/Card';
import Currency from '../tools/Currency';
import SliderButton from '../components/SliderButton';
import {
  APP_HOST,
  EXPRESS_URL,
  GOOGLE_MAPS_API_KEY,
  LATITUDE_DELTA,
  LONGITUDE_DELTA,
  REST_API_URL,
} from '../tools/Define';
import Polyline from '@mapbox/polyline';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import phoneNumFormat from '../helpers/phoneNumFormat';
import cancellablePromise from '../tools/cancellablePromise';
import Geolocation from '@react-native-community/geolocation';
import SoundPlayer from 'react-native-sound-player';
import { withSafeAreaInsets } from 'react-native-safe-area-context';
const { width, height } = Dimensions.get('window');
const Sound = require('react-native-sound');

class Booking extends Component {
  timer;
  timeoutResponse;
  timerAcceptOrder;
  timerConnect;
  backHandler;
  appState;
  constructor(props) {
    super(props);
    this.state = {
      appState: AppState.currentState,
      region: {
        latitude: -0.5327255,
        // latitude: -0.39601500329,
        longitude: 101.570019,
        // longitude: 102.4153175120702,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      polyline: [],
      driver: null,
      data: null,
      mapWidth: width - 1,
      hasNewChats: false,
      chats: [],
      newChatLength: 0,
      opacityBoxNotif: new Animated.Value(0),
      sliderTrigger: 'ready',
      sliderButton: false,
      isConnected: false,
      responseSent: false,
      loadingAccept: false,
      readyConnect: false,
    };
    this.sound = () => {
      SoundPlayer.playSoundFile('iphone_notification', 'mp3');
      return SoundPlayer.getInfo();
    };

    let data = this.props.route.params?.data;
    if (data) {
      if (
        data.status !== 'completed' &&
        data.status !== 'cancelled_by_driver' &&
        data.status !== 'cancelled_by_user'
      ) {
        let socket = io(`${APP_HOST}`, {
          path: '/copek-node/socket.io',
          transports: ['websocket', 'polling'],
        });
        this.socket = socket;
      } else {
        this.socket = null;
      }
    }
  }

  pendingPromises = [];

  appendPendingPromise = promise => {
    this.pendingPromises = [...this.pendingPromises, promise];
  };

  removePendingPromise = promise => {
    this.pendingPromises = this.pendingPromises.filter(p => p !== promise);
  };

  componentDidMount() {
    this.timerAcceptOrder = setTimeout(
      function () {
        AsyncStorage.getItem('orders', (_err, order) => {
          if (order !== null) {
            order = JSON.parse(order);
            let index = order
              .map(item => {
                return item.orderId;
              })
              .indexOf(this.state.data.orderId.toString());
            order[index].status = 'cancelled_by_driver';
            AsyncStorage.setItem('orders', JSON.stringify(order));
          }
        });
        if (this.props.route.params?.stopSoundVibrate) {
          this.props.route.params?.stopSoundVibrate();
        }
        Alert.alert('Melewatkan pesanan', 'Anda baru saja melewatkan pesanan');
        this.props.navigation.goBack();
      }.bind(this),
      10000,
    );
    this.appState = AppState.addEventListener(
      'change',
      this.__handleAppStateChange,
    );
    this.backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      this._handleBackPress,
    );
    if (this.props.route.params?.driver) {
      this.setState(
        {
          driver: this.props.route.params?.driver,
          data: this.props.route.params?.data,
        },
        () => {
          const { driver, data } = this.state;
          Geolocation.watchPosition(location => {
            const { latitude, longitude } = location.coords;
            if (this.socket !== null) {
              this.socket.emit('send_coordinate', {
                receiverId: data.customer.userId,
                data: {
                  latitude: latitude,
                  longitude: longitude,
                  from: 'background_geolocation',
                },
              });
            }
          });
          this.timerConnect = setTimeout(
            function () {
              this.setState({
                readyConnect: true,
              });
            }.bind(this),
            5000,
          );
          if (this.socket !== null) {
            this.socket.on(
              `${driver.driverId}_receive_response`,
              function (status) {
                if (status) {
                  clearTimeout(this.timeoutResponse);
                  this.setState({
                    sliderButton: true,
                    responseSent: true,
                  });
                }
              }.bind(this),
            );
            this.socket.on(
              'connect',
              function () {
                clearTimeout(this.timerConnect);
                this._getChats();
                this._getOrderStatus();
                this.setState({
                  isConnected: true,
                  readyConnect: true,
                });
              }.bind(this),
            );
            this.socket.on(
              'disconnect',
              function () {
                this.setState({
                  isConnected: false,
                });
              }.bind(this),
            );
            this.socket.on(
              `${driver.driverId}_receive_chat`,
              function (chat) {
                this.setState(
                  {
                    hasNewChats: true,
                    chats: [
                      ...this.state.chats,
                      {
                        ...chat,
                      },
                    ],
                    newChatLength: this.state.newChatLength + 1,
                  },
                  () => {
                    this.sound();
                    this._saveChatOnStorage({
                      orderId: chat.orderId,
                      sender: chat.sender,
                      text: chat.text,
                      dateTime: chat.dateTime,
                    });
                    Animated.timing(this.state.opacityBoxNotif, {
                      toValue: 1,
                      duration: 500,
                    }).start();
                    if (this.state.newChatLength > 0) {
                      clearTimeout(this.timer);
                      this.timer = setTimeout(
                        function () {
                          Animated.timing(this.state.opacityBoxNotif, {
                            toValue: 0,
                            duration: 500,
                          }).start();
                          setTimeout(
                            function () {
                              this.setState({
                                newChatLength: 0,
                              });
                            }.bind(this),
                            500,
                          );
                        }.bind(this),
                        5000,
                      );
                    }
                  },
                );
              }.bind(this),
            );
            this.socket.on(
              driver.driverId + '_receive_order_cancellation',
              function (statusCancel) {
                AsyncStorage.getItem('orders', (_err, order) => {
                  if (order !== null) {
                    order = JSON.parse(order);
                    let index = order
                      .map(item => {
                        return item.orderId;
                      })
                      .indexOf(data.orderId.toString());
                    order[index].status =
                      statusCancel === 'by_user'
                        ? 'cancelled_by_user'
                        : 'cancelled_by_driver';
                    AsyncStorage.setItem(
                      'orders',
                      JSON.stringify(order),
                      () => {
                        if (this.props.route.params?.stopSoundVibrate) {
                          this.props.route.params?.stopSoundVibrate();
                        }
                        if (statusCancel === 'by_time') {
                        } else {
                          ToastAndroid.show(
                            'Pesanan dibatalkan',
                            ToastAndroid.SHORT,
                          );
                        }
                        this.props.navigation.goBack();
                      },
                    );
                  }
                });
              }.bind(this),
            );
          }
        },
      );
    }
  }

  componentWillUnmount() {
    this.appState?.remove();
    this.backHandler?.remove();
    if (this.props.route.params?.action) {
      this.props.route.params?.action();
    }
    if (this.socket !== null) {
      this.socket.disconnect();
    }
    const data = this.state.data;
    if (
      data.status === 'completed' ||
      data.status === 'cancelled_by_driver' ||
      data.status === 'cancelled_by_user'
    ) {
      if (this.props.route.params?.socket) {
        this.props.route.params?.socket.connect();
      }
    }

    this.pendingPromises.map(p => {
      this.removePendingPromise(p);
    });
  }

  _handleBackPress = () => {
    if (!this.state.responseSent) {
      return true;
    }
  };

  _saveChatOnStorage = data => {
    AsyncStorage.getItem('chats', (_error, chat) => {
      if (chat !== null) {
        chat = JSON.parse(chat);
        chat.push(data);
        AsyncStorage.setItem('chats', JSON.stringify(chat));
      } else {
        AsyncStorage.setItem('chats', JSON.stringify([data]));
      }
    });
  };

  _getChats = () => {
    const { orderId } = this.state.data;
    if (orderId !== null) {
      fetch(`${EXPRESS_URL}chats/${orderId}`)
        .then(res => res.json())
        .then(chat => {
          if (chat.length > 0) {
            this.setState(
              {
                chats: chat,
              },
              () => {
                AsyncStorage.getItem('chats', (_err, res) => {
                  if (res !== null) {
                    res = JSON.parse(res);
                    let chatArray = [];
                    res.map(a => {
                      a.orderId !== orderId && chatArray.push(a);
                    });
                    AsyncStorage.setItem(
                      'chats',
                      JSON.stringify(chatArray.concat(chat)),
                    );
                    let length = res.map(a => {
                      return a.orderId === orderId;
                    }).length;
                    if (length < chat.length) {
                      this.setState(
                        {
                          newChatLength: chat.length - length,
                          hasNewChats: true,
                        },
                        () => {
                          if (this.state.hasNewChats) {
                            this.sound();
                            Animated.timing(this.state.opacityBoxNotif, {
                              toValue: 1,
                              duration: 500,
                            }).start();
                            clearTimeout(this.timer);
                            this.timer = setTimeout(
                              function () {
                                Animated.timing(this.state.opacityBoxNotif, {
                                  toValue: 0,
                                  duration: 500,
                                }).start();
                                setTimeout(
                                  function () {
                                    this.setState({
                                      newChatLength: 0,
                                    });
                                  }.bind(this),
                                  500,
                                );
                              }.bind(this),
                              5000,
                            );
                          }
                        },
                      );
                    }
                  } else {
                    AsyncStorage.setItem('chats', JSON.stringify(chat));
                  }
                });
              },
            );
          }
        })
        .catch(_err => {
          Alert.alert(
            'Koneksi gagal',
            'Terjadi kesalahan pada sistem. Silakan coba lagi nanti.',
            [
              {
                text: 'Coba lagi',
                onPress: this._getChats,
              },
            ],
            { cancelable: true },
          );
        });
    }
  };

  _getOrderStatus = async () => {
    const { orderId } = this.state.data;
    if (orderId !== null) {
      const token = await AsyncStorage.getItem('token');
      fetch(`${REST_API_URL}order/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(res => {
          if (res !== null) {
            this.setState(
              {
                data: {
                  ...this.state.data,
                  status: res.orderEndStatus,
                },
              },
              () => {
                const { status } = this.state.data;
                AsyncStorage.getItem('orders', (_err, order) => {
                  if (order !== null) {
                    order = JSON.parse(order);
                    let index = order
                      .map(item => {
                        return item.orderId;
                      })
                      .indexOf(orderId.toString());
                    order[index].status = status;
                    AsyncStorage.setItem(
                      'orders',
                      JSON.stringify(order),
                      () => {
                        this.setState({
                          sliderButton: true,
                        });
                      },
                    );
                  }
                });
              },
            );
          } else {
            if (this.props.route.params?.fromOrderPage) {
              AsyncStorage.getItem('orders', (_err, order) => {
                if (order !== null) {
                  order = JSON.parse(order);
                  let index = order
                    .map(item => {
                      return item.orderId;
                    })
                    .indexOf(orderId.toString());
                  order.splice(index, 1);
                  AsyncStorage.setItem('orders', JSON.stringify(order), () => {
                    if (this.props.route.params?.stopSoundVibrate) {
                      this.props.route.params?.stopSoundVibrate();
                    }
                    ToastAndroid.show('Pesanan tidak sah', ToastAndroid.SHORT);
                    this.props.navigation.goBack();
                  });
                }
              });
            }
          }
        })
        .catch(_err => {
          Alert.alert(
            'Gagal memperbarui status pesanan',
            'Cek koneksi wifi atau jaringan seluler anda dan coba lagi',
            [
              {
                text: 'Coba lagi',
                onPress: this._getOrderStatus,
              },
            ],
            { cancelable: true },
          );
        });
    }
  };

  _sendNotification = (title, message) => {
    PushNotification.localNotification({
      title: title,
      message: message,
      importance: 'high',
      priority: 'high',
    });
  };

  __handleAppStateChange = nextAppState => {
    this.setState({
      appState: nextAppState,
    });
    if (nextAppState === 'active') {
      if (this.props.route.params?.stopSoundVibrate) {
        this.props.route.params?.stopSoundVibrate();
      }
    }
  };

  _handleOpenUrl = _event => {};

  _userLocationChange = location => {
    const { customer, orderId } = this.state.data;
    if (this.socket !== null) {
      this.socket.emit('send_coordinate', {
        receiverId: customer.userId,
        data: {
          latitude: location.nativeEvent.coordinate.latitude,
          longitude: location.nativeEvent.coordinate.longitude,
          from: 'maps',
        },
      });
    }
  };

  _mapReady = () => {
    this._mapView.fitToElements(true);
    let { orderType, merchant, destination, origin, status, orderId } =
      this.state.data;
    this.setState(
      {
        mapWidth: width,
      },
      () => {
        if (!this.props.route.params?.fromOrderPage && status === 'finded') {
          let titleNotif = orderType === 'FOOD' ? 'CO-FOOD' : 'CO-RIDE',
            descriptionNotif =
              orderType === 'FOOD'
                ? `Membelikan pesanan dari ${merchant.merchantName} ke ${destination.geocode.title}`
                : `Mengantar penumpang dari ${origin.geocode.title} ke ${destination.geocode.title}`;

          if (this.state.appState == 'background') {
            this._sendNotification(titleNotif, descriptionNotif);
          }
        } else {
          this.setState({
            responseSent: true,
          });
        }
        this._makePolyline();
        this._mapView.animateToRegion({
          latitude: origin.geometry.latitude,
          longitude: origin.geometry.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      },
    );
  };

  _acceptOrder = () => {
    clearTimeout(this.timerAcceptOrder);
    SoundPlayer.pause();
    if (this.props.route.params?.stopSoundVibrate) {
      this.props.route.params?.stopSoundVibrate();
    }
    const { orderId, customer } = this.state.data;
    this.socket.emit('send_response', {
      receiverId: customer.userId,
      data: 'ACCEPT',
    });
    this.setState(
      {
        loadingAccept: true,
      },
      () => {
        this.timeoutResponse = setTimeout(
          function () {
            const { orderId } = this.state.data;
            AsyncStorage.getItem('orders', (_err, order) => {
              if (order !== null) {
                order = JSON.parse(order);
                let index = order
                  .map(item => {
                    return item.orderId;
                  })
                  .indexOf(orderId.toString());
                order.splice(index, 1);
                AsyncStorage.setItem('orders', JSON.stringify(order));
                this.props.navigation.goBack();
                this.backHandler?.remove();
                ToastAndroid.show(
                  'Gagal mengambil pesanan',
                  ToastAndroid.SHORT,
                );
              }
            });
          }.bind(this),
          15000,
        );
      },
    );
  };

  _declineOrder = () => {
    clearTimeout(this.timerAcceptOrder);
    SoundPlayer.pause();
    if (this.props.route.params?.stopSoundVibrate) {
      this.props.route.params?.stopSoundVibrate();
    }
    const { orderId, customer } = this.state.data;
    AsyncStorage.getItem('orders', (_err, order) => {
      if (order !== null) {
        order = JSON.parse(order);
        let index = order
          .map(item => {
            return item.orderId;
          })
          .indexOf(orderId.toString());
        order[index].status = 'cancelled_by_driver';
        AsyncStorage.setItem('orders', JSON.stringify(order), () => {
          this.props.navigation.goBack();
          this.socket.emit('send_response', {
            receiverId: customer.userId,
            data: 'DECLINE',
          });
        });
      }
    });
    this.setState({
      responseSent: true,
    });
  };

  _makePolyline = () => {
    let { origin, destination } = this.state.data;
    let originD = {
      latitude: origin.geometry.latitude,
      longitude: origin.geometry.longitude,
    };
    let destinationD = {
      latitude: destination.geometry.latitude,
      longitude: destination.geometry.longitude,
    };
    this._getDirections(originD, destinationD)
      .then(directions => {
        let points = Polyline.decode(
          directions.routes[0].overview_polyline.points,
        );
        let coords = points.map((point, _index) => {
          return {
            latitude: point[0],
            longitude: point[1],
          };
        });
        this.setState({
          polyline: coords,
        });
      })
      .catch(_error => {});
  };

  _getDirections = (origin, destination) => {
    return new Promise((resolve, reject) => {
      fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`,
      )
        .then(res => res.json())
        .then(resolve)
        .catch(reject);
    });
  };

  _onEndSliding = () => {
    let { status, orderType, driver, fare, orderId, carts } = this.state.data;
    if (orderType === 'FOOD') {
      switch (status) {
        case 'finded':
          status = 'towards_resto';
          break;
        case 'towards_resto':
          status = 'bought_order';
          break;
        case 'bought_order':
          status = 'towards_customer';
          break;
        case 'towards_customer':
          status = 'completed';
          break;
      }
    } else if (orderType === 'RIDE') {
      switch (status) {
        case 'finded':
          status = 'towards_customer';
          break;
        case 'towards_customer':
          status = 'drop_off';
          break;
        case 'drop_off':
          status = 'completed';
          break;
      }
    }
    const data = {
      orderId: orderId,
      status: status,
      carts: status === 'completed' ? carts : undefined,
    };
    this.setState(
      {
        sliderTrigger: 'endSlide',
      },
      () => {
        const wrappedPromise = cancellablePromise(
          this._promiseChangeStatusServer(data),
        );
        this.appendPendingPromise(wrappedPromise);
        wrappedPromise.promise
          .then(res => {
            if (res.status === 'OK') {
              if (status !== 'completed') {
                this._changeStatusLocal(status);
              }
            } else {
              ToastAndroid.show('Koneksi gagal', ToastAndroid.SHORT);
            }
          })
          .then(() => {
            this.removePendingPromise(wrappedPromise);
            if (status === 'completed') {
              this._fetchPaid(status);
            } else {
              this.setState({
                sliderTrigger: 'ready',
              });
            }
          })
          .catch(_err => {
            ToastAndroid.show('Koneksi gagal', ToastAndroid.SHORT);
          });
      },
    );
  };

  _fetchPaid = status => {
    let { driver, fare } = this.state.data;
    const data = {
      driverPhone: driver.driverPhone,
      fare: fare,
    };
    const wrappedPromise = cancellablePromise(this._promisePaid(data));
    this.appendPendingPromise(wrappedPromise);
    wrappedPromise.promise
      .then(res => {
        if (res.status === 'OK') {
          this._changeStatusLocal(status);
        } else {
          ToastAndroid.show('Koneksi gagal', ToastAndroid.SHORT);
        }
      })
      .then(() => {
        this.removePendingPromise(wrappedPromise);
        this.setState({
          sliderTrigger: 'ready',
        });
      })
      .catch(_err => {
        ToastAndroid.show('Koneksi gagal', ToastAndroid.SHORT);
      });
  };

  _promiseChangeStatusServer = data => {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('token').then(v => {
        fetch(`${REST_API_URL}order/status`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${v}`,
          },
          body: JSON.stringify(data),
        })
          .then(res => res.json())
          .then(resolve)
          .catch(reject);
      });
    });
  };

  _promisePaid = data => {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('token').then(v => {
        fetch(`${REST_API_URL}driver/bayar`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${v}`,
          },
          body: JSON.stringify(data),
        })
          .then(res => res.json())
          .then(resolve)
          .catch(reject);
      });
    });
  };

  _changeStatusLocal = status => {
    this.setState(
      {
        data: {
          ...this.state.data,
          status: status,
        },
      },
      () => {
        const { customer, status, orderId } = this.state.data;
        AsyncStorage.getItem('orders', (_err, order) => {
          if (order !== null) {
            order = JSON.parse(order);
            let index = order
              .map(item => {
                return item.orderId;
              })
              .indexOf(orderId.toString());
            order[index].status = status;
            AsyncStorage.setItem('orders', JSON.stringify(order));
          }
        });
        if (this.socket !== null) {
          this.socket.emit('send_order_status', {
            receiverId: customer.userId,
            data: status,
          });
        }
      },
    );
  };

  _navigate = (screen, params = undefined) => {
    this.props.navigation.navigate(screen, {
      data: params,
      backHandlerPrevScreen: {
        add: () => this.backHandler,
        remove: () => this.backHandler?.remove(),
      },
      statusbar: {
        barStyle: 'dark-content',
        background: Color.grayLighter,
      },
    });
  };

  render() {
    const { data } = this.state;

    if (data !== null) {
      const {
        customer,
        destination,
        distances,
        origin,
        carts,
        fare,
        orderType,
        note,
        status,
        driver,
        orderId,
        merchant,
      } = data;

      let titleSlider = '';
      if (orderType === 'FOOD') {
        switch (status) {
          case 'finded':
            titleSlider = 'Geser untuk menuju resto';
            break;
          case 'towards_resto':
            titleSlider = 'Geser untuk membelikan pesanan';
            break;
          case 'bought_order':
            titleSlider = 'Geser untuk mengantarkan pesanan';
            break;
          case 'towards_customer':
            titleSlider = 'Geser untuk menyelesaikan pesanan';
            break;
          case 'completed':
            titleSlider = 'Tugas selesai';
            break;
          default:
            titleSlider = 'Tugas telah dibatalkan';
        }
      } else if (orderType === 'RIDE') {
        switch (status) {
          case 'finded':
            titleSlider = 'Geser untuk menjemput penumpang';
            break;
          case 'towards_customer':
            titleSlider = 'Geser untuk mengantar penumpang';
            break;
          case 'drop_off':
            titleSlider = 'Geser untuk menyelesaikan tugas';
            break;
          case 'completed':
            titleSlider = 'Tugas selesai';
            break;
          default:
            titleSlider = 'Tugas telah dibatalkan';
        }
      }
      return (
        <View style={{ flex: 1, paddingBottom: this.props.insets.bottom }}>
          <View style={{ flex: 1 }}>
            <MapView
              showsUserLocation={true}
              followsUserLocation={true}
              onUserLocationChange={this._userLocationChange}
              showsCompass={false}
              showsMyLocationButton={false}
              ref={_mapView => (this._mapView = _mapView)}
              // onRegionChange={this._regionChange}
              // onRegionChangeComplete={this._regionChangeComplete}
              onMapReady={this._mapReady}
              provider={PROVIDER_GOOGLE}
              initialRegion={this.state.region}
              style={{ flex: 1, width: this.state.mapWidth }}
              mapPadding={{
                top: StatusBar.currentHeight + 15,
                left: 15,
                right: 15,
                bottom: 15,
              }}
            >
              <Marker
                coordinate={{
                  latitude: origin.geometry.latitude,
                  longitude: origin.geometry.longitude,
                }}
                image={
                  orderType === 'FOOD'
                    ? require('../images/icons/resto-marker.png')
                    : orderType === 'RIDE'
                    ? require('../images/icons/passenger-marker.png')
                    : undefined
                }
              />
              <Marker
                coordinate={{
                  latitude: destination.geometry.latitude,
                  longitude: destination.geometry.longitude,
                }}
                image={require('../images/icons/destination-marker.png')}
              />
              <Direction
                coordinates={this.state.polyline}
                strokeWidth={4}
                strokeColor={Color.green}
              />
            </MapView>
            <View
              style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                opacity: 0.35,
                padding: 4,
                borderRadius: 20,
                backgroundColor: Color.white,
              }}
            >
              {orderType === 'FOOD' && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: Color.white,
                    }}
                  >
                    <Fa
                      iconStyle="solid"
                      color={Color.textColor}
                      name="utensils"
                    />
                  </View>
                  <Text
                    style={{ fontWeight: 'bold', marginLeft: 3, fontSize: 13 }}
                  >
                    CO-FOOD
                  </Text>
                </View>
              )}
              {orderType === 'RIDE' && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: Color.white,
                    }}
                  >
                    <Fa
                      iconStyle="solid"
                      color={Color.textColor}
                      name="motorcycle"
                    />
                  </View>
                  <Text
                    style={{ fontWeight: 'bold', marginLeft: 3, fontSize: 13 }}
                  >
                    CO-RIDE
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ position: 'relative', maxHeight: 350 }}>
            <ScrollView>
              <View
                style={{
                  backgroundColor: Color.grayLighter,
                  paddingBottom: 10,
                }}
              >
                <View
                  style={{
                    padding: 15,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: Color.white,
                    borderBottomWidth: 1,
                    borderBottomColor: Color.borderColor,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 13, color: Color.textMuted }}
                      >
                        Nama Customer
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 18, fontWeight: 'bold' }}
                      >
                        {customer.userName}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ marginHorizontal: 5 }}>
                      <TouchableNativeFeedback
                        onPress={() =>
                          Linking.openURL(`tel://${customer.userPhone}`)
                        }
                        useForeground={true}
                        background={TouchableNativeFeedback.Ripple(
                          'rgba(0,0,0,.15)',
                          true,
                        )}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            backgroundColor: Color.green,
                            borderRadius: 40 / 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Fa
                            iconStyle="solid"
                            name="phone"
                            size={18}
                            color={Color.white}
                          />
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                    <View style={{ marginHorizontal: 5 }}>
                      <TouchableNativeFeedback
                        onPress={() =>
                          this._navigate('Chat', {
                            chats: this.state.chats,
                            noNewChat: () => {
                              this.setState({
                                hasNewChats: false,
                                newChatLength: 0,
                              });
                            },
                            pushChat: chats => {
                              this.setState({ chats });
                            },
                            socket: this.socket,
                            receiverId: driver.driverId,
                            customer: customer,
                            orderId: orderId,
                            status: status,
                          })
                        }
                        useForeground={true}
                        background={TouchableNativeFeedback.Ripple(
                          'rgba(0,0,0,.15)',
                          true,
                        )}
                      >
                        <View
                          style={{
                            position: 'relative',
                            width: 40,
                            height: 40,
                            backgroundColor: Color.green,
                            borderRadius: 40 / 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {this.state.hasNewChats && (
                            <View
                              style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: 10,
                                height: 10,
                                borderRadius: 10 / 2,
                                backgroundColor: Color.red,
                              }}
                            />
                          )}
                          <Fa
                            iconStyle="solid"
                            name="comment-dots"
                            size={18}
                            color={Color.white}
                          />
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                    <View style={{ marginHorizontal: 5 }}>
                      <TouchableNativeFeedback
                        onPress={() =>
                          Linking.openURL(
                            `whatsapp://send?phone=${phoneNumFormat(
                              customer.userPhone,
                            )}`,
                          )
                        }
                        useForeground={true}
                        background={TouchableNativeFeedback.Ripple(
                          'rgba(0,0,0,.15)',
                          true,
                        )}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            backgroundColor: Color.green,
                            borderRadius: 40 / 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Fa
                            iconStyle="brand"
                            name="whatsapp"
                            size={18}
                            color={Color.white}
                          />
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                  </View>
                </View>
                <Card
                  headerStyleGray
                  headerTitle={
                    orderType === 'FOOD' ? 'Detail Pengiriman' : 'Detail Alamat'
                  }
                  body={
                    <View>
                      <View style={{ marginBottom: 15 }}>
                        {/* {
                        merchant !== undefined &&
                        <TouchableNativeFeedback
                          useForeground={true}
                          background={TouchableNativeFeedback.Ripple('rgba(0,0,0,.15)', false)}
                          onPress={() => Linking.openURL(`google.navigation:q=${merchant.merchantLatitude}+${merchant.merchantLongitude}`)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 }}>
                            <View>
                              <View style={{ width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 45 / 2, backgroundColor: Color.red }}>
                                <Fa iconStyle='solid' size={16} color={Color.white} name='utensils' />
                              </View>
                            </View>
                            <View style={{ paddingHorizontal: 10, flex: 1 }}>
                              <Text numberOfLines={1} style={{ fontSize: 11, marginBottom: 5, textTransform: 'uppercase' }}>Alamat restoran</Text>
                              <Text numberOfLines={1} style={{ fontWeight: 'bold' }}>{merchant.merchantName}</Text>
                            </View>
                          </View>
                        </TouchableNativeFeedback>
                      } */}
                        <TouchableNativeFeedback
                          useForeground={true}
                          background={TouchableNativeFeedback.Ripple(
                            'rgba(0,0,0,.15)',
                            false,
                          )}
                          onPress={() =>
                            Linking.openURL(
                              `google.navigation:q=${origin.geometry.latitude}+${origin.geometry.longitude}`,
                            )
                          }
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 15,
                              paddingVertical: 10,
                            }}
                          >
                            <View>
                              <View
                                style={{
                                  width: 35,
                                  height: 35,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 45 / 2,
                                  backgroundColor: Color.blue,
                                }}
                              >
                                <Fa
                                  iconStyle="solid"
                                  size={16}
                                  color={Color.white}
                                  name="user"
                                />
                              </View>
                            </View>
                            <View style={{ paddingHorizontal: 10, flex: 1 }}>
                              {orderType === 'RIDE' && (
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    fontSize: 11,
                                    marginBottom: 5,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Alamat jemput
                                </Text>
                              )}
                              {orderType === 'FOOD' && (
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    fontSize: 11,
                                    marginBottom: 5,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Alamat resto
                                </Text>
                              )}
                              <Text
                                numberOfLines={1}
                                style={{ fontWeight: 'bold' }}
                              >
                                {origin.geocode.title}
                              </Text>
                            </View>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                            >
                              {orderType === 'FOOD' && (
                                <TouchableNativeFeedback
                                  onPress={() =>
                                    Linking.openURL(
                                      `tel://${merchant.merchantPhone}`,
                                    )
                                  }
                                  useForeground={true}
                                  background={TouchableNativeFeedback.Ripple(
                                    'rgba(0,0,0,.15)',
                                    false,
                                  )}
                                >
                                  <View
                                    style={{
                                      width: 35,
                                      height: 35,
                                      borderRadius: 35 / 2,
                                      backgroundColor: Color.green,
                                      marginHorizontal: 5,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      overflow: 'hidden',
                                      elevation: 1,
                                    }}
                                  >
                                    <Fa
                                      iconStyle="solid"
                                      color={colorYiq(Color.green)}
                                      name="phone"
                                    />
                                  </View>
                                </TouchableNativeFeedback>
                              )}
                              <Fa
                                iconStyle="solid"
                                color={Color.black}
                                name="chevron-right"
                              />
                            </View>
                          </View>
                        </TouchableNativeFeedback>
                        <TouchableNativeFeedback
                          useForeground={true}
                          background={TouchableNativeFeedback.Ripple(
                            'rgba(0,0,0,.15)',
                            false,
                          )}
                          onPress={() =>
                            Linking.openURL(
                              `google.navigation:q=${destination.geometry.latitude}+${destination.geometry.longitude}`,
                            )
                          }
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 15,
                              paddingVertical: 10,
                            }}
                          >
                            <View>
                              <View
                                style={{
                                  width: 35,
                                  height: 35,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 45 / 2,
                                  backgroundColor: Color.secondary,
                                }}
                              >
                                <Fa
                                  iconStyle="solid"
                                  color={Color.white}
                                  size={16}
                                  name="map-marker-alt"
                                />
                              </View>
                            </View>
                            <View style={{ paddingHorizontal: 10, flex: 1 }}>
                              {orderType === 'FOOD' && (
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    fontSize: 11,
                                    marginBottom: 5,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Alamat pengiriman •{' '}
                                  {distances.distance > 1000
                                    ? (distances.distance / 1000).toFixed(1) +
                                      'km'
                                    : distances.distance + 'm'}
                                </Text>
                              )}
                              {orderType === 'RIDE' && (
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    fontSize: 11,
                                    marginBottom: 5,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Alamat tujuan •{' '}
                                  {distances.distance > 1000
                                    ? (distances.distance / 1000).toFixed(1) +
                                      'km'
                                    : distances.distance + 'm'}
                                </Text>
                              )}
                              <Text
                                numberOfLines={1}
                                style={{ fontWeight: 'bold' }}
                              >
                                {destination.geocode.title}
                              </Text>
                            </View>
                            <View>
                              <Fa
                                iconStyle="solid"
                                color={Color.black}
                                name="chevron-right"
                              />
                            </View>
                          </View>
                        </TouchableNativeFeedback>
                      </View>
                      <View style={{ position: 'absolute', left: 31, top: 53 }}>
                        <Fa
                          iconStyle="solid"
                          color={Color.textMuted}
                          name="ellipsis-v"
                        />
                      </View>
                    </View>
                  }
                />
                {note !== '' && (
                  <Card
                    headerStyleGray
                    headerTitle="Catatan dari kustomer"
                    body={
                      <View style={{ padding: 15, marginBottom: 15 }}>
                        <Text
                          style={{ textAlign: 'center', fontStyle: 'italic' }}
                        >
                          "{note}"
                        </Text>
                      </View>
                    }
                  />
                )}
                {orderType === 'FOOD' && (
                  <Card
                    headerStyleGray
                    headerTitle="Pesanan"
                    body={
                      <View style={{ paddingHorizontal: 15, paddingBottom: 9 }}>
                        {carts.map(c => (
                          <View
                            key={c.foodId}
                            style={{
                              flexDirection: 'row',
                              marginBottom: 6,
                              marginHorizontal: -3,
                            }}
                          >
                            <View style={{ flex: 1, marginHorizontal: 3 }}>
                              <Text style={{ fontSize: 13, marginBottom: 2 }}>
                                {c.foodName}
                              </Text>
                              {c.note !== '' && (
                                <View style={{ flexDirection: 'row' }}>
                                  <Text
                                    style={{
                                      flex: 1,
                                      fontSize: 11,
                                      color: Color.textMuted,
                                    }}
                                  >
                                    "{c.note}"
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View style={{ width: 30, marginHorizontal: 3 }}>
                              <Text
                                style={{
                                  textAlign: 'right',
                                  fontSize: 13,
                                  fontWeight: 'bold',
                                }}
                              >
                                {c.qty}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    }
                  />
                )}
                {orderType === 'FOOD' && (
                  <Card
                    headerStyleGray
                    headerTitle="Detail Biaya"
                    body={
                      <View style={{ paddingHorizontal: 15, paddingBottom: 9 }}>
                        <View
                          style={{
                            borderBottomColor: Color.borderColor,
                            borderBottomWidth: 1,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              marginBottom: 6,
                              marginHorizontal: -3,
                              alignItems: 'flex-start',
                            }}
                          >
                            <Text
                              style={{
                                flex: 1,
                                fontSize: 13,
                                marginHorizontal: 3,
                              }}
                            >
                              Estimasi harga
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: 'right',
                                fontSize: 13,
                                marginHorizontal: 3,
                              }}
                            >
                              {Currency(
                                carts.reduce((a, b) => {
                                  return a + b.qty * b.foodPrice;
                                }, 0),
                              )}
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: 'row',
                              marginBottom: 6,
                              marginHorizontal: -3,
                              alignItems: 'flex-start',
                            }}
                          >
                            <Text
                              style={{
                                flex: 1,
                                fontSize: 13,
                                marginHorizontal: 3,
                              }}
                            >
                              Ongkos kirim
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: 'right',
                                fontSize: 13,
                                marginHorizontal: 3,
                              }}
                            >
                              {Currency(fare)}
                            </Text>
                          </View>
                        </View>
                        <View style={{ marginTop: 6 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              marginBottom: 6,
                              marginHorizontal: -3,
                              alignItems: 'flex-start',
                            }}
                          >
                            <Text
                              style={{
                                flex: 1,
                                fontSize: 13,
                                marginHorizontal: 3,
                                fontWeight: 'bold',
                              }}
                            >
                              Total pembayaran
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: 'right',
                                fontSize: 13,
                                marginHorizontal: 3,
                                fontWeight: 'bold',
                              }}
                            >
                              {Currency(
                                carts.reduce((a, b) => {
                                  return a + b.qty * b.foodPrice;
                                }, 0) + fare,
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>
                    }
                  />
                )}
                {orderType === 'RIDE' && (
                  <Card
                    headerStyleGray
                    headerTitle="Detail Biaya"
                    body={
                      <View style={{ paddingHorizontal: 15, paddingBottom: 9 }}>
                        <View
                          style={{
                            borderBottomColor: Color.borderColor,
                            borderBottomWidth: 1,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              marginBottom: 6,
                              marginHorizontal: -3,
                              alignItems: 'flex-start',
                            }}
                          >
                            <Text
                              style={{
                                flex: 1,
                                fontSize: 13,
                                marginHorizontal: 3,
                              }}
                            >
                              Tarif
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: 'right',
                                fontSize: 13,
                                marginHorizontal: 3,
                              }}
                            >
                              {Currency(fare)}
                            </Text>
                          </View>
                        </View>
                        <View style={{ marginTop: 6 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              marginBottom: 6,
                              marginHorizontal: -3,
                              alignItems: 'flex-start',
                            }}
                          >
                            <Text
                              style={{
                                flex: 1,
                                fontSize: 13,
                                marginHorizontal: 3,
                                fontWeight: 'bold',
                              }}
                            >
                              Total pembayaran
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: 'right',
                                fontSize: 13,
                                marginHorizontal: 3,
                                fontWeight: 'bold',
                              }}
                            >
                              {Currency(fare)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    }
                  />
                )}
              </View>
            </ScrollView>
            <View
              style={{
                backgroundColor: Color.white,
                borderBottomColor: Color.borderColor,
                elevation: this.state.isConnected ? 10 : undefined,
              }}
            >
              <View>
                {status !== 'completed' &&
                status !== 'cancelled_by_user' &&
                status !== 'cancelled_by_driver' &&
                this.state.sliderButton ? (
                  <SliderButton
                    status={this.state.sliderTrigger}
                    title={titleSlider}
                    onTrigger={this._onEndSliding}
                  />
                ) : this.state.responseSent ||
                  this.props.route.params?.fromOrderPage ? (
                  <View style={{ padding: 15 }}>
                    <View
                      style={{
                        height: 40,
                        backgroundColor: Color.grayLight,
                        borderRadius: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {status !== 'completed' &&
                      status !== 'cancelled_by_user' &&
                      status !== 'cancelled_by_driver' ? (
                        <ActivityIndicator
                          size="small"
                          color={Color.grayDark}
                        />
                      ) : (
                        <Text numberOfLines={1}>{titleSlider}</Text>
                      )}
                    </View>
                  </View>
                ) : this.state.loadingAccept ? (
                  <View style={{ padding: 15 }}>
                    <View
                      style={{
                        overflow: 'hidden',
                        height: 40,
                        backgroundColor: Color.grayLight,
                        borderRadius: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ActivityIndicator size="small" color={Color.gray} />
                    </View>
                  </View>
                ) : (
                  <View style={{ padding: 15 }}>
                    <View
                      style={{ flexDirection: 'row', marginHorizontal: -5 }}
                    >
                      <View style={{ paddingHorizontal: 5, flex: 1 }}>
                        <TouchableNativeFeedback
                          useForeground={true}
                          background={TouchableNativeFeedback.Ripple(
                            'rgba(0,0,0,.15)',
                            false,
                          )}
                          onPress={this._declineOrder}
                        >
                          <View
                            style={{
                              overflow: 'hidden',
                              height: 40,
                              backgroundColor: Color.grayLight,
                              borderRadius: 4,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text numberOfLines={1}>Tolak</Text>
                          </View>
                        </TouchableNativeFeedback>
                      </View>
                      <View style={{ paddingHorizontal: 5, flex: 1 }}>
                        <TouchableNativeFeedback
                          useForeground={true}
                          background={TouchableNativeFeedback.Ripple(
                            'rgba(0,0,0,.15)',
                            false,
                          )}
                          onPress={this._acceptOrder}
                        >
                          <View
                            style={{
                              overflow: 'hidden',
                              height: 40,
                              backgroundColor: Color.blue,
                              borderRadius: 4,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              numberOfLines={1}
                              style={{ color: colorYiq(Color.blue) }}
                            >
                              Ambil
                            </Text>
                          </View>
                        </TouchableNativeFeedback>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
            {this.socket !== null &&
              !this.state.isConnected &&
              (this.state.readyConnect ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,.35)',
                    zIndex: 2,
                  }}
                >
                  <Fa
                    iconStyle="solid"
                    name="exclamation-circle"
                    size={40}
                    color={Color.red}
                    style={{ marginBottom: 15 }}
                  />
                  <Text
                    style={{
                      textAlign: 'center',
                      color: Color.white,
                      fontWeight: 'bold',
                    }}
                  >
                    Tidak bisa terhubung
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,.35)',
                    zIndex: 2,
                  }}
                >
                  <View
                    style={{
                      marginBottom: 15,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator size="large" color={Color.primary} />
                  </View>
                  <Text
                    style={{
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    Menghubungkan
                  </Text>
                </View>
              ))}
          </View>
          {this.state.newChatLength > 0 && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
              <Animated.View
                style={{
                  marginHorizontal: 15,
                  marginVertical: 15,
                  backgroundColor: Color.white,
                  borderRadius: 10,
                  elevation: 1,
                  padding: 10,
                  opacity: this.state.opacityBoxNotif,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ marginRight: 10 }}>
                    <View
                      style={{
                        backgroundColor: Color.secondary,
                        width: 30,
                        height: 30,
                        borderRadius: 30 / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Fa
                        iconStyle="solid"
                        size={18}
                        color={colorYiq(Color.secondary)}
                        name="bell"
                      />
                    </View>
                  </View>
                  <View>
                    <Text style={{ color: Color.textMuted, marginBottom: 3 }}>
                      Pesan Baru
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                      {this.state.newChatLength} Pesan Teks
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          )}
        </View>
      );
    } else {
      return null;
    }
  }
}

export default withSafeAreaInsets(Booking);
