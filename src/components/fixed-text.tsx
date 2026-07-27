import {
  Platform,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import {
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useRef,
} from 'react';

import { KeyboardScrollContext } from '@/components/keyboard-aware-scroll-view';

const nativeScaleProps = Platform.OS === 'web'
  ? {}
  : { allowFontScaling: false, maxFontSizeMultiplier: 1 };

type TextInputFocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];

export function Text(props: TextProps) {
  return <NativeText {...props} {...nativeScaleProps} />;
}

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput(
  { onFocus, ...props },
  forwardedRef,
) {
  const inputRef = useRef<NativeTextInput | null>(null);
  const keyboardScroll = useContext(KeyboardScrollContext);

  useImperativeHandle(forwardedRef, () => inputRef.current as NativeTextInput);

  const scrollWebInputIntoView = useCallback((event: TextInputFocusEvent) => {
    if (Platform.OS !== 'web') return;
    const target = (event as unknown as {
      target?: { scrollIntoView?: (options?: ScrollIntoViewOptions) => void };
    }).target;
    if (!target?.scrollIntoView) return;

    const scroll = () => target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    requestAnimationFrame(scroll);
    setTimeout(scroll, 220);
    setTimeout(scroll, 450);
  }, []);

  const handleFocus = useCallback((event: TextInputFocusEvent) => {
    onFocus?.(event);
    keyboardScroll?.ensureInputVisible(inputRef.current);
    scrollWebInputIntoView(event);
  }, [keyboardScroll, onFocus, scrollWebInputIntoView]);

  return (
    <NativeTextInput
      {...props}
      {...nativeScaleProps}
      ref={inputRef}
      onFocus={handleFocus}
    />
  );
});
