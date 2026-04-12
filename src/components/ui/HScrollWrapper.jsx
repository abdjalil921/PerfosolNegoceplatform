import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * HScrollWrapper – Fixed viewport-bottom scrollbar
 *
 * Renders a ghost scrollbar via a React Portal directly into <body>,
 * bypassing any ancestor overflow:hidden constraints.
 *
 * - Appears at the bottom of the visible screen whenever the table
 *   is in view AND wider than its container.
 * - Follows the user as they scroll the page.
 * - Automatically mirrors width and scroll position of the real table.
 * - Hides the native bottom scrollbar so only one scrollbar is visible.
 */
export default function HScrollWrapper({ children }) {
    const tableRef = useRef(null);   // the real overflow-x-auto wrapper
    const barRef   = useRef(null);   // the fixed ghost scrollbar element
    const innerRef = useRef(null);   // phantom div whose width drives the ghost thumb

    useEffect(() => {
        /* ── Inject CSS once to hide the native scrollbar on the table ── */
        if (!document.getElementById('hscroll-css')) {
            const s = document.createElement('style');
            s.id = 'hscroll-css';
            s.textContent = [
                '.hscroll-table::-webkit-scrollbar{display:none}',
                '.hscroll-table{-ms-overflow-style:none;scrollbar-width:none}',
            ].join('');
            document.head.appendChild(s);
        }

        const table = tableRef.current;
        const bar   = barRef.current;
        const inner = innerRef.current;
        if (!table || !bar || !inner) return;

        let raf = null;

        /* Recompute visibility + position of the fixed bar */
        const update = () => {
            const rect      = table.getBoundingClientRect();
            const overflows = table.scrollWidth > table.clientWidth + 1;
            const inView    = rect.top < window.innerHeight && rect.bottom > 20;

            if (overflows && inView) {
                inner.style.width  = table.scrollWidth + 'px';
                bar.style.display  = 'block';
                bar.style.left     = rect.left + 'px';
                bar.style.width    = rect.width + 'px';
                /* Keep thumb in sync when bar reappears */
                bar.scrollLeft = table.scrollLeft;
            } else {
                bar.style.display = 'none';
            }
        };

        const schedule = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(update);
        };

        /* Two-way sync */
        const onBar   = () => { table.scrollLeft = bar.scrollLeft; };
        const onTable = () => {
            if (bar.style.display !== 'none') bar.scrollLeft = table.scrollLeft;
        };

        bar.addEventListener('scroll',    onBar,     { passive: true });
        table.addEventListener('scroll',  onTable,   { passive: true });
        window.addEventListener('scroll', schedule,  { passive: true });
        window.addEventListener('resize', schedule,  { passive: true });

        update(); /* initial call */

        const ro = new ResizeObserver(schedule);
        ro.observe(table);

        return () => {
            if (raf) cancelAnimationFrame(raf);
            bar.removeEventListener('scroll',    onBar);
            table.removeEventListener('scroll',  onTable);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            ro.disconnect();
        };
    }, []);

    return (
        <>
            {/* Real table wrapper — native scrollbar hidden via CSS */}
            <div ref={tableRef} className="hscroll-table overflow-x-auto">
                {children}
            </div>

            {/* Ghost scrollbar rendered directly into <body> via Portal */}
            {createPortal(
                <div
                    ref={barRef}
                    style={{
                        position:   'fixed',
                        bottom:     0,
                        height:     16,
                        overflowX:  'auto',
                        overflowY:  'hidden',
                        background: '#ffffff',
                        borderTop:  '1px solid #e5e7eb',
                        zIndex:     999,
                        display:    'none',
                    }}
                >
                    <div ref={innerRef} style={{ height: 1 }} />
                </div>,
                document.body
            )}
        </>
    );
}
