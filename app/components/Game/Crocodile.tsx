
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './crocodile.module.css';

interface CrocodileProps {
    className?: string;
    selected?: boolean;
}

export function Crocodile({ className, selected = false }: CrocodileProps) {
    return (
        <div className={cn(styles.stage, className, selected && styles.selected)}>
            <div className={styles.crocRig}>

                <div className={styles.shadow}></div>

                {/* TAIL */}
                <div className={styles.tail}>
                    <div className={styles.spikesTail}></div>
                </div>

                {/* LEGS BACK */}
                <div className={cn(styles.leg, styles.legBackLeft)}></div>
                <div className={cn(styles.leg, styles.legBackRight)}></div>

                {/* BODY */}
                <div className={styles.body}>
                    <div className={styles.belly}></div>
                    <div className={styles.spikesBody}></div>
                </div>

                {/* LEGS FRONT */}
                <div className={cn(styles.leg, styles.legFrontLeft)}></div>
                <div className={cn(styles.leg, styles.legFrontRight)}></div>

                {/* HEAD */}
                <div className={styles.headGroup}>
                    <div className={styles.neck}></div>

                    <div className={styles.headBase}>
                        <div className={styles.cranium}></div>
                        {/* EYES */}
                        <div className={styles.eyeRidgeLeft}>
                            <div className={styles.eye}><div className={styles.pupil}></div></div>
                        </div>
                        <div className={styles.eyeRidgeRight}>
                            <div className={styles.eye}><div className={styles.pupil}></div></div>
                        </div>
                    </div>

                    {/* UPPER JAW */}
                    <div className={styles.jawUpper}>
                        <div className={styles.nostrils}></div>
                        <div className={styles.teethUpper}>
                            <div className={styles.tooth}></div>
                            <div className={styles.tooth}></div>
                            <div className={styles.tooth}></div>
                        </div>
                    </div>

                    {/* LOWER JAW */}
                    <div className={styles.jawLower}>
                        <div className={styles.teethLower}>
                            <div className={styles.tooth}></div>
                            <div className={styles.tooth}></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
