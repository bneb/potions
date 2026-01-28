
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './husky.module.css';

interface HuskyProps {
    className?: string;
    selected?: boolean;
}

export function Husky({ className, selected = false }: HuskyProps) {
    return (
        <div className={cn(styles.stage, className, selected && styles.selected)}>
            <div className={styles.huskyRig}>

                <div className={styles.tail}></div>

                <div className={cn(styles.legBack, styles.lbLeft, styles.furGrey)}>
                    <div className={cn(styles.pawBack, styles.pbLeft)}></div>
                </div>
                <div className={cn(styles.legBack, styles.lbRight, styles.furGrey)}>
                    <div className={cn(styles.pawBack, styles.pbRight)}></div>
                </div>

                <div className={cn(styles.body, styles.furGrey)}>
                    <div className={styles.bellyPatch}></div>
                </div>

                <div className={cn(styles.legFront, styles.lfLeft, styles.furGrey)}>
                    <div className={styles.pawFront}></div>
                </div>
                <div className={cn(styles.legFront, styles.lfRight, styles.furGrey)}>
                    <div className={styles.pawFront}></div>
                </div>

                <div className={styles.headGroup}>
                    <div className={cn(styles.ear, styles.earLeft)}>
                        <div className={styles.earInner}></div>
                    </div>
                    <div className={cn(styles.ear, styles.earRight)}>
                        <div className={styles.earInner}></div>
                    </div>

                    <div className={cn(styles.headBase, styles.furGrey)}>
                        <div className={cn(styles.eyePatch, styles.epLeft)}></div>
                        <div className={cn(styles.eyePatch, styles.epRight)}></div>
                        <div className={styles.faceMaskWhite}></div>
                    </div>

                    <div className={cn(styles.eye, styles.eyeL)}>
                        <div className={styles.eyelid}></div>
                        <div className={styles.iris}>
                            <div className={styles.pupil}></div>
                        </div>
                    </div>
                    <div className={cn(styles.eye, styles.eyeR)}>
                        <div className={styles.eyelid}></div>
                        <div className={styles.iris}>
                            <div className={styles.pupil}></div>
                        </div>
                    </div>

                    <div className={cn(styles.snout, styles.furWhite)}>
                        <div className={styles.nose}></div>
                        <div className={styles.mouthLine}></div>
                        <div className={styles.tongue}></div>
                    </div>

                </div>

            </div>

            <div className={styles.shadow}></div>
        </div>
    );
}
