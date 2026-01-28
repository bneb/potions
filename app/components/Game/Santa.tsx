
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './santa.module.css';

interface SantaProps {
    className?: string;
    selected?: boolean;
}

export function Santa({ className, selected = false }: SantaProps) {
    return (
        <div className={cn(styles.stage, className, selected && styles.selected)}>
            <div className={styles.santaRig}>

                {/* Shadow */}
                <div className={styles.shadow}></div>

                {/* Body Group */}
                <div className={styles.bodyGroup}>
                    <div className={styles.coat}>
                        <div className={styles.buttons}>
                            <div className={styles.button}></div>
                            <div className={styles.button}></div>
                        </div>
                    </div>
                    <div className={styles.belt}>
                        <div className={styles.buckle}>
                            <div className={styles.buckleInner}></div>
                        </div>
                    </div>
                </div>

                {/* Limbs - Legs */}
                <div className={cn(styles.leg, styles.lLeft)}>
                    <div className={styles.boot}></div>
                </div>
                <div className={cn(styles.leg, styles.lRight)}>
                    <div className={styles.boot}></div>
                </div>

                {/* Limbs - Arms */}
                <div className={cn(styles.arm, styles.aLeft)}>
                    <div className={styles.sleeve}></div>
                    <div className={styles.mitten}></div>
                </div>
                <div className={cn(styles.arm, styles.aRight)}>
                    <div className={styles.sleeve}></div>
                    <div className={styles.mitten}></div>
                </div>

                {/* Head Group */}
                <div className={styles.headGroup}>
                    <div className={styles.faceBase}>
                        <div className={styles.beard}></div>
                        <div className={styles.face}>
                            {/* Features */}
                            <div className={styles.rosyCheek}></div>
                            <div className={styles.rosyCheekRight}></div>

                            <div className={cn(styles.eye, styles.eyeL)}>
                                <div className={styles.pupil}></div>
                                <div className={styles.eyelid}></div>
                            </div>
                            <div className={cn(styles.eye, styles.eyeR)}>
                                <div className={styles.pupil}></div>
                                <div className={styles.eyelid}></div>
                            </div>

                            <div className={styles.nose}></div>
                            <div className={styles.mustache}>
                                <div className={styles.stacheLeft}></div>
                                <div className={styles.stacheRight}></div>
                            </div>
                            <div className={styles.mouth}></div>
                        </div>
                    </div>

                    {/* Hat */}
                    <div className={styles.hatBase}>
                        <div className={styles.hatBand}></div>
                        <div className={styles.hatCone}></div>
                        <div className={styles.hatPom}></div>
                    </div>
                </div>

            </div>
        </div>
    );
}
