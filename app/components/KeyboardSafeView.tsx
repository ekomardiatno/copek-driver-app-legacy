import { JSX, useEffect, useState } from "react";
import { Keyboard, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function KeyboardSafeView({children}: {
  children: JSX.Element | React.ReactNode
}): JSX.Element {
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    const didShow = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const didHide = Keyboard.addListener('keyboardDidHide', e => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    return () => {
      didHide.remove()
      didShow.remove()
    }
  }, [insets.bottom])

  return (
    <View style={{ flex: 1 }}>
      {children}
      <View style={{ height: keyboardHeight }} />
    </View>
  ) 
}