import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
} from 'react-native-reanimated';

const SCROLL_THRESHOLD = 12;

export function useScrollHeader(headerHeight: number) {
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;

      // Always show header when at top
      if (y <= 0) {
        headerTranslateY.value = withTiming(0, { duration: 250 });
        lastScrollY.value = y;
        scrollY.value = y;
        return;
      }

      const delta = y - lastScrollY.value;

      if (delta > SCROLL_THRESHOLD) {
        // Scrolling down — hide header
        headerTranslateY.value = withTiming(-headerHeight, { duration: 250 });
        lastScrollY.value = y;
      } else if (delta < -SCROLL_THRESHOLD) {
        // Scrolling up — show header
        headerTranslateY.value = withTiming(0, { duration: 250 });
        lastScrollY.value = y;
      }

      scrollY.value = y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  return { scrollHandler, headerAnimatedStyle };
}
