import React, {useEffect, useRef, useState} from 'react';

interface Corners {
    tl: boolean;
    tr: boolean;
    br: boolean;
    bl: boolean;
}

interface Pill {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    corners: Corners;
}

const getRandomColor = (): string => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

const PILL_RADIUS = 20;
const MIN_PILL_SIZE = 40;
const MIN_PART_SIZE = 20;
const DRAG_THRESHOLD = 5;

const PillSplitter: React.FC = () => {
    const [pills, setPills] = useState<Pill[]>([]);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({x: 0, y: 0});
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number }>({x: 0, y: 0});
    const [draggingPill, setDraggingPill] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nextIdRef = useRef<number>(1);
    const blockNextClickRef = useRef<boolean>(false);
    const didDragRef = useRef<boolean>(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setCursorPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === containerRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setIsDrawing(true);
            setStartPos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDrawing && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            const dx = Math.abs(endX - startPos.x);
            const dy = Math.abs(endY - startPos.y);
            if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
                setIsDrawing(false);
                return;
            }
            const width = Math.max(MIN_PILL_SIZE, dx);
            const height = Math.max(MIN_PILL_SIZE, dy);
            const newPill: Pill = {
                id: nextIdRef.current++,
                x: Math.min(startPos.x, endX),
                y: Math.min(startPos.y, endY),
                width,
                height,
                color: getRandomColor(),
                corners: {tl: true, tr: true, br: true, bl: true},
            };
            setPills([...pills, newPill]);
            setIsDrawing(false);
            blockNextClickRef.current = true;
        }
    };

    const splitVertical = (part: Pill, splitX: number): Pill[] => {
        const intersects = splitX > part.x && splitX < part.x + part.width;
        if (!intersects) return [part];

        const leftWidth = splitX - part.x;
        const rightWidth = part.width - leftWidth;

        if (leftWidth >= MIN_PART_SIZE && rightWidth >= MIN_PART_SIZE) {
            const left: Pill = {
                ...part,
                id: nextIdRef.current++,
                width: leftWidth,
                corners: {
                    tl: part.corners.tl,
                    tr: false,
                    br: false,
                    bl: part.corners.bl,
                },
            };
            const right: Pill = {
                ...part,
                id: nextIdRef.current++,
                x: part.x + leftWidth,
                width: rightWidth,
                corners: {
                    tl: false,
                    tr: part.corners.tr,
                    br: part.corners.br,
                    bl: false,
                },
            };
            return [left, right];
        }
        return [part];
    };

    const splitHorizontal = (part: Pill, splitY: number): Pill[] => {
        const intersects = splitY > part.y && splitY < part.y + part.height;
        if (!intersects) return [part];

        const topHeight = splitY - part.y;
        const bottomHeight = part.height - topHeight;

        if (topHeight >= MIN_PART_SIZE && bottomHeight >= MIN_PART_SIZE) {
            const top: Pill = {
                ...part,
                id: nextIdRef.current++,
                height: topHeight,
                corners: {
                    tl: part.corners.tl,
                    tr: part.corners.tr,
                    br: false,
                    bl: false,
                },
            };
            const bottom: Pill = {
                ...part,
                id: nextIdRef.current++,
                y: part.y + topHeight,
                height: bottomHeight,
                corners: {
                    tl: false,
                    tr: false,
                    br: part.corners.br,
                    bl: part.corners.bl,
                },
            };
            return [top, bottom];
        }

        return [part];
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            if (blockNextClickRef.current) {
                blockNextClickRef.current = false;
                return;
            }
            const result: Pill[] = [];
            for (const pill of pills) {
                let parts: Pill[] = [pill];
                const beforeCount = parts.length;
                parts = parts.flatMap((p) => splitVertical(p, cursorPos.x));
                parts = parts.flatMap((p) => splitHorizontal(p, cursorPos.y));
                const afterCount = parts.length;

                if (afterCount === beforeCount) {
                    const iv = cursorPos.x > pill.x && cursorPos.x < pill.x + pill.width;
                    const ih = cursorPos.y > pill.y && cursorPos.y < pill.y + pill.height;
                    if (iv || ih) {
                        let dx = 0;
                        let dy = 0;
                        if (iv) {
                            const centerX = pill.x + pill.width / 2;
                            dx = cursorPos.x < centerX ? -10 : 10;
                        }
                        if (ih) {
                            const centerY = pill.y + pill.height / 2;
                            dy = cursorPos.y < centerY ? -10 : 10;
                        }
                        result.push({...pill, x: pill.x + dx, y: pill.y + dy});
                    } else {
                        result.push(...parts);
                    }
                } else {
                    result.push(...parts);
                }
            }
            setPills(result);
        }
    };

    const handlePillMouseDown = (e: React.MouseEvent<HTMLDivElement>, pill: Pill) => {
        setDraggingPill(pill.id);
        didDragRef.current = false;
    };

    const handlePillMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (draggingPill !== null) {
            const newPills = pills.map((pill) => {
                if (pill.id === draggingPill) {
                    if (e.movementX !== 0 || e.movementY !== 0) didDragRef.current = true;
                    return {
                        ...pill,
                        x: pill.x + e.movementX,
                        y: pill.y + e.movementY,
                    };
                }
                return pill;
            });
            setPills(newPills);
        }
    };

    const handlePillMouseUp = () => {
        setDraggingPill(null);
        if (didDragRef.current) {
            blockNextClickRef.current = true;
            didDragRef.current = false;
        }
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full  relative shadow-lg"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            onMouseMove={handlePillMouseMove}
        >
            <div
                className="absolute bg-slate-600 opacity-40 pointer-events-none"
                style={{left: cursorPos.x, top: 0, width: '2px', height: '100%'}}
            />
            <div
                className="absolute bg-slate-600 opacity-40 pointer-events-none"
                style={{top: cursorPos.y, left: 0, height: '2px', width: '100%'}}
            />

            {isDrawing && (
                <div
                    className="absolute border-2 border-dashed border-gray-500 rounded-[20px] pointer-events-none"
                    style={{
                        left: Math.min(startPos.x, cursorPos.x),
                        top: Math.min(startPos.y, cursorPos.y),
                        width: Math.max(MIN_PILL_SIZE, Math.abs(cursorPos.x - startPos.x)),
                        height: Math.max(MIN_PILL_SIZE, Math.abs(cursorPos.y - startPos.y)),
                    }}
                />
            )}

            {pills.map((pill) => (
                <div
                    key={pill.id}
                    className="absolute border-[3px] border-black cursor-move"
                    style={{
                        left: pill.x,
                        top: pill.y,
                        width: pill.width,
                        height: pill.height,
                        backgroundColor: pill.color,
                        borderTopLeftRadius: pill.corners.tl ? PILL_RADIUS : 0,
                        borderTopRightRadius: pill.corners.tr ? PILL_RADIUS : 0,
                        borderBottomRightRadius: pill.corners.br ? PILL_RADIUS : 0,
                        borderBottomLeftRadius: pill.corners.bl ? PILL_RADIUS : 0,
                    }}
                    onMouseDown={(e) => handlePillMouseDown(e, pill)}
                    onMouseUp={handlePillMouseUp}
                />
            ))}
        </div>
    );
};

export default PillSplitter;