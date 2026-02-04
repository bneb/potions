
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './dragon.module.css';

interface DragonProps {
    className?: string;
    selected?: boolean;
}

export function Dragon({ className, selected = false }: DragonProps) {
    const [animationState, setAnimationState] = useState<'idle' | 'selecting' | 'deselecting'>('idle');
    const prevSelectedRef = useRef(selected);
    const hasMountedRef = useRef(false);

    useEffect(() => {
        hasMountedRef.current = true;
    }, []);

    useEffect(() => {
        if (!hasMountedRef.current) return;

        const wasSelected = prevSelectedRef.current;
        prevSelectedRef.current = selected;

        if (selected && !wasSelected) {
            setAnimationState('selecting');
        } else if (!selected && wasSelected) {
            setAnimationState('deselecting');
        }
    }, [selected]);

    const animationClass =
        animationState === 'selecting' ? styles.selected :
            animationState === 'deselecting' ? styles.unselected : '';

    return (
        <div className={cn(styles.scene, className)}>
            <div className={cn(styles.dragon, animationClass)}>

                {/* Left Wing (Back) */}
                <div className={cn(styles.wing, styles.wingLeft)}>
                    <div className={styles.wingShape}></div>
                </div>

                {/* Tail */}
                <div className={styles.tailGroup}>
                    <div className={cn(styles.tailSegment, styles.t1)}>
                        <div className={styles.spike}></div>
                    </div>
                    <div className={cn(styles.tailSegment, styles.t2)}>
                        <div className={styles.spike}></div>
                    </div>
                    <div className={cn(styles.tailSegment, styles.t3)}>
                        <div className={styles.spike}></div>
                    </div>
                    <div className={cn(styles.tailSegment, styles.t4)}>
                        <div className={styles.spike}></div>
                    </div>
                    <div className={cn(styles.tailSegment, styles.t5)}></div>
                </div>

                {/* Back Legs */}
                <div className={cn(styles.leg, styles.backLeft)}>
                    <div className={styles.legFoot}>
                        <div className={styles.claw} style={{ left: '3px' }}></div>
                        <div className={styles.claw} style={{ left: '12px' }}></div>
                        <div className={styles.claw} style={{ left: '21px' }}></div>
                    </div>
                </div>
                <div className={cn(styles.leg, styles.backRight)}>
                    <div className={styles.legFoot}>
                        <div className={styles.claw} style={{ left: '3px' }}></div>
                        <div className={styles.claw} style={{ left: '12px' }}></div>
                        <div className={styles.claw} style={{ left: '21px' }}></div>
                    </div>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    <div className={styles.belly}>
                        <div className={styles.bellyStripe}></div>
                        <div className={styles.bellyStripe}></div>
                        <div className={styles.bellyStripe}></div>
                        <div className={styles.bellyStripe}></div>
                    </div>
                </div>

                {/* Front Legs */}
                <div className={cn(styles.leg, styles.frontLeft)}>
                    <div className={styles.legFoot}>
                        <div className={styles.claw} style={{ left: '3px' }}></div>
                        <div className={styles.claw} style={{ left: '12px' }}></div>
                        <div className={styles.claw} style={{ left: '21px' }}></div>
                    </div>
                </div>
                <div className={cn(styles.leg, styles.frontRight)}>
                    <div className={styles.legFoot}>
                        <div className={styles.claw} style={{ left: '3px' }}></div>
                        <div className={styles.claw} style={{ left: '12px' }}></div>
                        <div className={styles.claw} style={{ left: '21px' }}></div>
                    </div>
                </div>

                {/* Right Wing (Front) */}
                <div className={cn(styles.wing, styles.wingRight)}>
                    <div className={styles.wingShape}></div>
                </div>

                {/* Head */}
                <div className={styles.headGroup}>
                    {/* Ear Frills */}
                    <div className={cn(styles.earFrill, styles.earFrillLeft)}></div>
                    <div className={cn(styles.earFrill, styles.earFrillRight)}></div>

                    {/* Main Head */}
                    <div className={styles.headShape}></div>

                    {/* Tiger Stripes */}
                    <div className={styles.stripe}></div>
                    <div className={cn(styles.stripe, styles.stripe2)}></div>

                    {/* Horns */}
                    <div className={cn(styles.horn, styles.hornLeft)}></div>
                    <div className={cn(styles.horn, styles.hornRight)}></div>

                    {/* Eyes */}
                    <div className={cn(styles.eye, styles.eyeLeft)}></div>
                    <div className={cn(styles.eye, styles.eyeRight)}></div>

                    {/* Snout */}
                    <div className={styles.snout}>
                        <div className={cn(styles.nostril, styles.nostrilLeft)}></div>
                        <div className={cn(styles.smoke, styles.smoke1)}></div>
                        <div className={cn(styles.nostril, styles.nostrilRight)}></div>
                        <div className={cn(styles.smoke, styles.smoke2)}></div>
                    </div>

                    {/* Fire Breathing Effect */}
                    <div className={styles.fireContainer}>
                        <div className={cn(styles.flame, styles.flameGlow)}></div>
                        <div className={cn(styles.flame, styles.flameOuter)}></div>
                        <div className={cn(styles.flame, styles.flameCore)}></div>
                        <div className={cn(styles.ember, styles.ember1)} style={{ '--drift': '-15px' } as React.CSSProperties}></div>
                        <div className={cn(styles.ember, styles.ember2)} style={{ '--drift': '5px' } as React.CSSProperties}></div>
                        <div className={cn(styles.ember, styles.ember3)} style={{ '--drift': '20px' } as React.CSSProperties}></div>
                        <div className={cn(styles.ember, styles.ember4)} style={{ '--drift': '-8px' } as React.CSSProperties}></div>
                        <div className={cn(styles.ember, styles.ember5)} style={{ '--drift': '12px' } as React.CSSProperties}></div>
                    </div>
                </div>

            </div>
            <div className={styles.shadow}></div>
        </div>
    );
}
