/* eslint-disable react-native/no-inline-styles */
import { Component } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableNativeFeedback,
  TextInput,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import Fa from '@react-native-vector-icons/fontawesome5';
import Color, { colorYiq } from '../tools/Color';
import phoneNumFormat from '../helpers/phoneNumFormat';
import { EXPRESS_URL } from '../tools/Define';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dateFormatted from '../helpers/dateFormatted';
import SoundPlayer from 'react-native-sound-player';
import { withSafeAreaInsets } from 'react-native-safe-area-context';
import { SocketContext } from '../components/SocketProvider';

class Chat extends Component {
  static contextType = SocketContext; // 👈 attach context
  constructor(props) {
    super(props);
    this.state = {
      chats: [],
      chatText: '',
      customer: null,
      orderId: null,
      status: '',
    };
    this.sound = () => {
      SoundPlayer.playSoundFile('iphone_send_sms', 'mp3');
      return SoundPlayer.getInfo();
    };
  }

  componentDidMount() {
    StatusBar.setBackgroundColor(Color.primary, true);
    StatusBar.setBarStyle('dark-content', true);
    if (this.props.route.params?.backListener) {
      this.props.route.params?.backListener.remove();
    }

    const { socket } = this.context;

    if (this.props.route.params?.data) {
      const { chats, receiverId, customer, orderId, status } =
        this.props.route.params?.data;
      this.setState(
        {
          chats,
          customer,
          orderId,
          status,
        },
        () => {
          if (socket?.connected) {
            this._getChats !== null && this._getChats();
          }
          socket?.on(
            `${receiverId}_receive_chat`,
            function (chat) {
              this._putChat && this._putChat(chat);
            }.bind(this),
          );
        },
      );
    }
  }

  _putChat = chat => {
    this.setState(
      {
        chats: [
          ...this.state.chats,
          {
            ...chat,
          },
        ],
      },
      () => {
        this._saveOnStorage({
          orderId: chat.orderId,
          sender: chat.sender,
          text: chat.text,
          dateTime: chat.dateTime,
        });
      },
    );
  };

  _getChats = () => {
    const { orderId } = this.state;
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
                AsyncStorage.getItem('chats', (err, res) => {
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
                  } else {
                    AsyncStorage.setItem('chats', JSON.stringify([chat]));
                  }
                });
              },
            );
          }
        })
        .catch(err => {
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

  componentWillUnmount() {
    if (this.props.route.params?.backListener) {
      this.props.route.params?.backListener.add();
    }
    if (this.props.route.params?.data) {
      this.props.route.params?.data.noNewChat();
      this.props.route.params?.data.pushChat(this.state.chats);
    }
    if (this.props.route.params?.statusbar) {
      StatusBar.setBarStyle(this.props.route.params?.statusbar.barStyle, true);
      StatusBar.setBackgroundColor(
        this.props.route.params?.statusbar.background,
        true,
      );
    }
    this._getChats = null;
    this._putChat = null;
  }

  _onSendChat = () => {
    const { socket } = this.context;
    const { chatText, customer, orderId } = this.state;
    if (chatText.length > 0) {
      fetch(`${EXPRESS_URL}chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          sender: 'driver',
          text: chatText,
        }),
      })
        .then(res => res.json())
        .then(chat => {
          this.setState(
            {
              chats: [
                ...this.state.chats,
                {
                  orderId: chat.orderId,
                  sender: chat.sender,
                  text: chat.text,
                  dateTime: chat.dateTime,
                },
              ],
              chatText: '',
            },
            () => {
              this.sound();
              this._saveOnStorage({
                orderId: chat.orderId,
                sender: chat.sender,
                text: chat.text,
                dateTime: chat.dateTime,
              });
              socket?.emit('send_chat', {
                receiverId: customer.userId,
                data: {
                  orderId: chat.orderId,
                  sender: chat.sender,
                  text: chat.text,
                  dateTime: chat.dateTime,
                },
              });
            },
          );
        });
    }
  };

  _saveOnStorage = data => {
    AsyncStorage.getItem('chats', (error, chat) => {
      if (chat !== null) {
        chat = JSON.parse(chat);
        chat.push(data);
        AsyncStorage.setItem('chats', JSON.stringify(chat));
      } else {
        AsyncStorage.setItem('chats', JSON.stringify([data]));
      }
    });
  };

  render() {
    let { chats, customer } = this.state;
    return (
      <View style={{ flex: 1, paddingBottom: this.props.insets.bottom }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Color.primary,
            elevation: 5,
            paddingTop: this.props.insets.top,
          }}
        >
          <View style={{ padding: 10, paddingVertical: 15, paddingLeft: 15 }}>
            <TouchableNativeFeedback
              onPress={() => this.props.navigation.goBack()}
              useForeground={true}
              background={TouchableNativeFeedback.Ripple(
                'rgba(0,0,0,.25)',
                false,
              )}
            >
              <View
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: 35 / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: Color.primary,
                  overflow: 'hidden',
                }}
              >
                <Fa
                  iconStyle="solid"
                  color={Color.white}
                  size={20}
                  name="chevron-left"
                />
              </View>
            </TouchableNativeFeedback>
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 10,
            }}
          >
            {/* <View style={{ width: 50, height: 50, borderRadius: 25, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: Color.secondary }}>
            </View> */}
            <View style={{ paddingRight: 10 }}>
              {customer !== null ? (
                <View>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: Color.white,
                      fontSize: 17,
                      marginBottom: 3,
                      fontWeight: 'bold',
                    }}
                  >
                    {customer.userName}
                  </Text>
                </View>
              ) : (
                <View>
                  <View
                    style={{
                      height: 17,
                      width: 120,
                      backgroundColor: Color.textColor,
                      marginBottom: 2,
                    }}
                  />
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', padding: 5, paddingRight: 15 }}>
            <View style={{ marginHorizontal: 2.5 }}>
              <TouchableNativeFeedback
                onPress={() => Linking.openURL(`tel://${customer.userPhone}`)}
                useForeground={true}
                background={TouchableNativeFeedback.Ripple(
                  'rgba(0,0,0,.25)',
                  false,
                )}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 40 / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Color.white,
                    overflow: 'hidden',
                  }}
                >
                  <Fa
                    iconStyle="solid"
                    color={Color.secondary}
                    size={18}
                    name="phone"
                  />
                </View>
              </TouchableNativeFeedback>
            </View>
            <View style={{ marginHorizontal: 2.5 }}>
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
                  'rgba(0,0,0,.25)',
                  false,
                )}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 40 / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Color.white,
                    overflow: 'hidden',
                  }}
                >
                  <Fa
                    iconStyle="brand"
                    color={Color.secondary}
                    size={18}
                    name="whatsapp"
                  />
                </View>
              </TouchableNativeFeedback>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, backgroundColor: Color.grayLighter }}>
          {chats.length <= 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 30,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginBottom: 8,
                  color: Color.textMuted,
                }}
              >
                Layanan chat (beta)
              </Text>
              <Text style={{ textAlign: 'center', color: Color.textMuted }}>
                Lebih disarankan untuk menghubungi driver lewat WhatsApp atau
                nomor telepon untuk komunikasi yang lebih baik
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={ref => (this._scrollView = ref)}
              onContentSizeChange={(contentWidth, contentHeight) => {
                this._scrollView.scrollToEnd({ animated: true });
              }}
            >
              {chats.map((chat, i) => {
                if (chat.sender === 'customer') {
                  return (
                    <View
                      key={i}
                      style={{
                        paddingHorizontal: 15,
                        paddingVertical: 5,
                        paddingRight: 50,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          marginTop: i === 0 ? 10 : 0,
                          marginBottom:
                            chats[i + 1] === undefined
                              ? i === chats.length - 1
                                ? 10
                                : 0
                              : chat.sender !== chats[i + 1].sender
                              ? 10
                              : 0,
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            backgroundColor: Color.grayLight,
                            borderRadius: 15,
                            elevation: 1,
                          }}
                        >
                          <Text style={{ lineHeight: 16 }}>{chat.text}</Text>
                          <Text
                            style={{
                              textAlign: 'right',
                              marginLeft: 25,
                              fontSize: 10,
                              color: Color.textMuted,
                            }}
                          >
                            {dateFormatted(chat.dateTime, true, true)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                } else {
                  return (
                    <View
                      key={i}
                      style={{
                        paddingHorizontal: 15,
                        paddingVertical: 5,
                        paddingLeft: 50,
                        alignItems: 'flex-end',
                        marginTop: i === 0 ? 10 : 0,
                        marginBottom:
                          chats[i + 1] === undefined
                            ? i === chats.length - 1
                              ? 10
                              : 0
                            : chat.sender !== chats[i + 1].sender
                            ? 10
                            : 0,
                      }}
                    >
                      <View style={{ flexDirection: 'row' }}>
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            backgroundColor: Color.primary,
                            borderRadius: 15,
                            elevation: 1,
                          }}
                        >
                          <Text
                            style={{
                              lineHeight: 16,
                              color: colorYiq(Color.primary),
                            }}
                          >
                            {chat.text}
                          </Text>
                          <Text
                            style={{
                              textAlign: 'right',
                              marginLeft: 25,
                              fontSize: 10,
                              color: Color.white,
                            }}
                          >
                            {dateFormatted(chat.dateTime, true, true)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }
              })}
            </ScrollView>
          )}
        </View>
        <View
          style={{
            paddingHorizontal: 15,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'flex-end',
            backgroundColor: Color.grayLighter,
          }}
        >
          {this.state.status === 'completed' ||
          this.state.status === 'cancelled_by_driver' ||
          this.state.status === 'cancelled_by_user' ? (
            <View
              style={{
                backgroundColor: Color.grayLight,
                height: 45,
                flex: 1,
                borderRadius: 45 / 2,
                elevation: 1,
                paddingHorizontal: 15,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: Color.textMuted, fontSize: 14 }}>
                Sesi obrolan berakhir
              </Text>
            </View>
          ) : (
            <TextInput
              multiline
              value={this.state.chatText}
              onChangeText={chatText => this.setState({ chatText })}
              style={{
                flex: 1,
                color: Color.textColor,
                fontFamily: 'Archivo',
                fontSize: 14,
                backgroundColor: Color.white,
                paddingVertical: 6,
                paddingHorizontal: 15,
                minHeight: 45,
                maxHeight: 90,
                borderRadius: 45 / 2,
                elevation: 1,
              }}
              placeholderTextColor={Color.textHint}
              placeholder="Masukkan pesan"
            />
          )}
          {this.state.status === 'completed' ||
          this.state.status === 'cancelled_by_driver' ||
          this.state.status === 'cancelled_by_user' ? (
            <View
              style={{
                width: 45,
                height: 45,
                marginLeft: 10,
                borderRadius: 45 / 2,
                backgroundColor: Color.gray,
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 1,
                overflow: 'hidden',
              }}
            >
              <Fa
                iconStyle="solid"
                size={18}
                color={colorYiq(Color.gray)}
                name="paper-plane"
              />
            </View>
          ) : (
            <TouchableNativeFeedback
              onPress={this._onSendChat}
              useForeground={true}
              background={TouchableNativeFeedback.Ripple(
                'rgba(0,0,0,.25',
                false,
              )}
            >
              <View
                style={{
                  width: 45,
                  height: 45,
                  marginLeft: 10,
                  borderRadius: 45 / 2,
                  backgroundColor: Color.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 1,
                  overflow: 'hidden',
                }}
              >
                <Fa
                  iconStyle="solid"
                  size={18}
                  color={colorYiq(Color.secondary)}
                  name="paper-plane"
                />
              </View>
            </TouchableNativeFeedback>
          )}
        </View>
      </View>
    );
  }
}

export default withSafeAreaInsets(Chat);
