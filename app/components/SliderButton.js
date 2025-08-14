import React, { Component } from 'react'
import { View, ScrollView, Text, Animated as Anim, Dimensions } from 'react-native'
import Color, { colorYiq } from '../tools/Color'
import Fa from '@react-native-vector-icons/fontawesome5'
const { width, height } = Dimensions.get('window')

export default class SliderButton extends Component {
  scrollRef = React.createRef()
  constructor() {
    super()
    this.state = {
      scrollLastest: width - 30,
      opacity: new Anim.Value(0)
    }
  }

  componentDidUpdate() {
    if(this.props.status === 'ready')  {
      this.scrollRef.current.scrollTo({
        x: width - 30,
        y: 0,
        animated: true
      })
    } else {
      this.scrollRef.current.scrollTo({
        x: 0,
        y: 0,
        animated: true
      })
    }
  }

  onScrollEndDrag = (event) => {
    let offsetX = event.nativeEvent.contentOffset.x
    if (offsetX <= (width - 30) / 2) {
      this.props.onTrigger && this.props.onTrigger()
    } else {
      this.scrollRef.current.scrollTo({
        x: width - 30,
        y: 0,
        animated: true
      })
    }
  }

  _onLayout = () => {
    setTimeout(function () {
      this.scrollRef.current.scrollTo({
        x: width - 30,
        y: 0,
        animated: true
      })
    }.bind(this), 500)
  }

  render() {
    return (
      <View
        style={{ padding: 15, backgroundColor: Color.white }}
      >
        {/* {
          this.props.slided ?
            <View
              style={{ height: 40, borderRadius: 4, backgroundColor: Color.grayLight }}
            >
              <View style={{ flex: 1, backgroundColor: Color.yellow, alignItems: 'flex-end' }}>
                  <View style={{ height: 40, width: 50, alignItems: 'center', justifyContent: 'center', borderTopRightRadius: 4, borderBottomRightRadius: 4 }}>
                    <Fa iconStyle='solid' size={20} color={colorYiq(Color.yellow)} name='angle-double-right' />
                  </View>
                </View>
            </View> */}
        <View
          style={{ height: 40, borderRadius: 4, overflow: 'hidden', backgroundColor: Color.grayLight }}
          onLayout={this._onLayout}
        >
          {/* <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingLeft: 50, paddingRight: 10, justifyContent: 'center', alignItems: 'center' }}>
            <Text numberOfLines={1}>{this.props.title}</Text>
          </View> */}
          <ScrollView
            showsHorizontalScrollIndicator={false}
            scrollEnabled={this.props.status !== 'ready' ? false : true}
            ref={this.scrollRef}
            horizontal
            onScrollEndDrag={this.onScrollEndDrag}
          >
            <View style={{ height: 40, width: width - 30, backgroundColor: Color.yellow, alignItems: 'flex-end' }}>
              <View style={{ height: 40, width: 50, alignItems: 'center', justifyContent: 'center', borderTopRightRadius: 4, borderBottomRightRadius: 4 }}>
                <Fa iconStyle='solid' size={20} color={colorYiq(Color.yellow)} name='angle-double-right' />
              </View>
            </View>
            <View style={{ width: width - 30 - 50, backgroundColor: Color.grayLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text numberOfLines={1}>{this.props.title}</Text>
            </View>
          </ScrollView>
        </View>
        {/* } */}
      </View>
    )
  }
}