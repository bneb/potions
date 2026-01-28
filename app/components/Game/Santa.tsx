
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './santa.module.css';

interface SantaProps {
    className?: string;
}

export function Santa({ className }: SantaProps) {
    return (
        <div className={cn(styles.santaProxy, className)}>
            <div className={styles.santaScene}>
                <div className={styles.santa}>
                    <div className={styles.body}>
                        <div className={styles.buttons}></div>
                    </div>

                    <div className={styles.belt}>
                        <div className={styles.buckle}></div>
                    </div>

                    <div className={styles.head}>
                        <div className={styles.beard}></div>
                        <div className={styles.face}>
                            <div className={styles.eyeLeft}></div>
                            <div className={styles.eyeRight}></div>
                            <div className={styles.nose}></div>
                            <div className={styles.mustache}></div>
                        </div>
                        <div className={styles.hat}>
                            <div className={styles.pom}></div>
                        </div>
                    </div>

                    <div className={cn(styles.arm, styles.aLeft)}>
                        <div className={styles.mitten}></div>
                    </div>
                    <div className={cn(styles.arm, styles.aRight)}>
                        <div className={styles.mitten}></div>
                    </div>

                    <div className={cn(styles.leg, styles.lLeft)}>
                        <div className={styles.boot}></div>
                    </div>
                    <div className={cn(styles.leg, styles.lRight)}>
                        <div className={styles.boot}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
