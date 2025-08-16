/* eslint-disable react-native/no-inline-styles */
import React, { Component } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Header from '../../components/Header';
import OrderHistoryItem from '../../components/OrderHistoryItem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dateFormatted from '../../helpers/dateFormatted';
import Currency from '../../helpers/Currency';
import Color from '../../tools/Color';
import cancellablePromise from '../../tools/cancellablePromise';
import { REST_API_URL } from '../../tools/Define';

export default class Order extends Component {
  didFocusListener;
  constructor(props) {
    super(props);
    this.state = {
      orders: [],
    };
  }

  pendingPromises = [];

  appendPendingPromise = promise => {
    this.pendingPromises = [...this.pendingPromises, promise];
  };

  removePendingPromise = promise => {
    this.pendingPromises = this.pendingPromises.filter(p => p !== promise);
  };

  componentDidMount() {
    this._getCheckOrderStatus();
    this.didFocusListener = this.props.navigation.addListener(
      'focus',
      () => {
        this._getCheckOrderStatus();
      },
    );
  }

  _getData = async () => {
    const getOrders = await AsyncStorage.getItem('orders')
    if(getOrders) {
      const orders = JSON.parse(getOrders)
      orders.reverse();
          this.setState({
            orders,
          });
    }
  };

  _getCheckOrderStatus = () => {
    this.setState({
      errorFetch: false,
    });
    const wrappedPromise = cancellablePromise(this._promiseCheckOrderStatus());
    this.appendPendingPromise(wrappedPromise);
    wrappedPromise.promise
      .then(res => {
        if (res.length > 0) {
          for (let i = 0; i < res.length; i++) {
            AsyncStorage.getItem('orders', (_err, order) => {
              if (order !== null) {
                const newOrder = JSON.parse(order).map(item => {
                  if(item.orderId === res[i].orderId.toString()) {
                    return {
                      ...item,
                      status: item.status === 'taken' && res[i].status === 'finded' ? 'taken' : res[i].status
                    }
                  } else {
                    return item
                  }
                })
                AsyncStorage.setItem('orders', JSON.stringify(newOrder), _err => {
                  if (i + 1 >= res.length) {
                    this._getData();
                  }
                });
              }
            });
          }
        } else {
          this._getData();
        }
      })
      .then(() => this.removePendingPromise(wrappedPromise))
      .catch(_err => {
        this.setState({
          alert: false,
        });
      });
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

  componentWillUnmount() {
    this.didFocusListener();
    this.pendingPromises.map(p => {
      this.removePendingPromise(p);
    });
  }

  _navigateBooking = order => {
    this.props.navigation.navigate('Booking', {
      data: order,
      driver: order.driver,
      fromOrderPage: true,
      action: this._getCheckOrderStatus,
    });
  };

  render() {
    const { orders } = this.state;
    return (
      <View style={{ flex: 1 }}>
        <Header title="Pesanan" />
        {orders.length <= 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 30,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
              Semangat!
            </Text>
            <Text
              style={{
                textAlign: 'center',
                lineHeight: 18,
                color: Color.textMuted,
              }}
            >
              Setiap pesanan masuk yang anda kerjakan akan tercatat disini.
            </Text>
          </View>
        ) : (
          <ScrollView>
            {orders.map((order, i) =>
              order.orderType === 'FOOD' ? (
                <OrderHistoryItem
                  last={i === orders.length - 1 ? true : false}
                  onPress={() => this._navigateBooking(order)}
                  key={order.orderId}
                  origin={order.origin}
                  destination={order.destination}
                  dateTime={dateFormatted(order.date, true)}
                  type={order.orderType}
                  fare={Currency(
                    order.carts
                      .map(function (a) {
                        return a.foodPrice * a.qty;
                      })
                      .reduce(function (a, b) {
                        return a + b;
                      }) + order.fare,
                  )}
                  status={order.status}
                />
              ) : (
                <OrderHistoryItem
                  last={i === orders.length - 1 ? true : false}
                  onPress={() => this._navigateBooking(order)}
                  key={order.orderId}
                  origin={order.origin}
                  destination={order.destination}
                  dateTime={dateFormatted(order.date, true)}
                  type={order.orderType}
                  fare={Currency(order.fare)}
                  status={order.status}
                />
              ),
            )}
          </ScrollView>
        )}
      </View>
    );
  }
}
