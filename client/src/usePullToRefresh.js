import { useEffect, useRef, useState } from 'react';

export function usePullToRefresh(onRefresh, containerRef) {
    const [pulling, setPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startYRef = useRef(null);
    const THRESHOLD = 70;

    useEffect(() => {
        const el = containerRef?.current || window;

        const onTouchStart = (e) => {
            const scrollTop = containerRef?.current
                ? containerRef.current.scrollTop
                : window.scrollY;
            if (scrollTop === 0) startYRef.current = e.touches[0].clientY;
        };

        const onTouchMove = (e) => {
            if (startYRef.current === null) return;
            const dist = e.touches[0].clientY - startYRef.current;
            if (dist > 0) {
                setPulling(true);
                setPullDistance(Math.min(dist, THRESHOLD * 1.5));
            }
        };

        const onTouchEnd = async () => {
            if (pullDistance >= THRESHOLD) {
                setPullDistance(THRESHOLD);
                await onRefresh();
            }
            setPulling(false);
            setPullDistance(0);
            startYRef.current = null;
        };

        const target = containerRef?.current || window;
        target.addEventListener('touchstart', onTouchStart, { passive: true });
        target.addEventListener('touchmove', onTouchMove, { passive: true });
        target.addEventListener('touchend', onTouchEnd);

        return () => {
            target.removeEventListener('touchstart', onTouchStart);
            target.removeEventListener('touchmove', onTouchMove);
            target.removeEventListener('touchend', onTouchEnd);
        };
    }, [onRefresh, pullDistance, containerRef]);

    return { pulling, pullDistance, threshold: THRESHOLD };
}
