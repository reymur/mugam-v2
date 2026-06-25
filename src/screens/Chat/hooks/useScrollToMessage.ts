import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';

export function useScrollToMessage() {
  const msgRefs = useRef<Record<string, any>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);

  function scrollToMessage(
    id: string,
    scrollRef: React.RefObject<any>,
    inputRef?: React.RefObject<any>,
  ) {
    const ref = msgRefs.current[id];
    if (!ref || !scrollRef.current) return;

    const doScroll = () => {
      ref.measureLayout(
        scrollRef.current,
        (_x: number, y: number) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
          setHighlightId(id);
          setTimeout(() => setHighlightId(null), 1500);
        },
        () => {},
      );
    };

    if (inputRef?.current) {
      inputRef.current.blur();
      let done = false;
      const sub = Keyboard.addListener('keyboardDidHide', () => {
        if (done) return;
        done = true;
        sub.remove();
        doScroll();
      });
      setTimeout(() => {
        if (done) return;
        done = true;
        sub.remove();
        doScroll();
      }, 600);
    } else {
      doScroll();
    }
  }

  return { msgRefs, highlightId, scrollToMessage };
}
