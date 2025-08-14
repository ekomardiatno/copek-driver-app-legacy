/* eslint-disable react-native/no-inline-styles */
import React, { Component } from 'react';
import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  PermissionsAndroid,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Color, { colorYiq } from '../tools/Color';
import Input from '../components/Input';
import Button from '../components/Button';
import cancellablePromise from '../tools/cancellablePromise.js';
import { REST_API_URL, EXPRESS_URL } from '../tools/Define';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width, height } = Dimensions.get('window');

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      phoneNumber: '',
      password: '',
      errorPhoneNumber: false,
      errorPassword: false,
      errorPhoneNumberMessage: 'Wajib memasukkan nomor handphone',
      errorPasswordMessage: 'Wajib memasukkan password',
      alertMsg: false,
      alertMsgText: 'Kombinasi nomor handphone dan password tidak tepat',
      render: false,
      isSigningIn: false,
      isSecureText: true,
    };
    this.navigation = {
      ...this.props.navigation,
      navigate: (screen, params = {}) => {
        this.props.navigation.navigate(screen, {
          ...params,
          statusBar: () => {
            StatusBar.setBackgroundColor('transparent', true);
            StatusBar.setBarStyle('dark-content', true);
            StatusBar.setTranslucent(true);
          },
        });
      },
    };
  }

  pendingPromises = [];

  appendPendingPromise = promise => {
    this.pendingPromises = [...this.pendingPromises, promise];
  };

  removePendingPromise = promise => {
    this.pendingPromises = this.pendingPromises.filter(p => p !== promise);
  };

  requestLocationPermission = async () => {
    let permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message:
          'This App needs access to your location ' +
          'so we can know where you are.',
      },
    );

    if (permission !== 'granted') {
      this.requestLocationPermission().done();
    }
  };

  componentDidMount() {
    StatusBar.setBackgroundColor('transparent', true);
    StatusBar.setBarStyle('dark-content', true);
    StatusBar.setTranslucent(true);
    this.requestLocationPermission();
    AsyncStorage.getItem('user_logged_in', (error, result) => {
      if (!error) {
        if (result === null) {
          this.setState({
            render: true,
          });
        } else {
          this.props.navigation.replace('Home');
        }
      }
    });
  }

  componentWillUnmount() {
    this.pendingPromises.map(p => {
      this.removePendingPromise(p);
    });
  }

  _passwordChangeText = password => {
    this.setState({
      password,
      errorPassword: false,
      alertMsg: false,
    });
  };

  _phoneNumberChangeText = phoneNumber => {
    this.setState({
      phoneNumber,
      errorPhoneNumber: false,
      alertMsg: false,
    });
  };

  _login = () => {
    const { phoneNumber, password } = this.state;
    phoneNumber === '' && this.setState({ errorPhoneNumber: true });
    password === '' && this.setState({ errorPassword: true });

    if (phoneNumber !== '' && password !== '') {
      this.setState({
        isSigningIn: true,
      });
      const data = {
        driverPhone: phoneNumber,
        driverPassword: password,
      };
      const wrappedPromise = cancellablePromise(this._promiseLogin(data));
      this.appendPendingPromise(wrappedPromise);
      wrappedPromise.promise
        .then(res => {
          let user = res.data;
          if (res.status === 'OK') {
            this._saveDriver(user);
          } else if (res.status === 'NOT FOUND') {
            Alert.alert(
              'No HP atau password tidak valid',
              'Periksa kembali no hp atau username Anda.',
              [
                {
                  text: 'Batal',
                  onPress: () => {
                    this.setState({
                      isSigningIn: false,
                    });
                  },
                  style: 'cancel',
                },
                {
                  text: 'Coba lagi',
                  onPress: this._login,
                },
              ],
              { cancelable: false },
            );
            this.setState({
              isSigningIn: false,
            });
          } else {
            this.setState({
              alertMsg: true,
              isSigningIn: false,
            });
          }
        })
        .then(() => {
          this.removePendingPromise(wrappedPromise);
        })
        .catch(error => {
          Alert.alert(
            'Koneksi gagal',
            'Terjadi kesalahan pada sistem. Silakan coba lagi nanti.',
            [
              {
                text: 'Batal',
                onPress: () => {
                  this.setState({
                    isSigningIn: false,
                  });
                },
                style: 'cancel',
              },
              {
                text: 'Coba lagi',
                onPress: this._login,
              },
            ],
            { cancelable: false },
          );
        });
    }
  };

  _saveDriver = data => {
    data = {
      driverId: data.driverId,
      driverName: data.driverName,
      driverVRP: data.driverVRP,
      driverPhone: data.driverPhone,
      driverEmail: data.driverEmail,
      driverPicture: data.driverPicture,
    };
    const wrappedPromise = cancellablePromise(this._promiseSaveDriver(data));
    this.appendPendingPromise(wrappedPromise);
    wrappedPromise.promise
      .then(res => {
        if (res.status === 'OK') {
          AsyncStorage.setItem(
            'user_logged_in',
            JSON.stringify(data),
            error => {
              if (!error) {
                this.props.navigation.replace('Home');
              }
            },
          );
        }
      })
      .then(() => {
        this.setState({
          password: '',
          phoneNumber: '',
          isSigningIn: false,
        });
        this.removePendingPromise(wrappedPromise);
      })
      .catch(error => {
        Alert.alert(
          'Koneksi gagal',
          'Terjadi kesalahan pada sistem. Silakan coba lagi nanti.',
          [
            {
              text: 'Batal',
              onPress: () => {
                this.setState({
                  isSigningIn: false,
                });
              },
              style: 'cancel',
            },
            {
              text: 'Coba lagi',
              onPress: this._login,
            },
          ],
          { cancelable: false },
        );
      });
  };

  _promiseSaveDriver = data => {
    return new Promise((resolve, reject) => {
      fetch(`${EXPRESS_URL}drivers`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
        .then(res => res.json())
        .then(resolve)
        .catch(reject);
    });
  };

  _promiseLogin = data => {
    return new Promise((resolve, reject) => {
      console.log(`${REST_API_URL}driver/login`);
      fetch(`${REST_API_URL}driver/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
        .then(res => res.json())
        .then(resolve)
        .catch(reject);
    });
  };

  render() {
    const {
      render,
      alertMsg,
      alertMsgText,
      errorPhoneNumber,
      errorPhoneNumberMessage,
      errorPassword,
      errorPasswordMessage,
      isSigningIn,
      phoneNumber,
      password,
    } = this.state;
    return render ? (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView>
          <View
            style={{
              backgroundColor: Color.primary,
              alignItems: 'center',
              justifyContent: 'center',
              paddingBottom: 50,
              overflow: 'hidden',
              height: (width / 4) * 3 + StatusBar.currentHeight,
              marginBottom: 15,
            }}
          >
            <Image
              style={{
                width: width,
                height: (width / 4) * 3 + StatusBar.currentHeight,
                position: 'absolute',
                top: 0,
              }}
              resizeMode="cover"
              source={require('../images/city-map.jpg')}
            />
            <Image
              style={{ width: 200, height: 200 }}
              source={require('../images/copek.png')}
            />
            <Image
              style={{
                width: width,
                height: (width / 699) * 195,
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
              }}
              source={require('../images/separator-main.png')}
            />
          </View>
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <View style={{ marginBottom: 15 }}>
              <Text
                style={{
                  fontWeight: 'bold',
                  fontSize: 18,
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                Selamat datang!
              </Text>
              <Text style={{ color: Color.gray, textAlign: 'center' }}>
                Silakan masukan nomor HP dan password untuk masuk
              </Text>
            </View>
            {alertMsg && (
              <View style={{ borderRadius: 10, marginHorizontal: 40 }}>
                <Text style={{ textAlign: 'center', color: Color.red }}>
                  {alertMsgText}
                </Text>
              </View>
            )}
            <Input
              keyboardType="number-pad"
              autoCapitalize="none"
              error={errorPhoneNumber ? true : false}
              onChangeText={this._phoneNumberChangeText}
              value={phoneNumber}
              placeholder="81234567890"
              style={{ marginBottom: 3, marginTop: 15 }}
              appendLeftText="+62"
              iconName="mobile-alt"
            />
            {errorPhoneNumber && (
              <Text style={{ fontSize: 11, marginTop: 4, color: Color.red }}>
                {errorPhoneNumberMessage}
              </Text>
            )}
            <Input
              autoCapitalize="none"
              error={errorPassword ? true : false}
              onChangeText={this._passwordChangeText}
              value={password}
              password
              secureTextEntry={this.state.isSecureText}
              placeholder="••••••••"
              style={{ marginBottom: 3, marginTop: 12 }}
              iconName="key"
              changeSecureText={() => {
                this.setState({
                  isSecureText: this.state.isSecureText ? false : true,
                });
              }}
            />
            {errorPassword && (
              <Text style={{ fontSize: 11, marginTop: 4, color: Color.red }}>
                {errorPasswordMessage}
              </Text>
            )}
            {isSigningIn ? (
              <View
                style={{
                  height: 40,
                  backgroundColor: Color.red,
                  marginBottom: 15,
                  marginTop: 27,
                  elevation: 5,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator size="small" color={colorYiq(Color.red)} />
              </View>
            ) : (
              <Button
                onPress={this._login}
                style={{ marginBottom: 15, marginTop: 27 }}
                color={Color.red}
                title="Masuk"
              />
            )}
          </View>
          <View style={{ paddingHorizontal: 30, paddingVertical: 15 }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => this.props.navigation.navigate('Forgot')}
            >
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ fontSize: 13, textAlign: 'center' }}>
                  Lupa detail informasi masuk?{' '}
                  <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
                    Dapatkan bantuan masuk.
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    ) : null;
  }
}

export default Login;
