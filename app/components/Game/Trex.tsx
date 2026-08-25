
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './trex.module.css';

interface TrexProps {
    className?: string;
    /** One-shot animation trigger: 'in' on select, 'out' on deselect. */
    pulse?: 'in' | 'out' | null;
}

export function Trex({ className, pulse = null }: TrexProps) {
    const animationClass =
        pulse === 'in' ? styles.selected :
            pulse === 'out' ? styles.unselected : '';

    return (
        <div className={cn(styles.stage, className)}>
            <div className={cn(styles.dinoRig, animationClass)}>
                {/* Tail */}
                <div className={cn(styles.tail, styles.part)}></div>

                {/* Back Leg */}
                <div className={cn(styles.legBack, styles.part)}></div>

                {/* Body */}
                <div className={cn(styles.body, styles.part)}>
                    <div className={styles.belly}></div>
                </div>

                {/* Head Group */}
                <div className={styles.headGroup}>
                    <div className={styles.neckJoint}></div>
                    <div className={cn(styles.head, styles.part)}></div>
                    <div className={cn(styles.snout, styles.part)}>
                        <div className={styles.nostril}></div>
                        <div className={styles.mouthCurve}>
                            <div className={styles.tooth}></div>
                        </div>
                    </div>
                    <div className={styles.eye}>
                        <div className={styles.eyelid}></div>
                        <div className={styles.pupil}></div>
                    </div>
                </div>

                {/* Arm */}
                <div className={styles.armWrapper}>
                    <div className={cn(styles.armUpper, styles.part)}></div>
                    <div className={cn(styles.armFore, styles.part)}></div>
                    <div className={cn(styles.armHand, styles.part)}></div>
                    <div className={cn(styles.claw, styles.claw1)}></div>
                    <div className={cn(styles.claw, styles.claw2)}></div>
                </div>

                {/* Front Leg */}
                <div className={styles.legFrontGroup}>
                    <div className={cn(styles.thigh, styles.part)}></div>
                    <div className={cn(styles.foot, styles.part)}>
                        <div className={styles.toes}>
                            <div className={styles.toe}></div>
                            <div className={styles.toe}></div>
                            <div className={styles.toe}></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.shadow}></div>
        </div>
    );
}
