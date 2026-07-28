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
type WebTextInputElement = HTMLElement & {
  scrollIntoView(options?: ScrollIntoViewOptions): void;
};

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

  const revealWebInputAfterKeyboard = useCallback((event: TextInputFocusEvent) => {
    if (Platform.OS !== 'web') return;
    const target = (event as unknown as {
      target?: WebTextInputElement;
    }).target;
    if (!target?.scrollIntoView || typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    const revealIfCovered = () => {
      if (document.activeElement !== target) return;

      const rect = target.getBoundingClientRect();
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const safeGap = 24;

      if (rect.top < viewportTop + safeGap || rect.bottom > viewportBottom - safeGap) {
        target.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    };

    let fallbackTimer: ReturnType<typeof setTimeout>;
    const handleKeyboardViewportChange = () => {
      viewport?.removeEventListener('resize', handleKeyboardViewportChange);
      clearTimeout(fallbackTimer);
      requestAnimationFrame(revealIfCovered);
      setTimeout(revealIfCovered, 120);
    };

    viewport?.addEventListener('resize', handleKeyboardViewportChange);
    fallbackTimer = setTimeout(() => {
      viewport?.removeEventListener('resize', handleKeyboardViewportChange);
      revealIfCovered();
    }, 650);
  }, []);

  const handleFocus = useCallback((event: TextInputFocusEvent) => {
    onFocus?.(event);
    keyboardScroll?.ensureInputVisible(inputRef.current);
    revealWebInputAfterKeyboard(event);
  }, [keyboardScroll, onFocus, revealWebInputAfterKeyboard]);

  return (
    <NativeTextInput
      {...props}
      {...nativeScaleProps}
      ref={inputRef}
      onFocus={handleFocus}
    />
  );
});
