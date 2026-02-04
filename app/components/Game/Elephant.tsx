
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './elephant.module.css';

interface ElephantProps {
    className?: string;
    selected?: boolean;
}

export function Elephant({ className, selected = false }: ElephantProps) {
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

    // Generate trunk slices
    const trunkSlices = Array.from({ length: 20 }, (_, i) => (
        <div
            key={i}
            className={cn(styles.trunkSlice, i === 19 && styles.trunkTip)}
            style={{ '--i': i } as React.CSSProperties}
        />
    ));

    return (
        <div className={cn(styles.scene, className)}>
            <div className={cn(styles.elephant, animationClass)}>

                {/* EARS */}
                <div className={cn(styles.earGroup, styles.earLeft)}>
                    <div className={styles.earOuter}>
                        <div className={styles.earInner}></div>
                    </div>
                </div>
                <div className={cn(styles.earGroup, styles.earRight)}>
                    <div className={styles.earOuter}>
                        <div className={styles.earInner}></div>
                    </div>
                </div>

                {/* BACK LEGS */}
                <div className={cn(styles.leg, styles.backLeft)}>
                    <div className={styles.legUpper}></div>
                    <div className={styles.legFoot}>
                        <div className={styles.toenails}>
                            <div className={styles.nail}></div>
                            <div className={styles.nail}></div>
                            <div className={styles.nail}></div>
                        </div>
                    </div>
                </div>
                <div className={cn(styles.leg, styles.backRight)}>
                    <div className={styles.legUpper}></div>
                    <div className={styles.legFoot}>
                        <div className={styles.toenails}>
                            <div className={styles.nail}></div>
                            <div className={styles.nail}></div>
                            <div className={styles.nail}></div>
                        </div>
                    </div>
                </div>

                {/* BODY */}
                <div className={styles.bodyGroup}>
                    <div className={styles.bodyShape}></div>
                    <div className={styles.bodyHighlight}></div>
                </div>

                {/* FRONT LEGS */}
                <div className={cn(styles.leg, styles.frontLeft)}>
                    <div className={styles.legUpper}></div>
                    <div className={styles.legFoot}>
                        <div className={styles.toenails}>
                            <div className={styles.nail}></div>
                            <div className={styles.nail}></div>
                            <div className={styles.nail}></div>
                        </div>
                    </div>
                </div>
                <div className={cn(styles.leg, styles.frontRight)}>
                    <div className={styles.legUpper}></div>
                    <div className={styles.legFoot}>
                        <div className={styles.toenails}>
                            <div className={styles.nail}></div>
                            <div className={styles.nail}></div>
                            <div className={styles.nail}></div>
                        </div>
                    </div>
                </div>

                {/* HEAD */}
                <div className={styles.headGroup}>
                    <div className={styles.hairTuft}></div>
                    <div className={styles.headShape}></div>
                    <div className={styles.headGloss}></div>

                    <div className={cn(styles.eye, styles.eyeLeft)}></div>
                    <div className={cn(styles.eye, styles.eyeRight)}></div>
                    <div className={cn(styles.cheek, styles.cheekLeft)}></div>
                    <div className={cn(styles.cheek, styles.cheekRight)}></div>

                    {/* 20-SLICE TRUNK */}
                    <div className={styles.trunkSpine}>
                        {trunkSlices}
                    </div>
                </div>

            </div>
            <div className={styles.shadow}></div>
        </div>
    );
}
