
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './crocodile.module.css';

interface CrocodileProps {
    className?: string;
}

export function Crocodile({ className }: CrocodileProps) {
    return (
        <div className={cn(styles.crocodileProxy, className)}>
            <div className={styles.crocodileScene}>
                <div className={styles.crocodile}>
                    <div className={styles.tail}></div>

                    <div className={styles.body}>
                        <div className={styles.scutes}></div>
                    </div>

                    <div className={styles.head}>
                        <div className={styles.snoutLong}>
                            <div className={styles.tooth}></div>
                            <div className={styles.tooth}></div>
                            <div className={styles.tooth}></div>
                        </div>
                        <div className={styles.upperHead}>
                            <div className={styles.eyeLeft}></div>
                            <div className={styles.eyeRight}></div>
                        </div>
                    </div>

                    <div className={cn(styles.leg, styles.lFrontLeft)}></div>
                    <div className={cn(styles.leg, styles.lFrontRight)}></div>
                    <div className={cn(styles.leg, styles.lBackLeft)}></div>
                    <div className={cn(styles.leg, styles.lBackRight)}></div>
                </div>
            </div>
        </div>
    );
}
