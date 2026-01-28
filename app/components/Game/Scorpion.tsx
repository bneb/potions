
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './scorpion.module.css';

interface ScorpionProps {
    className?: string;
    selected?: boolean;
}

export function Scorpion({ className, selected = false }: ScorpionProps) {
    return (
        <div className={cn(styles.stage, className, selected && styles.selected)}>
            <div className={styles.scorpRig}>

                <div className={styles.shadow}></div>

                {/* TAIL */}
                <div className={styles.tailGroup}>
                    <div className={cn(styles.segment, styles.seg1)}></div>
                    <div className={cn(styles.segment, styles.seg2)}></div>
                    <div className={cn(styles.segment, styles.seg3)}></div>
                    <div className={cn(styles.segment, styles.seg4)}></div>
                    <div className={styles.stingerBase}>
                        <div className={styles.stingerTip}></div>
                    </div>
                </div>

                {/* LEGS - Multi-Segmented */}
                <div className={styles.legsLeft}>
                    <div className={cn(styles.leg, styles.legL1)}>
                        <div className={styles.legUpper}></div>
                        <div className={styles.legLower}></div>
                    </div>
                    <div className={cn(styles.leg, styles.legL2)}>
                        <div className={styles.legUpper}></div>
                        <div className={styles.legLower}></div>
                    </div>
                    <div className={cn(styles.leg, styles.legL3)}>
                        <div className={styles.legUpper}></div>
                        <div className={styles.legLower}></div>
                    </div>
                </div>
                <div className={styles.legsRight}>
                    <div className={cn(styles.leg, styles.legR1)}>
                        <div className={styles.legUpper}></div>
                        <div className={styles.legLower}></div>
                    </div>
                    <div className={cn(styles.leg, styles.legR2)}>
                        <div className={styles.legUpper}></div>
                        <div className={styles.legLower}></div>
                    </div>
                    <div className={cn(styles.leg, styles.legR3)}>
                        <div className={styles.legUpper}></div>
                        <div className={styles.legLower}></div>
                    </div>
                </div>

                {/* CLAWS - Big and Pink */}
                <div className={cn(styles.arm, styles.armL)}>
                    <div className={styles.clawGroup}>
                        <div className={styles.clawFixed}></div>
                        <div className={styles.clawThumb}></div>
                    </div>
                </div>
                <div className={cn(styles.arm, styles.armR)}>
                    <div className={styles.clawGroup}>
                        <div className={styles.clawFixed}></div>
                        <div className={styles.clawThumb}></div>
                    </div>
                </div>

                {/* BODY / HEAD */}
                <div className={styles.body}>
                    {/* Face */}
                    <div className={styles.face}>
                        <div className={styles.eyeRidge}>
                            <div className={cn(styles.eye, styles.eyeL)}>
                                <div className={styles.pupil}></div>
                                <div className={styles.highlight}></div>
                            </div>
                            <div className={cn(styles.eye, styles.eyeR)}>
                                <div className={styles.pupil}></div>
                                <div className={styles.highlight}></div>
                            </div>
                        </div>
                        <div className={styles.blushL}></div>
                        <div className={styles.blushR}></div>
                        <div className={styles.mouth}></div>
                    </div>
                </div>

            </div>
        </div>
    );
}
