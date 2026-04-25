import { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';

const Keywords=[
    '人生觀',
    '座右銘',
    '信仰',
    '崇拜',
    '與神秘力量的連結',
    '人生經驗',
    '故事',
    '流行文化',
    '潮',
    '藝術',
    '個人風格',
    '不怕痛的人',
    '鐵板燒師傅',
    '「小美，我愛你」的愛情誓言',
    '罪犯的在案紀錄',
    '「精忠報國」的決心',
    '硬漢',
    '兄弟本色',
    '尊榮',
    '責任',
    '身分認同'
];

const IntroTattooCount=23;

// Colors inspired by the image
const colors = ['#E62CB5', '#99E120'];

const ItemSizeRange = [20, 30]; // px
const ItemDurationRange = [5000, 10000]; // ms
const ImageSizeRange = [60, 120]; // px
const ImageDurationRange = [5000, 10000]; // ms

const MoveOffsetRange = 20; // px

const FloatCount= 8;
const AddIntervalRange = [800, 1000]; // ms

export default function Intro(){
    const [floatingItems, setFloatingItems] = useState([]);
    const itemRefs = useRef({});

    const getRandomPosition = () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
    });

    const getRandomFloatAnimation = () => ({
        moveX1: (Math.random() - 0.5) * MoveOffsetRange * 2, // -100px to 100px
        moveY1: (Math.random() - 0.5) * MoveOffsetRange * 2, // -100px to 100px
        moveX2: (Math.random() - 0.5) * MoveOffsetRange * 2, // -100px to 100px
        moveY2: (Math.random() - 0.5) * MoveOffsetRange * 2, // -100px to 100px
        duration: 2000 + Math.random() * 4000, // 2-6 seconds
        delay: Math.random() * 1000, // 0-1 second delay
    });

    const getRandomItem = () => {
        const isImage = Math.random() > 0.5;
        const floatAnim = getRandomFloatAnimation();
        
        if (isImage) {
            const imageIndex = Math.floor(Math.random() * IntroTattooCount) + 1;
            return {
                id: Date.now() + Math.random(),
                type: 'image',
                content: `/tattoos/intro/${imageIndex}.svg`,
                ...getRandomPosition(),
                color: colors[Math.floor(Math.random() * colors.length)],
                duration: ImageDurationRange[0] + Math.random() * (ImageDurationRange[1] - ImageDurationRange[0]),
                size: ImageSizeRange[0] + Math.random() * (ImageSizeRange[1] - ImageSizeRange[0]),
                floatAnimation: floatAnim,
            };
        } else {
            return {
                id: Date.now() + Math.random(),
                type: 'text',
                content: Keywords[Math.floor(Math.random() * Keywords.length)],
                ...getRandomPosition(),
                color: colors[Math.floor(Math.random() * colors.length)],
                duration: ItemDurationRange[0] + Math.random() * (ItemDurationRange[1] - ItemDurationRange[0]),
                size: ItemSizeRange[0] + Math.random() * (ItemSizeRange[1] - ItemSizeRange[0]),
                floatAnimation: floatAnim,
            };
        }
    };

    const animateItem = (element, item) => {
        const tl = gsap.timeline();
        
        // Set initial state
        gsap.set(element, {
            opacity: 0,
            scale: 0.8,
            y: 0,
            x: 0
        });
        
        // Animation sequence
        tl.to(element, {
            opacity: 1,
            x: item.floatAnimation.moveX1,
            y: item.floatAnimation.moveY1,
            transformOrigin: 'center center',
            scale:1,
            duration: 0.5 * (item.duration / 1000),
            ease: "power4.inOut"
        })
        .to(element, {
            opacity: 0,
            scale: 0.8,
            transformOrigin: 'center center',
            x: item.floatAnimation.moveX2,
            y: item.floatAnimation.moveY2,
            duration: 0.5 * (item.duration / 1000),
            ease: "power4.inOut"
        });
        
        return tl;
    };

    const addFloatingItem = useCallback(() => {
        const newItem = getRandomItem();
        setFloatingItems(prev => [...prev, newItem]);
        
        // Remove item after its duration
        setTimeout(() => {
            if (itemRefs.current[newItem.id]) {
                delete itemRefs.current[newItem.id];
            }
            setFloatingItems(prev => prev.filter(item => item.id !== newItem.id));
        }, newItem.duration);
    }, []);

    useEffect(() => {
        // Add initial items
        for (let i = 0; i < FloatCount; i++) {
            setTimeout(() => addFloatingItem(), i * 200);
        }

        // Continuously add new items
        const interval = setInterval(() => {
            addFloatingItem();
        }, AddIntervalRange[0] + Math.random() * (AddIntervalRange[1] - AddIntervalRange[0])); // Every 0.8-2 seconds

        return () => clearInterval(interval);
    }, [addFloatingItem]);

    useEffect(() => {
        const handleResize = () => {
            // Update positions on resize if needed
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Animate items when they're added
    useEffect(() => {
        floatingItems.forEach(item => {
            if (itemRefs.current[item.id] && !itemRefs.current[item.id].animated) {
                const element = itemRefs.current[item.id];
                element.animated = true;
                
                // Start animation with delay
                gsap.delayedCall(item.floatAnimation.delay / 1000, () => {
                    animateItem(element, item);
                });
            }
        });
    }, [floatingItems]);

    return (
        <div className="intro-text fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            {floatingItems.map(item => (
                <div
                    key={item.id}
                    ref={el => {
                        if (el) {
                            itemRefs.current[item.id] = el;
                        }
                    }}
                    className="floating-item"
                    style={{
                        position: 'absolute',
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        color: item.color,
                        fontSize: item.type === 'text' ? `${item.size}px` : undefined,
                        width: item.type === 'image' ? `${item.size}px` : 'auto',
                        height: item.type === 'image' ? `${item.size}px` : 'auto',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        zIndex: Math.floor(Math.random() * 100),
                        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
                        fontWeight: 500,
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                        whiteSpace: 'nowrap',
                        opacity: 0,
                    }}
                >
                    {item.type === 'text' ? (
                        <span>{item.content}</span>
                    ) : (
                        <img 
                            src={item.content} 
                            alt="tattoo" 
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}