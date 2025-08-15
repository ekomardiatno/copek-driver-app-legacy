/* eslint-disable react-native/no-inline-styles */
import React, { Component } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableNativeFeedback,
  Alert,
  Linking,
} from 'react-native';
import Color, { colorYiq } from '../../tools/Color';
import Currency from '../../tools/Currency';
import { REST_API_URL } from '../../tools/Define';
import Icon from '@react-native-vector-icons/fontawesome5';
import Button from '../../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getImageThumb from '../../helpers/getImageThumb';
import { version } from '../../../package.json';
import { withSafeAreaInsets } from 'react-native-safe-area-context';

class Account extends Component {
  didFocusListener;
  constructor(props) {
    super(props);
    this.state = {
      profile: null,
      saldo: 0,
    };
  }

  componentDidMount() {
    this._getProfile();
    this.didFocusListener = this.props.navigation.addListener(
      'didFocus',
      () => {
        this._getProfile();
      },
    );
  }

  componentWillUnmount() {
    if (this.didFocusListener) this.didFocusListener();
  }

  _getProfile = async () => {
    AsyncStorage.getItem('user_logged_in', (_err, user) => {
      if (user !== null) {
        user = JSON.parse(user);
        AsyncStorage.getItem('token').then(v => {
          fetch(`${REST_API_URL}driver/${user.driverPhone}/driverSaldo`, {
            headers: {
              Authorization: `Bearer ${v}`,
            },
          })
            .then(res => res.json())
            .then(res => {
              this.setState({
                saldo: parseInt(res.driverSaldo),
                profile: user,
              });
            })
            .catch(_err => {
              Alert.alert(
                'Koneksi gagal',
                'Terjadi kesalahan pada sistem, coba lagi nanti',
                [
                  {
                    text: 'Coba lagi',
                    onPress: this._getProfile,
                  },
                ],
              );
            });
        });
      }
    });
  };

  _logout = () => {
    AsyncStorage.removeItem('user_logged_in', error => {
      if (!error) {
        this.props.navigation.replace('Login');
        AsyncStorage.removeItem('orders');
      }
    });
  };

  render() {
    const { profile, saldo } = this.state;
    return (
      <View style={{ flex: 1, backgroundColor: Color.grayLighter }}>
        <ScrollView>
          <View
            style={{
              padding: 15,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Color.white,
              borderBottomWidth: 1,
              borderBottomColor: Color.borderColor,
              paddingTop: this.props.insets.top + 15,
            }}
          >
            <View>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  borderWidth: 4,
                  borderColor: Color.borderColor,
                  backgroundColor: Color.grayLighter,
                  overflow: 'hidden',
                }}
              >
                {profile !== null && (
                  <Image
                    style={{ width: '100%', height: '100%' }}
                    source={{ uri: getImageThumb(profile.driverPicture, 'sm') }}
                  />
                )}
              </View>
            </View>
            {profile !== null ? (
              <View style={{ paddingLeft: 15 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 6 }}
                >
                  {profile.driverName}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 13 }}>
                  {profile.driverVRP}
                </Text>
              </View>
            ) : (
              <View style={{ paddingLeft: 15 }}>
                <View
                  style={{
                    height: 18,
                    width: 150,
                    backgroundColor: Color.grayLighter,
                    borderRadius: 3,
                    marginBottom: 10,
                    marginTop: 2,
                  }}
                />
                <View
                  style={{
                    height: 13,
                    width: 100,
                    backgroundColor: Color.grayLighter,
                    borderRadius: 3,
                    marginBottom: 4,
                    marginTop: 2,
                  }}
                />
              </View>
            )}
          </View>
          <View
            style={{
              backgroundColor: Color.white,
              marginTop: 15,
              borderBottomColor: Color.borderColor,
              borderBottomWidth: 1,
            }}
          >
            <View
              style={{
                paddingHorizontal: 15,
                paddingVertical: 10,
                borderBottomColor: Color.borderColor,
                borderBottomWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    fontSize: 13,
                  }}
                >
                  Saldo Akun
                </Text>
              </View>
              <View>
                <TouchableNativeFeedback
                  useForeground={true}
                  background={TouchableNativeFeedback.Ripple(
                    'rgba(0,0,0,.15)',
                    false,
                  )}
                  onPress={() => this.props.navigation.navigate('Topup')}
                >
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 3,
                      backgroundColor: Color.green,
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 3,
                    }}
                  >
                    <Text
                      style={{
                        textTransform: 'uppercase',
                        color: colorYiq(Color.green),
                      }}
                    >
                      <Icon
                        iconStyle="solid"
                        color={colorYiq(Color.green)}
                        name="plus"
                      />{' '}
                      Top-Up
                    </Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
            <View style={{ padding: 15 }}>
              <Text
                style={{
                  color: Color.green,
                  fontWeight: 'bold',
                  fontSize: 26,
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                {Currency(saldo)}
              </Text>
              <View style={{ paddingHorizontal: 15 }}>
                <Text
                  style={{
                    textAlign: 'center',
                    color: Color.textMuted,
                    fontSize: 13,
                  }}
                >
                  Saldo ini untuk membayar setoran mitra driver ke COPEK. Saldo
                  dibawah Rp10,000 tidak bisa menerima pesanan.
                </Text>
              </View>
            </View>
          </View>
          <View
            style={{
              backgroundColor: Color.white,
              borderBottomWidth: 1,
              borderBottomColor: Color.borderColor,
              marginTop: 15,
            }}
          >
            <TouchableNativeFeedback
              useForeground={true}
              background={TouchableNativeFeedback.Ripple(
                'rgba(0,0,0,.15)',
                false,
              )}
              onPress={() => {
                Linking.openURL('market://details?id=com.koma.copek.driver');
              }}
            >
              <View style={{ flexDirection: 'row', paddingHorizontal: 15 }}>
                <View
                  style={{
                    width: 45,
                    height: 45,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    iconStyle="solid"
                    color={Color.black}
                    size={20}
                    name="star"
                  />
                </View>
                <View
                  style={{
                    borderBottomWidth: 0,
                    borderBottomColor: Color.borderColor,
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 15 }}>Beri Kami Nilai</Text>
                </View>
              </View>
            </TouchableNativeFeedback>
          </View>
          <View
            style={{
              backgroundColor: Color.white,
              borderBottomWidth: 1,
              borderBottomColor: Color.borderColor,
              marginTop: 15,
            }}
          >
            <View style={{ padding: 15 }}>
              <Button
                onPress={this._logout}
                color={Color.red}
                style={{ paddingVertical: 10 }}
                title="Keluar"
              />
            </View>
          </View>
          <View style={{ padding: 15 }}>
            <Text style={{ textAlign: 'center', color: Color.textMuted }}>
              Versi{' '}
              <Text style={{ fontWeight: 'bold', color: Color.textMuted }}>
                {version}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }
}

export default withSafeAreaInsets(Account);
