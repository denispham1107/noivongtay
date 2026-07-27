import {
  Dimensions,
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView as NativeScrollView,
  UIManager,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type KeyboardScrollContextValue = {
  ensureInputVisible: (input: unknown) => void;
};

export const KeyboardScrollContext = createContext<KeyboardScrollContextValue | null>(null);

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  children?: ReactNode;
  keyboardExtraOffset?: number;
};

export const KeyboardAwareScrollView = forwardRef<NativeScrollView, KeyboardAwareScrollViewProps>(
  function KeyboardAwareScrollView(
    {
      children,
      contentContainerStyle,
      keyboardExtraOffset = 28,
      keyboardShouldPersistTaps = 'handled',
      onScroll,
      scrollEventThrottle,
      ...props
    },
    forwardedRef,
  ) {
    const localRef = useRef<NativeScrollView | null>(null);
    const focusedInputRef = useRef<unknown>(null);
    const keyboardTopRef = useRef<number | null>(null);
    const scrollYRef = useRef(0);
    const [keyboardPadding, setKeyboardPadding] = useState(0);

    const setRef = useCallback((instance: NativeScrollView | null) => {
      localRef.current = instance;
      if (typeof forwardedRef === 'function') forwardedRef(instance);
      else if (forwardedRef) forwardedRef.current = instance;
    }, [forwardedRef]);

    const scrollInputAboveKeyboard = useCallback((input = focusedInputRef.current) => {
      if (Platform.OS === 'web') return;
      const inputHandle = findNodeHandle(input as never);
      if (!inputHandle) return;

      UIManager.measureInWindow(inputHandle, (_x, inputY, _width, inputHeight) => {
        const keyboardTop = keyboardTopRef.current;
        if (keyboardTop === null) return;

        const visibleBottom = Math.min(keyboardTop, Dimensions.get('window').height);
        const inputBottom = inputY + inputHeight;
        const hiddenAmount = inputBottom - (visibleBottom - keyboardExtraOffset);
        if (hiddenAmount <= 0) return;

        localRef.current?.scrollTo({
          y: Math.max(0, scrollYRef.current + hiddenAmount + 8),
          animated: true,
        });
      });
    }, [keyboardExtraOffset]);

    const ensureInputVisible = useCallback((input: unknown) => {
      if (Platform.OS === 'web') return;
      focusedInputRef.current = input;

      requestAnimationFrame(() => scrollInputAboveKeyboard(input));
      setTimeout(() => scrollInputAboveKeyboard(input), 220);
      setTimeout(() => scrollInputAboveKeyboard(input), 480);
      setTimeout(() => scrollInputAboveKeyboard(input), 720);
    }, [scrollInputAboveKeyboard]);

    useEffect(() => {
      if (Platform.OS === 'web') return;

      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const frameEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';

      const updateKeyboard = (event: {
        endCoordinates: { height: number; screenY: number };
      }) => {
        keyboardTopRef.current = event.endCoordinates.screenY;
        setKeyboardPadding(Math.max(48, event.endCoordinates.height + keyboardExtraOffset));
        requestAnimationFrame(() => scrollInputAboveKeyboard());
        setTimeout(() => scrollInputAboveKeyboard(), 160);
        setTimeout(() => scrollInputAboveKeyboard(), 380);
      };

      const hideKeyboard = () => {
        keyboardTopRef.current = null;
        setKeyboardPadding(0);
      };

      const subscriptions = [
        Keyboard.addListener(showEvent, updateKeyboard),
        Keyboard.addListener('keyboardDidHide', hideKeyboard),
      ];
      if (showEvent !== 'keyboardDidShow') {
        subscriptions.push(Keyboard.addListener('keyboardDidShow', updateKeyboard));
      }
      if (frameEvent !== showEvent && frameEvent !== 'keyboardDidShow') {
        subscriptions.push(Keyboard.addListener(frameEvent, updateKeyboard));
      }

      return () => subscriptions.forEach((subscription) => subscription.remove());
    }, [keyboardExtraOffset, scrollInputAboveKeyboard]);

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    }, [onScroll]);

    const contextValue = useMemo(() => ({ ensureInputVisible }), [ensureInputVisible]);

    return (
      <KeyboardScrollContext.Provider value={contextValue}>
        <NativeScrollView
          {...props}
          ref={setRef}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={[
            contentContainerStyle,
            keyboardPadding > 0 && { paddingBottom: keyboardPadding },
          ]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle ?? 16}
        >
          {children}
        </NativeScrollView>
      </KeyboardScrollContext.Provider>
    );
  },
);
