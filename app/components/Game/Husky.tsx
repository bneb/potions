
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './husky.module.css';

interface HuskyProps {
    className?: string;
}

export function Husky({ className }: HuskyProps) {
    return (
        <div className={cn(styles.huskyProxy, className)}>
            <div className={styles.huskyScene}>
                <div className={styles.husky}>
                    <div className={styles.tail}></div>

                    <div className={styles.body}></div>
                    <div className={styles.belly}></div>

                    <div className={styles.head}>
                        <div className={styles.earLeft}></div>
                        <div className={styles.earRight}></div>
                        <div className={styles.face}>
                            <div className={styles.maskLeft}></div>
                            <div className={styles.maskRight}></div>
                            <div className={styles.snout}>
                                <div className={styles.nose}></div>
                                <div className={styles.tongue}></div>
                            </div>
                            <div className={styles.eyeLeft}></div>
                            <div className={styles.eyeRight}></div>
                        </div>
                    </div>

                    <div className={cn(styles.leg, styles.lFrontLeft)}>
                        <div className={styles.paw}></div>
                    </div>
                    <div className={cn(styles.leg, styles.lFrontRight)}>
                        <div className={styles.paw}></div>
                    </div>
                    <div className={cn(styles.leg, styles.lBackLeft)}>
                        <div className={styles.paw}></div>
                    </div>
                    <div className={cn(styles.leg, styles.lBackRight)}>
                        <div className={styles.paw}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
