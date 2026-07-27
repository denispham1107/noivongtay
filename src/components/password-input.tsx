import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { TextInput } from '@/components/fixed-text';
import { Colors } from '@/constants/brand';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'>;

export function PasswordInput({ style, ...props }: PasswordInputProps) {
  const inputRef = useRef<NativeTextInput>(null);
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible((current) => !current);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        {...props}
        ref={inputRef}
        secureTextEntry={!isVisible}
        style={[style, styles.input]}
      />
      <Pressable
        accessibilityHint="Nhấn để thay đổi chế độ hiển thị mật khẩu"
        accessibilityLabel={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        accessibilityRole="button"
        hitSlop={8}
        onPress={toggleVisibility}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <View style={styles.eye}>
          <View style={styles.pupil} />
          {!isVisible && <View style={styles.slash} />}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    paddingRight: 54,
  },
  button: {
    position: 'absolute',
    right: 7,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: Colors.primarySoft,
  },
  eye: {
    width: 23,
    height: 15,
    borderWidth: 2,
    borderColor: Colors.primaryDark,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryDark,
  },
  slash: {
    position: 'absolute',
    width: 27,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.muted,
    transform: [{ rotate: '-42deg' }],
  },
});
